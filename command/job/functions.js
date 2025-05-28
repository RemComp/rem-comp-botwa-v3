const toMs = require('ms')
const { _mongo_UserSchema } = require('../../lib/database')

const setUserJob = async (userId) => {
    const obj = { job: "Pengangguran", lvljob: 1, xpjob: 0, multi: 1}
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.job": obj } })
}
//ADD FUNCTION
const addUserJob = async (userId, job) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.job.job": job } })
}

const addJobXp = async (_userDb, userId, amount) => {
    let pushedAmount = amount
    if(_userDb.item?.jobBoost && _userDb.item?.jobBoost?.time != 0 && _userDb.item?.jobBoost?.xp != 0) pushedAmount = amount * _userDb.item.jobBoost.xp
    await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.job.xpjob": pushedAmount } })
}

const addJobLvl = async (userId, amount = 1) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.job.lvljob": amount } })
}

const addJobMulti = async (userId, amount = 1) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.job.multi": amount } })
}

const setJobMulti = async (userId, amount = 1) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.job.multi": amount } })
}

const addUserBoostJob = async (userId, time, xp) => {
    const obj = { xp: xp, time: Date.now() + toMs(time) }
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "item.jobBoost": obj } })
}

//WORK
const addWork = async (userId, time) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.worklimit": Date.now() + toMs(time) } })
}

// const WorkCheck = () => {
//     let position = global.db['./lib/database/user/worklimit.json'].filter(object => Date.now() >= object.time)
//     for(let i = 0; i < position.length; i++) {
//         global.db['./lib/database/user/worklimit.json'].splice(position, 1)
//     }
// }

const getWorkId = (_userDb) => {
    let position = _userDb.economy.worklimit
    if (position != 0) {
        return _userDb.iId
    }

}

const getWorkTimer = (_userDb) => {
    let position = _userDb.economy.worklimit
    if (position != 0) {
        return position
    }
}

//GET FUNCTION
const getUserJobId = (_userDb) => {
    let position = _userDb.economy.job
    if (JSON.stringify(position) !== '{}' && position !== undefined) {
        return _userDb.iId
    }
}

// const getUserPosition = (userId, _dir) => {
//     let position = global.db['./lib/database/user/job.json'].findIndex(object => object.id == userId)
//     if (position !== -1) {
//         return position
//     }
// }

const getUserJob = (_userDb) => {
    let position = _userDb.economy.job
    if (JSON.stringify(position) !== '{}') {
        return position.job
    }
}

const getLvlJob = (_userDb) => {
    let position = _userDb.economy.job
    if (JSON.stringify(position) !== '{}') {
        return position.lvljob
    }
}

const getXpJob = (_userDb) => {
    let position = _userDb.economy.job
    if (JSON.stringify(position) !== '{}') {
        return position.xpjob
    }
}

const getMulti = (_userDb) => {
    let position = _userDb.economy.job
    if (JSON.stringify(position) !== '{}') {
        return position.multi
    }
}

const getUserBoostJob = (_userDb) => {
    let position = _userDb.item.jobBoost
    if (JSON.stringify(position) !== '{}') {
        return position
    }
}

module.exports = {
    setUserJob,
    addUserJob,
    addJobXp,
    addJobLvl,
    addJobMulti,
    setJobMulti,
    addUserBoostJob,
    getUserJobId,
    // getUserPosition,
    getUserJob,
    getXpJob,
    getLvlJob,
    getMulti,
    addWork,
    // WorkCheck,
    getWorkId,
    getWorkTimer,
    getUserBoostJob
}