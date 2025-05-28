const { _mongo_UserSchema } = require('../../lib/database');

const getUserListItem = (_userDb, toObj = false) => {
    const _item = _userDb.item.item
    return !toObj ? (_item || []) : Object.assign({}, ...(_item || []))
}

// etc. { level: { level: 1 + level, time: Date.now() + toMs(time) } }
const addUserListItem = async (userId, item) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $push: { "item.item": item } })
}

const enableUserListItem = async (userId, item) => {
    const findItemEnable = await _mongo_UserSchema.findOne({ iId: userId }, { "item.item": 1 })
    const _item = getUserListItem(findItemEnable, true)
    if(!_item[item]) return false

    await _mongo_UserSchema.updateOne({ iId: userId }, { $pull: { "item.item": { [item]: _item[item] } }, $set: { [`item.${item}`]: _item[item] } })
    return true
}

const disableUserListItem = async (userId, item) => {
    const findItemDisable = await _mongo_UserSchema.findOne({ iId: userId }, { "item": 1 })
    const _item = findItemDisable.item
    if(!_item[item] || JSON.stringify(_item[item]) == '{}') return false

    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { [`item.${item}`]: {} }, $push: { "item.item": { [item]: _item[item] } } })
    return true
}

//ITEM
const getUserItemId = (_userDb, includeDeactive = false) => {
    const _itemLevel = _userDb.item.level
    if (_itemLevel.time != 0 && JSON.stringify(_itemLevel) != '{}') {
        return _itemLevel
    }
    if(includeDeactive) {
        const listDeactive = getUserListItem(_userDb, true)
        const allKeysDeactive = Object.keys(listDeactive || {})
        if(allKeysDeactive.includes('level')) return listDeactive.level
    }
}
//LEVEL

const getItemJobBoost = (_userDb, includeDeactive = false) => {
    const _itemJobBoost = _userDb.item.jobBoost
    if (_itemJobBoost.time != 0 && JSON.stringify(_itemJobBoost) != '{}') {
        return _itemJobBoost
    }
    if(includeDeactive) {
        const listDeactive = getUserListItem(_userDb, true)
        const allKeysDeactive = Object.keys(listDeactive || {})
        if(allKeysDeactive.includes('jobBoost')) return listDeactive.jobBoost
    }
}

const addItemJobBoost = async (_userDb, xp, time) => {
    const obj = { xp: 1 + xp, time: Date.now() + toMs(time) }
    await _mongo_UserSchema.updateOne({ iId: _userDb.iId }, { $set: { "item.jobBoost": obj } })
}

async function addJumItemJobBoost (_userDb, userId, amount) {
    const listDeactive = getUserListItem(_userDb, true)
    const allKeysDeactive = Object.keys(listDeactive || {})
    if(allKeysDeactive.includes('jobBoost')) {
        await _mongo_UserSchema.updateOne({ iId: userId, "item.item.jobBoost": { $exists: true } }, { $inc: { "item.item.$.jobBoost.xp": amount } })
    } else {
        await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "item.jobBoost.xp": amount } })
    }
}

const getItemLevel = (_userDb, includeDeactive = false) => {
    const _itemLevel = _userDb.item.level
    if (_itemLevel.time != 0 && JSON.stringify(_itemLevel) != '{}') {
        return _itemLevel
    }
    if(includeDeactive) {
        const listDeactive = getUserListItem(_userDb, true)
        const allKeysDeactive = Object.keys(listDeactive || {})
        if(allKeysDeactive.includes('level')) return listDeactive.level
    }
}

const addItemLevel = async (_userDb, level, time) => {
    const obj = { level: 1 + level, time: Date.now() + toMs(time) }
    await  _mongo_UserSchema.updateOne({ iId: _userDb.iId }, { $set: { "item.level": obj } })
}

async function addJumItemLevel (_userDb, userId, amount) {
    const listDeactive = getUserListItem(_userDb, true)
    const allKeysDeactive = Object.keys(listDeactive || {})
    if(allKeysDeactive.includes('level')) {
        await _mongo_UserSchema.updateOne({ iId: userId, "item.item.level": { $exists: true } }, { $inc: { "item.item.$.level.level": amount } })
    } else {
        await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "item.level.level": amount } })
    }
}

const getUserItemIdSpy = (_userDb, includeDeactive = false) => {
    const _itemSpy = _userDb?.item?.spy || {}
    if (_itemSpy?.time != 0 && JSON.stringify(_itemSpy) != '{}') {
        return _itemSpy
    }
    if(includeDeactive) {
        const listDeactive = getUserListItem(_userDb, true)
        const allKeysDeactive = Object.keys(listDeactive || {})
        if(allKeysDeactive.includes('spy')) return listDeactive.spy
    }
}

const addItemSpy = async (userId, time) => {
    const obj = { time: Date.now() + toMs(time) }
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "item.spy": obj } })
}

module.exports = {
    getUserListItem,
    addUserListItem,
    enableUserListItem,
    disableUserListItem,

    getUserItemId,
    getItemJobBoost,
    addItemJobBoost,
    addJumItemJobBoost,

    getItemLevel,
    addItemLevel,
    addJumItemLevel,

    getUserItemIdSpy,
    addItemSpy
};