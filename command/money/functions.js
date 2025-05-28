const { _mongo_UserSchema } = require('../../lib/database');

const infinityNumber = 1.797693134862315E+307
const minInfinityNumber = -1.797693134862316E+307

//FUNCTION MONEY
const setMoney = async (userId) => {
    await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.money": 2000 } })
}

const getMoney = (_userDb) => {
    const _money = _userDb.economy.money
    let check = _money
    if(isNaN(check)) check = 2000
    if(!isFinite(check) && check >= 0) check = infinityNumber
    if(!isFinite(check) && check <= 0) check = minInfinityNumber

    if(isNaN(_money) || !isFinite(_money)) {
        async function changeValue() {
            await _mongo_UserSchema.updateOne({ iId: _userDb.iId }, { $set: { "economy.money": check } })
        }
        changeValue()
    }
    return check
}


// const getMoneyPosition = (userId) => {
//     let position = global.db['./lib/database/user/money.json'].findIndex(object => object.id == userId)
//     if (position !== -1) {
//         return position
//     }
// }

const MinMoney = async (userId, amount, _userDb = undefined) => {
    const moneyDb = !_userDb ? await _mongo_UserSchema.findOne({ iId: userId }) : _userDb
    let check = moneyDb.economy.money - amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check) && check >= 0) check = infinityNumber - amount
    if(!isFinite(check) && check <= 0) check = minInfinityNumber - amount

    // await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.money": -amount } })
    return !isFinite(moneyDb.economy.money - amount) || isNaN(moneyDb.economy.money - amount) ? await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.money": check } }) : await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.money": -amount } })
}

const addMoney = async (userId, amount, _userDb = undefined) => {
    const moneyDb = !_userDb ? await _mongo_UserSchema.findOne({ iId: userId }) : _userDb
    let check = moneyDb.economy.money += amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check) && check >= 0) check = (infinityNumber += amount)
    if(!isFinite(check) && check <= 0) check = (minInfinityNumber += amount)

    !isFinite(moneyDb.economy.money - amount) || isNaN(moneyDb.economy.money - amount) ? await _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.money": check } }) : await _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "economy.money": amount } })
}

//MONEY HARAM
const setMoney_haram = async (userId) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.moneyharam": 0 } })
}

const getMoney_haram = (_userDb) => {
    return _userDb.economy.moneyharam
}

const MinMoney_haram = async (userId, amount) => {
    const moneyDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = moneyDb.economy.moneyharam -= amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = minInfinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.moneyharam": check } })
}

const addMoney_haram = async (userId, amount) => {
    const moneyDb = await _mongo_UserSchema.findOne({ iId: userId })
    let check = moneyDb.economy.moneyharam += amount
    if(isNaN(check)) check = 2000
    if(!isFinite(check)) check = infinityNumber

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "economy.moneyharam": check } })
}

//Give Money Limit
const setMoneyLimitGive = async (userId) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "limit.lpaym": [] } })
}

const getMoneyLimitGive = (_userDb, to) => {
    const _limitGiveMoney = _userDb.limit.lpaym
    if (JSON.stringify(_limitGiveMoney) != '[]') {
        let _limitGiveIsAda = 'false'
        for (let a = 0; a < _limitGiveMoney.length; a++) {
            if(_limitGiveMoney[a].id == to) {
                _limitGiveIsAda = a
            }
        }
        return { posLimitMoney: _limitGiveIsAda }
    } else {
        return { posLimitMoney: 'false' }
    }
}

const addMoneyLimitGive = async (_userDb, userId, to, amount) => {
    const _limitGiveMoney = _userDb.limit.lpaym
    if (_limitGiveMoney != undefined) {
        let _limitGiveIsAda = 'false'
        for (let a = 0; a < _limitGiveMoney.length; a++) {
            if(_limitGiveMoney[a].id == to) {
                _limitGiveIsAda = a
            }
        }
        console.log(_limitGiveIsAda)
        if(_limitGiveIsAda != 'false') {
            // { limit: { lpaym: { id: 'XXX', limit: 90 }] } }
            await  _mongo_UserSchema.updateOne({ iId: userId, "limit.lpaym.id": to }, { $inc: { "limit.lpaym.$.limit": amount } })
        } else {
            await  _mongo_UserSchema.updateOne({ iId: userId }, { $push: { "limit.lpaym": { id: to, limit: amount } } })
        }
    }
}

module.exports = {
    setMoney,
    getMoney,
    MinMoney,
    addMoney,
    setMoney_haram,
    getMoney_haram,
    MinMoney_haram,
    addMoney_haram,
    setMoneyLimitGive,
    getMoneyLimitGive,
    addMoneyLimitGive
}