jest.mock('axios');
jest.mock('../lib/database', () => ({
  _mongo_UserSchema: {
    updateOne: jest.fn(),
  },
}));
jest.mock('../lib/constants', () => ({
  ownerNumber: ['owner1@s.whatsapp.net'],
  ownerNumber2: ['owner2@s.whatsapp.net'],
  sideOwnerNumber: ['sideowner@s.whatsapp.net'],
}));

const axios = require('axios');
const { _mongo_UserSchema } = require('../lib/database');
const utils = require('../utils/utils');

describe('utils.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isBase64', () => {
    it('should return true for valid base64 strings', () => {
      expect(utils.isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(utils.isBase64('Zm9vYg==')).toBe(true);
    });
    it('should return false for invalid base64 strings', () => {
      expect(utils.isBase64('not base64')).toBe(false);
    });
  });

  describe('buildBase64Data', () => {
    it('should construct a valid base64 data URI', () => {
      const buffer = Buffer.from('Hello');
      const mime = 'text/plain';
      expect(utils.buildBase64Data(mime, buffer)).toBe(
        'data:text/plain;base64,SGVsbG8='
      );
    });
  });

  describe('requestToGolangEngine', () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      global.golangEngine = {
        engineUrl: 'http://localhost:8080',
        golangKey: 'test-key',
      };
      global.log = { error: jest.fn(), warn: jest.fn() };
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should make a successful POST request', async () => {
      const mockResponse = { success: true };
      axios.post.mockResolvedValue({ data: mockResponse });
      const response = await utils.requestToGolangEngine('/test', {
        foo: 'bar',
      });
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/test',
        expect.any(Object),
        expect.any(Object)
      );
      expect(response).toEqual(mockResponse);
    });

    it('should return an error if engineUrl is not set', async () => {
      delete global.golangEngine.engineUrl;
      const result = await utils.requestToGolangEngine('/test', {});
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('whatsmeowerr_engine_not_ready');
    });

    it('should handle network errors from axios', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'));
      const result = await utils.requestToGolangEngine('/fail', {});
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Network Error');
      expect(global.log.warn).toHaveBeenCalled();
    });
  });

  describe('sleep', () => {
    it('should resolve after the specified duration', async () => {
      jest.useFakeTimers();
      const sleepPromise = utils.sleep(1000);
      jest.runAllTimers();
      await expect(sleepPromise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });

  describe('transformKeysFromCapitalizeToStandartObject', () => {
    it('should uncapitalize keys in a simple object', () => {
      const input = { FirstName: 'John', LastName: 'Doe' };
      const expected = { firstName: 'John', lastName: 'Doe' };
      expect(utils.transformKeysFromCapitalizeToStandartObject(input)).toEqual(
        expected
      );
    });

    it('should handle nested objects and arrays', () => {
      const input = {
        UserData: { FullName: 'Jane Doe' },
        Roles: [{ RoleName: 'Admin' }],
      };
      const expected = {
        userData: { fullName: 'Jane Doe' },
        roles: [{ roleName: 'Admin' }],
      };
      expect(utils.transformKeysFromCapitalizeToStandartObject(input)).toEqual(
        expected
      );
    });
  });

  describe('timeConvert', () => {
    it('should correctly convert milliseconds to days, hours, minutes, seconds', () => {
      const now = Date.now();
      const future = now + 1000 * 60 * 60 * 25 + 1000 * 60 * 30;
      const result = utils.timeConvert(future, now);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(1);
      expect(result.minute).toBe(30);
    });
  });

  describe('numberWithCommas', () => {
    it('should format numbers with dots as thousand separators', () => {
      expect(utils.numberWithCommas(1000)).toBe('1.000');
      expect(utils.numberWithCommas(1234567)).toBe('1.234.567');
    });

    it('should return number as string if global flag is set', () => {
      global.isFalseCommas = ['someContext'];
      global.senderFunction = 'someContext';
      expect(utils.numberWithCommas(50000)).toBe('50000');
      delete global.isFalseCommas;
      delete global.senderFunction;
    });
  });

  describe('fixNumberE', () => {
    it('should convert scientific notation to a full string', () => {
      const largeNumber = 1e21;
      const expectedString = '1000000000000000000000';
      expect(utils.fixNumberE(largeNumber).replace(/,/g, '')).toBe(
        expectedString
      );
    });

    it('should handle small numbers in scientific notation (e-)', () => {
      expect(utils.fixNumberE(1.23e-5)).toBe('0.0000123');
    });
  });

  describe('showElapsedTime', () => {
    it('should show elapsed time in correct units', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      expect(utils.showElapsedTime(now - 5000)).toBe('5 Detik');
      expect(utils.showElapsedTime(now - 120000)).toBe('2 Menit');
      expect(utils.showElapsedTime(now - 7200000)).toBe('2 Jam');
    });

    it('should show elapsed time for days, months, and years', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const threeDays = 1000 * 60 * 60 * 24 * 3;
      const twoMonths = 1000 * 60 * 60 * 24 * 30 * 2;
      const fourYears = 1000 * 60 * 60 * 24 * 30 * 12 * 4;
      expect(utils.showElapsedTime(now - threeDays)).toBe('3 Hari');
      expect(utils.showElapsedTime(now - twoMonths)).toBe('2 Bulan');
      expect(utils.showElapsedTime(now - fourYears)).toBe('4 Tahun');
    });
  });

  describe('formatRequiredDataClient', () => {
    const mockRem = { user: { jid: 'bot@s.whatsapp.net' } };
    const mockUserDb = { isPremium: false, isAdmin: false, rl: {} };
    const mockGroupDb = {
      prefix: '#',
      metadata: {
        participants: [
          { id: 'admin@s.whatsapp.net', admin: 'superadmin' },
          { id: 'user@s.whatsapp.net', admin: null },
          { id: 'bot@s.whatsapp.net', admin: 'admin' },
        ],
      },
    };

    it('should parse command from message body in private chat', () => {
      const mockMessage = {
        sender: 'user@s.whatsapp.net',
        isGroupMsg: false,
        body: '.ping test',
      };
      const result = utils.formatRequiredDataClient(
        mockRem,
        mockUserDb,
        null,
        mockMessage
      );
      expect(result.isCmd).toBe(true);
      expect(result.command).toBe('ping');
      expect(result.prefix).toBe('.');
      expect(result.args).toEqual(['.ping', 'test']);
    });

    it('should identify owner and admin status', () => {
      const mockMessage = {
        sender: 'owner1@s.whatsapp.net',
        isGroupMsg: false,
        body: '.test',
      };
      const result = utils.formatRequiredDataClient(
        mockRem,
        mockUserDb,
        null,
        mockMessage
      );
      expect(result.isSuperOwner).toBe(true);
      expect(result.isAdmin).toBe(true);
    });

    it('should parse command from a button click in a group', () => {
      const mockMessage = {
        sender: 'user@s.whatsapp.net',
        isGroupMsg: true,
        body: 'some other text',
        selectedButtonId: '#menu utama',
      };
      const result = utils.formatRequiredDataClient(
        mockRem,
        mockUserDb,
        mockGroupDb,
        mockMessage
      );
      expect(result.prefix).toBe('#');
      expect(result.command).toBe('menu');
      expect(result.allArgs).toEqual(['#menu', 'utama']);
    });

    it('should correctly identify group admin status', () => {
      const mockMessage = {
        sender: 'admin@s.whatsapp.net',
        isGroupMsg: true,
        body: '#status',
      };
      const result = utils.formatRequiredDataClient(
        mockRem,
        mockUserDb,
        mockGroupDb,
        mockMessage
      );
      expect(result.isGroupAdmins).toBe(true);
      expect(result.isBotGroupAdmins).toBe(true);
    });

    it('should handle non-admin user in a group', () => {
      const mockMessage = {
        sender: 'user@s.whatsapp.net',
        isGroupMsg: true,
        body: '#help',
      };
      const result = utils.formatRequiredDataClient(
        mockRem,
        mockUserDb,
        mockGroupDb,
        mockMessage
      );
      expect(result.isGroupAdmins).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of the specified length', () => {
      expect(utils.generateRandomString(10).length).toBe(10);
      expect(typeof utils.generateRandomString(10)).toBe('string');
    });
  });

  describe('addCollectorMessage', () => {
    it('should call UserSchema.updateOne with correct parameters', async () => {
      const collectorData = {
        id: 'msg1',
        from: 'chat1',
        timeout: 60000,
        isReply: true,
        messageReply: {},
      };

      await utils.addCollectorMessage(
        'user1',
        collectorData.from,
        collectorData.id,
        collectorData.timeout,
        collectorData.isReply,
        collectorData.messageReply
      );

      expect(_mongo_UserSchema.updateOne).toHaveBeenCalledWith(
        { iId: 'user1' },
        { $push: { collectMessage: collectorData } }
      );
    });
  });
});
