const { _mongo_UserSchema } = require('../../lib/database')

function getLevelingXp(_userDb) {
    const _level = _userDb.economy.xp
    let check = _level
    // if(isNaN(check)) check = 2000
    // if(check == Number.POSITIVE_INFINITY) check = infinityNumber
    // if(check == Number.NEGATIVE_INFINITY) check = minInfinityNumber

    // await  _mongo_UserSchema.updateOne({ iId: _userDb.iId }, { $set: { "economy.xp": check } })
    return check
}

const getLevelingLevel = (_userDb) => {
    const _level = _userDb.economy.level
    let check = _level
    // if(isNaN(check)) check = 2000
    // if(check == Number.POSITIVE_INFINITY) check = infinityNumber
    // if(check == Number.NEGATIVE_INFINITY) check = minInfinityNumber

    // await  _mongo_UserSchema.updateOne({ iId: _userDb.iId }, { $set: { "economy.level": check } })
    return check
}

const getLevelingId = (_userDb) => {
    const _level = _userDb.economy.level
    if (JSON.stringify(_level) != '{}') {
        return _userDb.iId
    }
}

const replaceLevelingXp = async (userId, xp) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.xp": xp } })
}

const addLevelingXp = async (userId, amount) => {
    const _userDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = _userDb.economy.xp + amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = infinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.xp": check } })
}

const MinLevelingXp = async (userId, amount) => {
    const _userDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = _userDb.economy.xp - amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = minInfinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.xp": check } })
}

const addLevelingLevel = async (userId, amount) => {
    const _userDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = _userDb.economy.level + amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = infinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.level": check } })
}

const MinLevelingLevel = async (userId, amount) => {
    const _userDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = _userDb.economy.level - amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = minInfinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.level": check } })
}

const addLevelingId = async (userId) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.xp": 0, "economy.level": 1 } })
}

module.exports = {
    getLevelingXp,
    getLevelingLevel,
    getLevelingId,
    replaceLevelingXp,
    addLevelingXp,
    MinLevelingXp,
    addLevelingLevel,
    MinLevelingLevel,
    addLevelingId
}