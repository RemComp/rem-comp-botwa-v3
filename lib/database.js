console.log('+ Initializing Database MongoDB...');
const mongoose = require('mongoose');
mongoose.pluralize(null);
mongoose.connect(process.env.MONGO_URI)
mongoose.pluralize(null);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('+ Success connect Database Mongo ✓!');
})

// Bot
// {
//     iId: 'XXX',
//     isAdmin: false,
//     isPremium: false,
//     afk: {
//         isAfk: false,
//         time: 0
//         reason: 'XXX'
//     },
//     isBanned: false,
//     isSuperBanned: false,
//     listCmdBan: [],
//     timeBanned: 0,
//     isCvrtE: false,
//     isHidePP: false,
//     tictac: { poin: 0, win: 0, lose: 0, draw: 0, lastlead: null },
//     tc: {},
//     rl: {
//         name: 'XXX',
//         gender: 'XXX',
//         pd: { },
//         antispamAct: 0,
//         food: 99,
//         stamina: 99,
//         mantan: [],
//         rumah: { lahan: 99 }
//     },
//     nametag: {
//         select: 'XXX',
//         list: [],
//     },
//     economy: {
//         level: 999,
//         xp: 999,
//         money: 89,
//         moneyharam: 8908,
//         mining: {},
//         job: {  },
//         worklimit: 0, //ts
//     },
//     ig: 'XXX',
//     item: { dscinv: {}, level: { level: 0, time: 0 }, joinkey: 0, redeemed: [] },
//     limit: {
//         limit: 99,
//         lgivein: []
//     },
//     invest: {},
//     image: {
//         bg: 'XXX',
//         bgProfile: 'XXX'
//     },
//     setUser: {
//         customNoCmd: 'XXX',
//     }
//     accountList: {
//         isSelectedAccount: true,
//         select: 'XXX',
//         list: []
//     },
//     discordId: 'XXX'
//     email: 'XXX',
//     collectMessage: [],
//     ai: {
//         aiChatSession: String,
//         aiIdSet: String,
//     },
//    gameWeb: { highScoreCG: 0 },
//    rpg: {
//         hp: 100,
//         def: 0,
//         atk: 0,
//         economy: { level: 1, xp: 0, money: 0 }
//         inventory: [], // { id: 0, name: String, type: String, qty: 0, attr: {} }
//         world: 'Aincard',
//         floor: { select: 0, select_zone: 0, max: 0 },
//    }
// }
//create mongoose schema with the same structure as the object above
const userDataTypes = { iId: {
    type: String,
    unique: true,
    required: true,
}, uid: { type: Number, unique: true, immutable: true }, isAdmin: Boolean, isPremium: Boolean, afk: Object, isBanned: Boolean, bannedReason: String, isSuperBanned: mongoose.Schema.Types.Mixed, listCmdBan: Array, timeBanned: Number, senderBanned: String, isLegacyButton: Boolean, isCvrtE: Boolean, isHidePP: Boolean, tictac: Object, tc: Object, rl: Object, nametag: Object, "economy.level": Number, "economy.xp": Number, "economy.money": Number, "economy.moneyharam": Number, "economy.job": Object, "economy.worklimit": Number, economy: Object, lastAction: Object, ig: String, item: Object, limit: Object, invest: Object, image: Object, setUser: Object, accountList: Object, discordId: String, email: String, collectMessage: Array, ai: Object, gameWeb: Object, rpg: Object, antispam: Object }
const _mongo_UserSchema = mongoose.Schema(userDataTypes, { collection: 'user' });
// const _mongo_UserAccountSchema = mongoose.Schema(userDataTypes, { collection: 'user_account' });

// {
//     iId: 'XXX',
//     join: {},
//     prefix: '.',
//     muted: {
//         isMuted: false,
//         isMutedAdmin: false
//     },
//     isImageSafeSearch: false,
//     isSimsimi: false,
//     isNsfw: false,
//     isAntiBadword: false,
//     isAntiLink: false,
//     isJoinMsg: false,
//     isLeaveMsg: false,
//     isNoCmd: false,
//     rulesSet: 'XXX',
//     scInsert: 'XXX || undefined',
//     setGroup: {
//         lvlupdisable: false,
//         nocmd: false
//     },
//     game: {
//         mathgame: [],
//         quizgame: [],
//     },
//     giveaway: {}
// }
//create mongoose schema with the same structure as the object above
const _mongo_GroupSchema = mongoose.Schema({ iId: {
    type: String,
    unique: true,
    required: true,
}, join: Object, prefix: String, muted: Object, isSubsAnimeNews: Boolean, isImageSafeSearch: Boolean, isSimsimi: Boolean, isNsfw: Boolean, isAntiBadword: Boolean, isAntiLink: Boolean, isAntiHidetag: Boolean, isJoinMsg: Boolean, isLeaveMsg: Boolean, isNoCmd: Boolean, rulesSet: String, scInsert: String, setGroup: Object, game: Object, giveaway: Object, recentlyAddGroup: Array, ai: Object, metadata: Object }, { collection: 'group' });

const _mongo_InvestHistorySchema = mongoose.Schema({ coin: {
    type: String,
    required: true,
}, hash: {
    type: String,
    required: true,
}, from: {
    type: String,
    required: true,
}, to: {
    type: String,
    required: true,
}, date: {
    type: Date,
    required: true,
    default: Date.now()
}, type: {
    type: String,
    required: true,
    enum: ['buy', 'sell', 'transfer']
}, content: {
    type: Number,
    required: true,
}, price: {
    type: Number,
    required: true,
} }, { collection: 'invest_history' });

// {
//     iId: 'XXX',
//     dbcount: 0,
//     hits: {
//         today: 0,
//         total: 0
//     },
//     invest: [],
//     record: {},
//     msgDel: [],
//     contactName: [{ iId: 'XXX', name: 'XXX' }],
//     joincode: [],
//     setBot: {
//         cmd: [],
//         mention: false
//     },
//     statsUsage: { core: { cpu: [], ram: [], speed: [] }, jadibot1: { cpu: [], ram: [], speed: [] }, ... },
// }
//create mongoose schema with the same structure as the object above
const _mongo_BotSchema = mongoose.Schema({ iId: {
    type: String,
    unique: true,
    required: true,
}, dbcount: Number, hits: Object, invest: Array, record: Object, msgDel: Array, contactName: Array, joincode: Array, setBot: Object, listJoinGroup: Array, listRedeem: Array, seasonData: Object, register: Array, donate: Array, claimed: Array, data: Array }, { collection: 'bot' });

// {
//     cId: 'XXX',
//     content: [],
// }
const _mongo_CommandSchema = mongoose.Schema({ cId: {
    type: String,
    required: true,
}, content: Array, options: Object, invest: Object }, { collection: 'command' });

// {
//     iId: 'XXX',
//     name: 'XXX',
// }
const _mongo_ContactSchema = mongoose.Schema({ iId: {
    type: String,
    required: true,
}, name: String }, { collection: 'contact_name' });

// {
//     iId: 'XXX',
//     data: {},
// }
const _mongo_JadibotSchema = mongoose.Schema({ iId: {
    type: String,
    unique: true,
    required: true,
}, data: Object }, { collection: 'jadibot' });

/**
 * stateStatus Type:
 * 0 = offline
 * 1 = pairing
 * 2 = scan
 * 3 = connected
 */
/**
 * {
 *   apiKey: 'XXX',
 *   serverId: 'XXX',
 *   nameDevice: 'XXX',
 *   stateStatus: 0,
 *   reasonDisconnected: 'XXX',
 *   user: {
 *      jid: 'XXX',
 *      id: 'XXX',
 *      isConnected: true
 *   },
 *   scan: {
 *      type: qr/code,
 *      data: 'XXX'
 *   },
 *   settings: {
 *      pairMethod: 'XXX',
 *      numberHp: 'XXX'
 *   },
 *   sourceJadibotApiKey: 'XXX',
 *   ownerJadibotPhone: 'XXX',
 *   isBotUtama: false,
 * }
 */
const _mongo_JadibotDeviceSchema = mongoose.Schema({ apiKey: {
    type: String,
    unique: true,
    required: true,
}, serverId: String, nameDevice: String, stateStatus: Number, reasonDisconnected: String, user: Object, scan: Object, settings: Object, owner: String, sourceJadibotApiKey: String, ownerJadibotPhone: String, isBotUtama: Boolean }, { collection: 'jadibot_device' });

// {
//     code: 'XXX',
//     time: { date: 123, expired: 123 },
//     limit: 0,
//     claimed: 0,
//     claimedBy: [],
//     reward: [],
//     from: 'XXX',
// }
const _mongo_RedeemSchema = mongoose.Schema({ code: {
    type: String,
    required: true,
}, time: Object, limit: Number, claimed: Number, claimedBy: Array, reward: Array, from: String }, { collection: 'redeem_db' });

// {
//     iId: 'XXX',
//     contact: 300000000,
// }
const _mongo_CounterSchema = mongoose.Schema({ iId: {
    type: String,
    required: true
}, count: Number }, { collection: 'counter' });

const _mongo_CommandMessageSchema = mongoose.Schema({ iId: {
    type: String,
    required: true,
}, iIdM: {
    type: String,
    unique: true,
    required: true,
}, time: {
    type: Number,
    required: true,
}, cmd: String, type: String, body: String, isVirtualBot: Boolean, virtualBotId: String, botNumber: String, isGroup: Boolean, metaGroup: Object, meta: Object, isQ: Boolean, Q: Object, isErr: Boolean, err: Array, status: String }, { collection: 'command_message' });

const userSchema = mongoose.model('user', _mongo_UserSchema, 'user')
const groupSchema = mongoose.model('group', _mongo_GroupSchema, 'group')
const botSchema = mongoose.model('bot', _mongo_BotSchema, 'bot')
const commandSchema = mongoose.model('command', _mongo_CommandSchema, 'command')
const contactSchema = mongoose.model('contact_name', _mongo_ContactSchema, 'contact_name')
const jadibotSchema = mongoose.model('jadibot', _mongo_JadibotSchema, 'jadibot')
const jadibotDeviceSchema = mongoose.model('jadibot_device', _mongo_JadibotDeviceSchema, 'jadibot_device')
const redeemSchema = mongoose.model('redeem_db', _mongo_RedeemSchema, 'redeem_db')
const counterSchema = mongoose.model('counter', _mongo_CounterSchema, 'counter')
const commandMessageSchema = mongoose.model('command_message', _mongo_CommandMessageSchema, 'command_message')
const investHistorySchema = mongoose.model('invest_history', _mongo_InvestHistorySchema, 'invest_history')

async function getNextSequenceValue(sequenceName){
    const sequenceDocument = await _mongo_CounterSchema.findOneAndUpdate({ iId: sequenceName }, { $inc: { count: 1 } }, { new: true });
    return sequenceDocument.count;
}
async function initUserDb(iId) {
    const uid = await getNextSequenceValue('user_id')
    const _obj = {
        iId,
        uid,
        isAdmin: false,
        isPremium: false,
        afk: {
            isAfk: false,
            time: 0,
            reason: ''
        },
        isBanned: false,
        bannedReason: '',
        isSuperBanned: false,
        timeBanned: 0,
        isCvrtE: false,
        isHidePP: false,
        tictac: { poin: 0, win: 0, lose: 0, draw: 0, lastlead: null },
        tc: {},
        rl: {
            name: '',
            gender: '',
            antispamAct: 0,
            food: 100,
            stamina: 100,
            mantan: [],
            rumah: {}
        },
        nametag: {
            select: '',
            list: ["🌴 Member 🌴"],
        },
        economy: {
            level: 1,
            xp: 0,
            money: 2000,
            moneyharam: 0,
            mining: {},
            job: { job: "Pengangguran", lvljob: 1, xpjob: 0, multi: 1},
            worklimit: 0
        },
        lastAction: { rl: Date.now(), pd: Date.now() },
        ig: '',
        item: { dscinv: {}, level: { level: 0, time: 0 }, joinkey: 0, redeemed: [] },
        limit: {
            limit: 25,
            lgivein: [],
            lpaym: []
        },
        invest: {},
        image: {
            bg: './media/img/bg.png',
            bgProfile: './media/img/bgProfile.png'
        }
    }
    await userSchema.create(_obj)
    return _obj;
}
async function initGroupDb(iId, metadata) {
    const _obj = {
        iId,
        join: {},
        prefix: '.',
        muted: {
            isMuted: false,
            isMutedAdmin: false
        },
        isImageSafeSearch: false,
        isSimsimi: false,
        isNsfw: false,
        isAntiNsfw: false,
        isAntiBadword: false,
        isAntiLink: false,
        isJoinMsg: false,
        isLeaveMsg: false,
        isNoCmd: false,
        rulesSet: '',
        scInsert: '',
        setGroup: {
            lvlupdisable: false,
            nocmd: false
        },
        game: {
            mathgame: [],
            quizgame: [],
        },
        giveaway: [],
        metadata: metadata || {},
    }
    await groupSchema.create(_obj)
    return _obj;
}

module.exports = {
    _mongo_GroupSchema: groupSchema,
    _mongo_UserSchema: userSchema,
    // _mongo_RawUserSchema: isVirtualAccount ? mongoose.model('user', _mongo_UserSchema, 'user') :_mongo_UserSchemaExport,
    // _mongo_UserSchema: _mongo_UserSchemaExport,
    // _mongo_UserAccountSchema: isVirtualAccount ? _mongo_UserSchemaExport : mongoose.model('user_account', _mongo_UserSchema, 'user_account'),
    _mongo_BotSchema: botSchema,
    _mongo_CommandSchema: commandSchema,
    _mongo_ContactSchema: contactSchema,
    _mongo_JadibotSchema: jadibotSchema,
    _mongo_JadibotDeviceSchema: jadibotDeviceSchema,
    _mongo_RedeemSchema: redeemSchema,
    _mongo_CounterSchema: counterSchema,
    _mongo_CommandMessageSchema: commandMessageSchema,
    _mongo_InvestHistorySchema: investHistorySchema,
    initGroupDb,
    initUserDb
}