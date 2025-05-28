const { _mongo_UserSchema } = require('../../lib/database');

const setUserRoleplayMantan_pasangan = async (userId, mal_id) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.mantan": [mal_id] } })
}

const getUserRoleplayMantan_pasangan = (_userDb) => {
    let _mantan = _userDb.rl.mantan
    if (JSON.stringify(_mantan) != '[]') {
        return _mantan
    }
}

const addUserRoleplayMantan_pasangan = async (userId, textId) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $push: { "rl.mantan": textId } })
}

//Pasangan
/* 
mal = url Myanimelist
img = url Image
nama = Nama Character
hubungan = Persen Keharmonisan/Keromantisan
status = Pacaran | Menikah | Berkeluarga.<jumlah anak>.<gender anak> (Untuk Visual Text)
status2 = none | Hamil.<umur>
anak = ID anak, anak, lahir sejak, gender
        {id: XXXXXXXXX, nama: 'blablaba', lahir: <format Date.now()>, gender: 'Cowo/Cewe'}
nkkand = Anak lahir Perlu Confirm
        {id: XXXXXXXXX, lahir: <format Date.now()>, gender: 'Cowo/Cewe'}
*/  
const setUserRoleplay_pasangan = async (userId, nama, gender, imgUrl, MALid, MALurl) => {
    let obj = { nama: nama, gender, umurpd: Date.now(), img: imgUrl, mal_id: MALid, mal_url: MALurl, level: 0, xp: 0, food: 100, hubungan: 6, uang: 0, status: 'Pacaran', status2: 'none', anak: [], nkkand: [] }
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd": obj } })
}

const getUserRoleplay_pasangan = (_userDb) => {
    let _pasangan = _userDb.rl?.pd
    if(_pasangan?.mal_id == undefined) return undefined
    if (JSON.stringify(_pasangan) != '{}') {
        return _pasangan
    }
}

const addUserRoleplayXP_pasangan = async (userId, amount) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "rl.pd.xp": amount } })
}

const addUserRoleplayLevel_pasangan = async (userId, amount) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { "rl.pd.level": amount } })
}

const replaceUserRoleplayFood_pasangan = async (userId, CalculateAmount) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.food": CalculateAmount } })
}

const multiplierHubunganBurukMin = 0.9
const replaceUserRoleplayHubungan_pasangan = async (userId, CalculateAmount) => {
    const _pasangan = await _mongo_UserSchema.findOne({ iId: userId })
    let pd = _pasangan.rl.pd
    if (JSON.stringify(pd) != '{}') {

        // if((pd.hubungan < CalculateAmount) && pd.mood === 'Buruk 😡') {
        //     CalculateAmount = Math.floor(CalculateAmount * multiplierHubunganBurukMin)
        // }

        if(pd.status == 'Pacaran') {
            if(CalculateAmount >= 100) {
                var inputDataValue = 100
            } else {
                var inputDataValue = CalculateAmount
            }
        } else if(pd.status == 'Menikah') {
            if(CalculateAmount >= 300) {
                var inputDataValue = 300
            } else {
                var inputDataValue = CalculateAmount
            }
        } else if(pd.status.startsWith('Berkeluarga')) {
            if(CalculateAmount >= 500) {
                var inputDataValue = 500
            } else {
                var inputDataValue = CalculateAmount
            }
        } else {
            if(CalculateAmount >= 100) {
                var inputDataValue = 100
            } else {
                var inputDataValue = CalculateAmount
            }
        }
        await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.hubungan": inputDataValue } })
    }
}

const replaceUserRoleplayMood_pasangan = async (userId, change) => {
    if(!['Buruk 😡', 'Biasa 😐', 'Baik 😊'].includes(change)) return

    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.mood": change } })
}

const replaceUserRoleplayHubungan_pasangan_force = async (userId, CalculateAmount) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.hubungan": CalculateAmount } })
}

const replaceUserRoleplayUang_pasangan = async (userId, CalculateAmount) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.uang": CalculateAmount } })
}

const replaceUserRoleplayStatus_pasangan = async (userId, text) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.status": text } })
}

const replaceUserRoleplayStatus2_pasangan = async (userId, text) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { "rl.pd.status2": text } })
}

const replaceUserRoleplayValue_pasangan = async (userId, input, textOrNumber) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { ["rl.pd." + input]: textOrNumber } })
}

/*const addUserRoleplayAnakKandungan_pasangan = (userId, waktu) => {
    const _pasangan = JSON.parse(fs.readFileSync('./lib/database/user/rl/pasangan.json'))
    let position = false
    Object.keys(_pasangan).forEach((i) => {
        if (_pasangan[i].id === userId) {
            position = i
        }
    })
    if (position !== false) {
        _pasangan[position].nkkand.push({ id: GenerateSerialNumber("000000000000000"), status: 'kandungan', time: waktu, ttllahir: '' })
        fs.writeFileSync('./lib/database/user/rl/pasangan.json', JSON.stringify(_pasangan))
    }
}

const getUserRoleplayAnakKandungan_pasangan = (id) => {
    const _pasangan = JSON.parse(fs.readFileSync('./lib/database/user/rl/pasangan.json'))
    let position = false
    Object.keys(_pasangan).forEach((i) => {
        if (_pasangan.nkkand[i].id === userId) {
            position = i
        }
    })
    if (position !== false) {
        return position
    }
}*/

const addUserRoleplayAnak_pasangan = async (userId, idAnak, nama, waktuLahir, gender) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $addToSet: { "rl.pd.anak": { id: idAnak, nama: nama, lahir: waktuLahir, gender: gender } } })
}

module.exports = {
    setUserRoleplayMantan_pasangan,
    getUserRoleplayMantan_pasangan,
    addUserRoleplayMantan_pasangan,
    setUserRoleplay_pasangan,
    getUserRoleplay_pasangan,
    addUserRoleplayXP_pasangan,
    addUserRoleplayLevel_pasangan,
    replaceUserRoleplayFood_pasangan,
    replaceUserRoleplayHubungan_pasangan,
    replaceUserRoleplayMood_pasangan,
    replaceUserRoleplayHubungan_pasangan_force,
    replaceUserRoleplayUang_pasangan,
    replaceUserRoleplayStatus_pasangan,
    replaceUserRoleplayStatus2_pasangan,
    replaceUserRoleplayValue_pasangan,
    addUserRoleplayAnak_pasangan
}