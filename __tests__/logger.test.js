const Logger = require('../utils/logger');

describe('Logger', () => {
  let logger;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    logger = new Logger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance of Logger', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have the correct LOG_TYPES defined', () => {
      expect(logger.LOG_TYPES).toEqual({
        INFO: 'info',
        ERROR: 'error',
        WARN: 'warn',
      });
    });
  });

  describe('formatMessage', () => {
    it('should return an empty string for no arguments', () => {
      expect(logger.formatMessage()).toBe('');
    });

    it('should join multiple arguments with spaces', () => {
      expect(logger.formatMessage('Hello', 'world', 123)).toBe(
        'Hello world 123'
      );
    });

    it('should use util.format for strings with format specifiers', () => {
      expect(logger.formatMessage('User %s has ID %d', 'John', 42)).toBe(
        'User John has ID 42'
      );
    });

    it('should handle null and undefined correctly', () => {
      expect(logger.formatMessage('Value is', null, 'and', undefined)).toBe(
        'Value is null and undefined'
      );
    });

    it('should stringify objects using JSON.stringify', () => {
      const obj = { a: 1, b: 'test' };
      const expected = JSON.stringify(obj, null, 2);
      expect(logger.formatMessage(obj)).toBe(expected);
    });

    it('should format Error objects with stack trace', () => {
      const error = new Error('Test error');
      const result = logger.formatMessage(error);
      expect(result).toContain('Error: Test error');
      expect(result).toContain(error.stack);
    });
  });

  describe('createLogEntry', () => {
    it('should create a log entry object with the correct structure', () => {
      jest
        .spyOn(logger, 'getCallerLocation')
        .mockReturnValue('test.js:10:5 (anonymous)');
      jest.spyOn(logger, 'formatMessage').mockReturnValue('Test message');

      const logEntry = logger.createLogEntry('info', 'Test message');

      expect(logEntry).toHaveProperty('type', 'info');
      expect(logEntry).toHaveProperty('date');
      expect(logEntry).toHaveProperty(
        'callerLocation',
        'test.js:10:5 (anonymous)'
      );
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(typeof logEntry.date).toBe('string');
    });
  });

  describe('Logging Methods', () => {
    beforeEach(() => {
      jest
        .spyOn(logger, 'createLogEntry')
        .mockImplementation((type, ...args) => ({
          type,
          date: new Date().toISOString(),
          callerLocation: 'mocked.js:1:1 (mockedFunc)',
          message: args.join(' '),
        }));
    });

    it('info() should call createLogEntry with INFO type and log to console', () => {
      logger.info('This is an info message');
      expect(logger.createLogEntry).toHaveBeenCalledWith(
        'info',
        'This is an info message'
      );
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('error() should call createLogEntry with ERROR type and log to console.error', () => {
      logger.error('This is an error message');
      expect(logger.createLogEntry).toHaveBeenCalledWith(
        'error',
        'This is an error message'
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('warn() should call createLogEntry with WARN type and log to console.warn', () => {
      logger.warn('This is a warning message');
      expect(logger.createLogEntry).toHaveBeenCalledWith(
        'warn',
        'This is a warning message'
      );
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return the created log entry object', () => {
      const logEntry = logger.info('test');
      expect(logEntry).toBeDefined();
      expect(logEntry.type).toBe('info');
      expect(logEntry.message).toBe('test');
    });
  });
});
