const priority = 0
const isAwait = true

const toMs = require('ms')
const { _mongo_UserSchema, _mongo_CommandMessageSchema, _mongo_BotSchema } = require('../lib/database')
const { timeConvert, numberWithCommas, fixNumberE, showElapsedTime } = require('../utils/utils')

const { getLevelingLevel, getLevelingXp, addLevelingXp, addLevelingLevel } = require('../command/level/functions')
const { getUserItemId, getItemLevel } = require('../command/item/functions')
const { getNama } = require('../command/profile/functions')
const { addUserRoleplayLevel_pasangan } = require('../command/pd/functions')
const { getUserJobId, getLvlJob, getXpJob, addJobLvl, addJobMulti, getUserJob } = require('../command/job/functions')

async function messageHandler (rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { 
        args, isCmd, prefix,
        isGroupAdmins, isBotGroupAdmins, isPrem, isSuperOwner, isOwner, isSideOwner, isAdmin, isMod, isBanned, isSuperBanned
    } = clientData
    let isUserDbChanged = false

    // double bot check
    pushedCmdDb = { iId: message.sender, iIdM: message.id, time: Date.now(), cmd: args[0].replace(prefix, ''), type: message.type, body: args.join(' '), isVirtualBot: true, virtualBotId: rem.apiKey, botNumber: rem.user.jid || rem.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net', isGroup: message.isGroupMsg, meta: { isGroupAdmins, isBotGroupAdmins, isBanned, listCmdBan: _userDb?.listCmdBan || [], isSuperBanned, isBlocked: false, isSpamLevel: (_userDb?.antispam?.count >= 30), isSpamCmd: (_userDb?.antispam?.countcmd >= 15), isAfkOn: _userDb?.afk?.isAfk || false, isHideppOn: _userDb?.isHidePP, isPrem, isHavePd: _userDb.pd ? true : false, isAdmin, isMod, isSideOwner, isOwner, isUpOwner: isSuperOwner }, isQ: message.quotedMsg ? true : false, Q: {}, isErr: false, err: [], status: 'active' }
    try {
        if(isCmd) await _mongo_CommandMessageSchema.create(pushedCmdDb)
    } catch {
        return 'break'
    }

    // check db timer update
    const resultDbTimerUpdate = await dbTimerUpdate(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)
    if(resultDbTimerUpdate === 'break') return 'break'
    if(resultDbTimerUpdate?._userDb) {
        _userDb = resultDbTimerUpdate._userDb
        isUserDbChanged = true
    }

    // antispam check
    const resultAntispam = await checkAntiSpam(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)
    if(resultAntispam === 'break') return 'break'
    if(resultAntispam?._userDb) {
        _userDb = resultAntispam._userDb
        isUserDbChanged = true
    }

    // level handler
    await levelHandler(rem, message, _userDb, _groupDb, clientData)

    // pd level handler
    if(_userDb?.rl?.pd)  await pdLevelHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)

    // job level handler
    if(message.isGroupMsg && _userDb?.economy?.job) {
        await jobLevelHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)
    }

    // afk handler
    await afkHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)

    if(isCmd) {
        await _mongo_BotSchema.updateOne({ iId: 'CORE' }, { $inc: { "hits.today": 1, "hits.total": 1 } })
    }

    if(isUserDbChanged) return { _userDb }
}

async function checkAntiSpam(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { isBanned, isSuperBanned, isOwner, isCmd, allArgs, prefix } = clientData
    const { from, sender } = message

    if(!_userDb?.antispam) {
        await _mongo_UserSchema.updateOne(
            { id: sender },
            { $set: { antispam: { count: 0, countcmd: 0 } } }
        )
        _userDb.antispam = { count: 0, countcmd: 0, timeInit: Date.now() }
    }

    // if timeInit is more than 1 minute ago, reset count
    if((Date.now() - _userDb.antispam.timeInit) > (60 * 1000)) {
        _userDb.antispam.count = 0
        _userDb.antispam.countcmd = 0
        _userDb.antispam.timeInit = Date.now()
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { antispam: _userDb.antispam } })
    }

    if((_userDb?.antispam?.count >= 30) && !isBanned && !isSuperBanned && !isCmd && isNaN(message.body)) { // spam message
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { isBanned: true, timeBanned: Date.now() + toMs('4h'), bannedReason: 'Spam Pesan/Level' } })
        rem.reply(from, 'Kamu terdeteksi spam!\n*Ban : 4jam*')
        return 'break'
    } else if((_userDb?.antispam?.countcmd >= 15) && !isBanned && !isSuperBanned && isCmd) { // spam command
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { isBanned: true, timeBanned: Date.now() + toMs('4h'), bannedReason: 'Spam Command/Level' } })
        rem.reply(from, 'Kamu terdeteksi spam command!\n*Ban : 4jam*')
        return 'break'
    }

    if(!isOwner && isCmd && (isBanned || isSuperBanned) && _userDb.bannedReason != '' && _userDb.bannedReason != undefined && _userDb.bannedReason != 'No Reason') {
        const timeConvertBanned = timeConvert(_userDb.timeBanned)
        rem.reply(from, `Kamu terbanned!\n*Reason : ${_userDb.bannedReason}*\n*Time : ${_userDb.timeBanned == 0 ? 'Selamanya' : `${timeConvertBanned.day} Hari | ${timeConvertBanned.hour} Jam : ${timeConvertBanned.minute} Menit : ${timeConvertBanned.second} Detik`}*\n\n*_Jika kamu merasa ini salah, silahkan hubungi admin bot._*`)
        return 'break'
    }

    if(!isOwner && isCmd && isListCmdBan && _userDb.listCmdBan.includes(allArgs[0].toLowerCase().replace(prefix, ''))) {
        const timeConvertBanCmd = timeConvert(_userDb.timeBanned)
        rem.reply(from, `*Kamu terbanned untuk menggunakan command _${allArgs[0].toLowerCase()}_*\n*Reason : ${_userDb.bannedReason}*\n*Time : ${_userDb.timeBanned == 0 ? 'Selamanya' : `${timeConvertBanCmd.day} Hari | ${timeConvertBanCmd.hour} Jam : ${timeConvertBanCmd.minute} Menit : ${timeConvertBanCmd.second} Detik`}*\n\n*_Jika kamu merasa ini salah, silahkan hubungi admin bot._*`)
        return 'break'
    }

    if(isCmd) {
        _userDb.antispam.countcmd += 1
        await _mongo_UserSchema.updateOne({ iId: sender }, { $inc: { "antispam.countcmd": 1 } })
    } else {
        _userDb.antispam.count += 1
        await _mongo_UserSchema.updateOne({ iId: sender }, { $inc: { "antispam.count": 1 } })
    }
    return { _userDb }
}

async function levelHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { from, sender, pushname } = message

    const currentLevel = getLevelingLevel(_userDb)
    let amountXpNambah = 0
    let amountXpss = 0

    try {
        if(currentLevel < 5) {
            amountXpNambah = 300
        } else if(currentLevel > 10) {
            amountXpNambah = 2300
        } else if(currentLevel > 7) {
            amountXpNambah = 1500
        } else if(currentLevel > 4) {
            amountXpNambah = 1000
        } else {
            amountXpNambah = 500
        }
        if (getUserItemId(_userDb) == undefined) {
            amountXpss = Math.floor(amountXpNambah)
        } else {
            let addKaliLevelMultiplier = getItemLevel(_userDb).level
            if(Number(addKaliLevelMultiplier) <= 0) addKaliLevelMultiplier = 1
            amountXpss = Math.floor(amountXpNambah * addKaliLevelMultiplier)
        }
        
        const requiredXp = 2000 * (Math.pow(2, currentLevel) - 1)
        const getLevel = currentLevel
        addLevelingXp(sender, amountXpss)

        if (requiredXp <= getLevelingXp(_userDb)) {

            let currentLevel2 = currentLevel
            const currentXp2 = getLevelingXp(_userDb) + amountXpss
            let xpLevelUpLooping = 1
            let xpLevelUpResult = 0
            for(let i = 0; i < xpLevelUpLooping; i++) {
                const requiredXp2 = 2000 * (Math.pow(2, currentLevel2) - 1)
                // if required max infinity break
                if(requiredXp2 >= Infinity) break
                if(requiredXp2 <= currentXp2) {
                    currentLevel2 += 1
                    xpLevelUpLooping += 1
                    xpLevelUpResult += 1
                }
            }

            addLevelingLevel(sender, xpLevelUpResult)
            if(!_groupDb?.setGroup?.lvlupdisable) {
                rem.reply(from, `*「 LEVEL UP 」*\n\n➤ *Name*: ${pushname}\n➤ *XP*: ${numberWithCommas(fixNumberE(getLevelingXp(_userDb) + xpLevelUpResult))}\n➤ *Level*: ${getLevel} -> ${currentLevel2}\n\nOmedatou!! ヾ(≧▽≦*)o`)
            }
        }
    } catch (err) {
        global.log.error(`Error in levelHandler:`, err)
    }
}

async function pdLevelHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const currentPdXp = _userDb?.rl?.pd?.xp
    const currentPdLevel = _userDb?.rl?.pd?.level
    const requiredPdXp = 2000 * (Math.pow(2, currentPdLevel) - 1)
    try {
        if(requiredPdXp <= currentPdXp) {
            await addUserRoleplayLevel_pasangan(sender, 1)
        }
    } catch (err) {
        global.log.error(`Error in pdLevelHandler:`, err)
    }
}

async function jobLevelHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { from, sender, pushname } = message

    if(getUserJobId(_userDb) == undefined) await setUserJob(sender)
    let currentJobLvl = getLvlJob(_userDb)
    const requiredJobXp = 1000 * (Math.pow(2, currentJobLvl) - 1)
    const currentJobXp = getXpJob(_userDb)
    try {
        if (requiredJobXp <= currentJobXp) {
            let xpJobLevelUpLooping = 1
            let xpJobLevelUpResult = 0
            for(let i = 0; i < xpJobLevelUpLooping; i++) {
                const requiredJobXp2 = 1000 * (Math.pow(2, currentJobLvl) - 1)
                if (requiredJobXp2 <= currentJobXp) {
                    currentJobLvl += 1
                    xpJobLevelUpLooping += 1
                    xpJobLevelUpResult += 1
                }
            }

            await addJobLvl(sender, xpJobLevelUpResult)
            await addJobMulti(sender, xpJobLevelUpResult)

            const getLevelJob = getLvlJob(_userDb)

            const userJob = getUserJob(_userDb)
            let kerja = ''
            if(userJob == 'miner') {
                kerja = 'Miner/Penambang'
            } else if(userJob == 'lj') {
                kerja = 'Lumberjack/Penebang Pohon'
            } else if(userJob == 'gojek') {
                kerja = 'Gojek'
            } else if(userJob == 'tsampah') {
                kerja = 'Tukang Sampah'
            } else if(userJob == 'polisi')  {
                kerja = 'Polisi'
            } else if(userJob == 'bo') {
                kerja = 'Prostitusi Online :V'
            } else if(userJob == 'Kantoran') {
                kerja = 'Kantoran'
            }
            rem.reply(from, `*「 JOB LVL UP 」*\n\n➤ *Name*: ${pushname}\n➤ *XP*: ${getXpJob(_userDb)}\n➤ *Level*: ${getLevelJob} -> ${Number(getLvlJob(_userDb)) + xpJobLevelUpResult}\n➤ *JOB*: ${kerja}\n\nOmedatou!! 🎉🎉`)
        }
    } catch (err) {
        console.error(err)
    }
}

async function afkHandler(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { from, sender, pushname } = message
    const { isCmd } = clientData
    if (message.isGroupMsg && message.mentionedJidList?.length != 0) {
        if (_mentionUserDb?.afk?.isAfk) {
            const getReason = _mentionUserDb?.afk?.reason
            const getTime = showElapsedTime(_mentionUserDb?.afk?.time)
            let nameRequestedAfk = getNama(_mentionUserDb)
            if(nameRequestedAfk == undefined) {
                const contactDbAfk = await _mongo_ContactSchema.findOne({ iId: _mentionUserDb.iId })
                nameRequestedAfk = rem.contacts(_mentionUserDb.iId, contactDbAfk)
            }
            rem.sendText(from, `*「 AFK 」*\n\n${nameRequestedAfk}, Orangnya lagi afk!\n➤ *Alasan*: ${getReason}\n➤ *Sejak*: ${getTime}`)
        }
    } else if (!isCmd) {
        const checking = _userDb?.afk?.isAfk
        if (checking) {
            const getReason = _userDb?.afk?.reason
            const getTime = showElapsedTime(_userDb?.afk?.time)
            await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { afk: { isAfk: false, reason: '', time: 0 } } })
            rem.sendText(from, `*${pushname}* telah kembali dari AFK!\n➤ *Alasan*: ${getReason}\nWaktu Afk: ${getTime}`)
        }
    }
}

async function dbTimerUpdate(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { from, sender } = message
    
    let isChangedData = false
    if(_userDb?.timeBanned != 0 && Date.now() >= _userDb?.timeBanned) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { isBanned: false, listCmdBan: [], timeBanned: 0, bannedReason: '' } })
        _userDb.isBanned = false
        _userDb.listCmdBan = []
        _userDb.timeBanned = 0
        _userDb.bannedReason = ''
        isChangedData = true
    }

    if(_userDb.rl?.pd?.mal_id != undefined && _userDb.rl?.pd?.hubungan <= 5 && !_userDb.rl?.pd?.status?.startsWith('Putus')) {
        const textPdPutus_pacar = ["Pacar kamu selingkuh dengan orang lain karena kamu tidak memperhatikannya", "Pacar kamu telah memilih orang lain karena kamu tidak pernah memperhatikannya", "Pacarnmu sudah tidak sudi lagi denganmu karena kamu tidak memperhatikannya", `Jangankan cinta real life, disini bisa selingkuh andai kata _"Suatu cinta akan berbeda ketika salah satu dari mereka tidak pernah memperhatikan pasangannya"_ *_~SideOwn_*`, "Kamu telah ditinggal pacarmu selingkuh karena kamu tidak pernah peduli dengan-nya", `_"Cinta tidak akan datang ke 2 kalinya"_, sama halnya dengan pasangan mu disini yang meninggalkan dirimu hanya demi orang lain karena kamu tidak pernah peduli dengan dia.`, "Kamu telah ditinggal pergi oleh pacarmu dengan alasan kamu tidak pernah perduli dengan dia dan dia pun memilih orang lain", `_"Pernah singgah namun tidak di anggap"_, itulah yang dirasakan oleh pacarmu sehingga meninggalkan dirimu dan pergi berselingkuh dengan orang lain.`]
        const randomTextPdPutus_pacar = textPdPutus_pacar[Math.floor(Math.random() * textPdPutus_pacar.length)]

        const textPdPutus_pasangan = ["Pasangan kamu telah selingkuh dengan orang lain karena kamu tidak memperhatikannya", "Pasangan kamu telah memilih orang lain karena kamu tidak pernah memperhatikannya", "Pasanganmu sudah tidak sudi lagi denganmu karena kamu tidak memperhatikannya", `Jangankan cinta real life, disini bisa selingkuh andai kata _"Suatu cinta akan berbeda ketika salah satu dari mereka tidak pernah memperhatikan pasangannya"_ *_~SideOwn_*`, "Kamu telah ditinggal pasangamu selingkuh karena kamu tidak pernah peduli dengan-nya", `_"Cinta tidak akan datang ke 2 kalinya"_, sama halnya dengan pasangan mu disini yang meninggalkan dirimu hanya demi orang lain karena kamu tidak pernah peduli dengan dia.`, "Kamu telah ditinggal pergi oleh pasanganmu dengan alasan kamu tidak pernah perduli dengan dia dan dia pun memilih orang lain", `_"Pernah singgah namun tidak di anggap"_, itulah yang dirasakan oleh pasanganmu sehingga meninggalkan dirimu dan pergi berselingkuh dengan orang lain.`]
        const randomTextPdPutus_pasangan = textPdPutus_pasangan[Math.floor(Math.random() * textPdPutus_pasangan.length)]
        if (_userDb?.rl?.pd?.status == 'Pacaran') {
            await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "rl.pd.status": `Putus.${randomTextPdPutus_pacar}` } })
        } else if (_userDb?.rl?.pd?.status == 'Menikah' || _userDb?.rl?.pd?.status?.startsWith('Berkeluarga')) {
            await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "rl.pd.status": `Putus.${randomTextPdPutus_pasangan}` } })
        } else {
            await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "rl.pd.status": `Putus.${randomTextPdPutus_pasangan}` } })
        }
        _userDb.rl.pd.status = `Putus.${randomTextPdPutus_pasangan}`
        isChangedData = true
    }

    if(((_userDb.item?.dscinv?.time != undefined && _userDb.item?.dscinv?.time != 0) && Date.now() >= _userDb.item?.dscinv?.time)) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "item.dscinv": {} } })
        _userDb.item.dscinv = {}
        isChangedData = true
    }

    if(_userDb.item?.level?.time != 0 && Date.now() >= _userDb.item?.level?.time) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "item.level": { level: 0, time: 0 } } })
        _userDb.item.level = { level: 0, time: 0 }
        isChangedData = true
    }

    if(_userDb.item?.spy?.time != 0 && Date.now() >= _userDb.item?.spy?.time) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "item.spy": { time: 0 } } })
        _userDb.item.spy = { time: 0 }
        isChangedData = true
    }

    if(_userDb?.item?.item?.[0] != undefined) {
        _userDb?.item?.item.forEach(async (item, index) => {
            const keys = Object.keys(item)[0]
            if(item?.[keys]?.time != undefined && Date.now() >= item?.[keys]?.time) {
                await _mongo_UserSchema.updateOne({ iId: sender }, { $pull: { "item.item": { [keys]: item[keys] } } })
                _userDb.item.item.splice(index, 1)
                isChangedData = true
            }
        })
    }

    if(_userDb.item?.jobBoost?.time != 0 && Date.now() >= _userDb.item?.jobBoost?.time) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "item.jobBoost": { xp: 0, time: 0 } } })
        _userDb.item.jobBoost = { xp: 0, time: 0 }
        isChangedData = true
    }

    if(!_userDb.rl?.afinitas) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { 
            "rl.afinitas": {
                lover: null,
                saudara: { list: [] },
                sahabat: { list: [] }, 
                kepercayaan: { list: [] },
                requests: [],
                requestsLogs: []
            }
        }})
        _userDb.rl.afinitas = {
            lover: null,
            saudara: { list: [] },
            sahabat: { list: [] },
            kepercayaan: { list: [] },
            requests: [],
            requestsLogs: []
        }
        isChangedData = true
    }

    if(Date.now() >= _userDb.economy?.worklimit) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "economy.worklimit": 0 } })
        _userDb.economy.worklimit = 0
        isChangedData = true
    }

    if(_userDb.limit?.ltagall == undefined) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "limit.ltagall": 0 } })
        _userDb.limit.ltagall = 0
        isChangedData = true
    }

    if((_userDb.limit?.invest?.time_limit_reset != 0) && (Date.now() >= _userDb.limit?.invest?.time_limit_reset)) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "limit.invest": { time_limit_reset: 0 } } })
        _userDb.limit.invest = { time_limit_reset: 0 }
        isChangedData = true
    }

    if(_userDb.collectMessage != undefined && _userDb.collectMessage.length > 0) {
        const isExistCMessage = _userDb.collectMessage.find(all => all.from == from)
        if(isExistCMessage != undefined) {
            await _mongo_UserSchema.updateOne({ iId: sender }, { $pull: { "collectMessage": { id: isExistCMessage.id, from: isExistCMessage.from } } })
            _userDb.collectMessage = _userDb.collectMessage.filter(all => all.from != from || all.id != isExistCMessage.id)
            isChangedData = true

            if(Date.now() >= isExistCMessage.timeout) {
                const textSend = `Waktu untuk membalas pesan telah habis, silahkan ulangi kembali`
                isExistCMessage.isReply ? await rem.sendText(from, { text: textSend }, { quoted: JSON.parse(isExistCMessage.messageReply) }) : await rem.sendText(from, textSend)
                return 'break'
            }
            message.selectedButtonId = isExistCMessage.id
            message.collectMessage = message.body
        }
    }

    // pd
    if(_userDb?.lastAction == undefined || ((_userDb?.lastAction?.rl || 0) <= 0) || ((_userDb?.lastAction?.pd || 0) <= 0) || ((_userDb?.lastAction?.mood || 0) <= 0)) {
        await _mongo_UserSchema.updateOne({ iId: sender }, { $set: { "lastAction": { rl: Date.now(), pd: Date.now(), mood: Date.now() } } })
        _userDb.lastAction = { rl: Date.now(), pd: Date.now(), mood: Date.now() }
        isChangedData = true
    }
    const lastActionRpTime = _userDb?.lastAction?.rl
    const lastActionRpTime_minute = Math.floor((Date.now() - lastActionRpTime) / 60000)
    let dbChangePayload = { $set: {}, $inc: {} }
    if(lastActionRpTime_minute >= 1) {
        dbChangePayload.$set["lastAction.rl"] = Date.now()
        _userDb.lastAction.rl = Date.now()
        isChangedData = true

        if(_userDb?.rl?.food >= 1) {
            let calculateFoodNgurang = Math.floor(_userDb.rl.food - lastActionRpTime_minute)
            if(calculateFoodNgurang <= 0) calculateFoodNgurang = 0

            dbChangePayload.$set["rl.food"] = calculateFoodNgurang
            _userDb.rl.food = calculateFoodNgurang
        }
        
        if(_userDb?.rl?.stamina <= 200) {
            let staminaRegen = 3
            if(_userDb?.rl?.rumah != undefined) {
                const rumahDb = _userDb?.rl?.rumah
                if(rumahDb?.listrikstatus == 'mati') {
                    staminaRegen = 3
                } else if(rumahDb?.crid != undefined) {
                    staminaRegen = _rumahRegenEnergy[rumahDb.crid]
                } else {
                    staminaRegen = 3
                }
            }

            let calculateValueStaminaInput = Math.floor(_userDb?.rl?.stamina + (staminaRegen * lastActionRpTime_minute))
            if(calculateValueStaminaInput >= 200) calculateValueStaminaInput = 200

            dbChangePayload.$set["rl.stamina"] = calculateValueStaminaInput
            _userDb.rl.stamina = calculateValueStaminaInput
        }
    }
    const lastActionPdTime = _userDb?.lastAction?.pd
    const lastActionPdTime_minute = Math.floor((Date.now() - lastActionPdTime) / 60000)
    if(lastActionPdTime_minute >= 3) {
        dbChangePayload.$set["lastAction.pd"] = Date.now()
        _userDb.lastAction.pd = Date.now()
        isChangedData = true

        const time3MinutePassed = Math.floor(lastActionPdTime_minute / 3)
        const _pasangan = _userDb?.rl?.pd

        if(_pasangan?.food != undefined && _pasangan?.nama != undefined) {
            for(let i = 0; i < time3MinutePassed; i++) {
                if (Math.floor(_pasangan.food) <= 0 && Math.floor(_pasangan.uang) >= 40000) {
                    !dbChangePayload.$inc["rl.pd.uang"] ? dbChangePayload.$inc["rl.pd.uang"] = -40000 : dbChangePayload.$inc["rl.pd.uang"] -= 40000
                    _pasangan.uang -= 40000
                    _userDb.rl.pd.uang -= 40000

                    !dbChangePayload.$inc["rl.pd.food"] ? dbChangePayload.$inc["rl.pd.food"] = 100 : dbChangePayload.$inc["rl.pd.food"] += 100
                    _pasangan.food += 100
                    _userDb.rl.pd.food += 100
                } else if (Math.floor(_pasangan.food) <= 0 && Math.floor(_pasangan.uang) >= 20000) {
                    !dbChangePayload.$inc["rl.pd.uang"] ? dbChangePayload.$inc["rl.pd.uang"] = -20000 : dbChangePayload.$inc["rl.pd.uang"] -= 20000
                    _pasangan.uang -= 20000
                    _userDb.rl.pd.uang -= 20000

                    !dbChangePayload.$inc["rl.pd.food"] ? dbChangePayload.$inc["rl.pd.food"] = 70 : dbChangePayload.$inc["rl.pd.food"] += 70
                    _pasangan.food += 70
                    _userDb.rl.pd.food += 70
                } else if (Math.floor(_pasangan.food) <= 0 && Math.floor(_pasangan.uang) >= 15000) {
                    !dbChangePayload.$inc["rl.pd.uang"] ? dbChangePayload.$inc["rl.pd.uang"] = -15000 : dbChangePayload.$inc["rl.pd.uang"] -= 15000
                    _pasangan.uang -= 15000
                    _userDb.rl.pd.uang -= 15000

                    !dbChangePayload.$inc["rl.pd.food"] ? dbChangePayload.$inc["rl.pd.food"] = 50 : dbChangePayload.$inc["rl.pd.food"] += 50
                    _pasangan.food += 50
                    _userDb.rl.pd.food += 50
                } else if (Math.floor(_pasangan.food) <= 0 && Math.floor(_pasangan.uang) <= 14999) {
                    !dbChangePayload.$inc["rl.pd.hubungan"] ? dbChangePayload.$inc["rl.pd.hubungan"] = -1 : dbChangePayload.$inc["rl.pd.hubungan"] -= 1
                    _pasangan.hubungan -= 1
                    _userDb.rl.pd.hubungan -= 1
                } else if(Math.floor(_pasangan.food) >= 1) {
                    !dbChangePayload.$inc["rl.pd.food"] ? dbChangePayload.$inc["rl.pd.food"] = -1 : dbChangePayload.$inc["rl.pd.food"] -= 1
                    _pasangan.food -= 1
                    _userDb.rl.pd.food -= 1
                }
            }
        }
    }

    if((dbChangePayload.$set?.["lastAction.rl"] != undefined) || dbChangePayload.$set?.["lastAction.pd"] != undefined || dbChangePayload.$set?.["lastAction.mood"] != undefined) {
        await _mongo_UserSchema.updateOne({ iId: sender }, dbChangePayload)
    }

    if(isChangedData) return { _userDb }
}

module.exports = { priority, isAwait, messageHandler }