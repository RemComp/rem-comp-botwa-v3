const { _mongo_UserSchema } = require('../../lib/database')

//FUNCTION TICTAC
//PROFILE
const setTicTac_profile = async (userId) =>{
    const obj = {poin: 0, win: 0, lose: 0, draw: 0 }
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $set: { tictac: obj } })
}

const getTicTac_profile = (_userDb) => {
    const _tiktakuser = _userDb.tictac
    if (JSON.stringify(_tiktakuser) !== '{}') {
        return _tiktakuser
    }
}

// const getTicTac_profile_position = (userId) => {
//     let position = global.db['./lib/database/user/tictacuser.json'].findIndex(object => object.id == userId)
//     if (position !== -1) {
//         return position
//     }
// }

// const replaceTicTac_profile_lastlead = (userId, value) => {
//     let position = global.db['./lib/database/user/tictacuser.json'].findIndex(object => object.id == userId)
//     if (position !== -1) {
//         global.db['./lib/database/user/tictacuser.json'][position].lastlead = value
//     }
// }

const addTicTac_profile = async (userId, property, value) => {
    await  _mongo_UserSchema.updateOne({ iId: userId }, { $inc: { ["tictac." + property]: value } })
}

// const addTicTacHistory_profile = (userId, value) => {
//     let position = global.db['./lib/database/user/tictacuser.json'].findIndex(object => object.id == userId)
//     if (position !== -1) {
//         global.db['./lib/database/user/tictacuser.json'][position].history.push(value)
//     }
// }

//GAME
const setTicTac_toe = async (userId, userId2) => {
    const obj = { player1: userId, player2: userId2, "a0": '', "a1": '', "a2": '', "a3": '', "a4": '', "a5": '', "a6": '', "a7": '', "a8": '', status: 'waiting', turn: '', xo: [] }
    await _mongo_UserSchema.updateMany({ $or: [{ iId: userId }, { iId: userId2 }] }, { $set: { tc: obj } })
}

const getTicTac_toe = (_userDb) => {
    const _tiktak = _userDb
    if ((JSON.stringify(_tiktak?.tc) !== '{}') && (_tiktak?.tc != null) && (_tiktak?.tc != undefined)) {
        // console.log(_tiktak)
        return Object.assign(_tiktak?.tc, { iId: _tiktak?.iId })
    }
}

// const getTicTac_toe_position = (userId) => {
//     let position = global.db['./lib/database/user/tictac.json'].findIndex(object => object.player1 == userId || object.player2 == userId)
//     if (position !== -1) {
//         return position
//     }
// }

const replaceTicTac_xo = async (userId, xo1) => {
    await _mongo_UserSchema.updateMany({ $or: [{ "tc.player1": userId }, { "tc.player2": userId }] }, { $set: { "tc.xo": xo1 } })
}

const replaceTicTac_status = async (userId, statusid) => {
    await _mongo_UserSchema.updateMany({ $or: [{ "tc.player1": userId }, { "tc.player2": userId }] }, { $set: { "tc.status": statusid } })
}

const replaceTicTac_turn = async (userId, giliran) => {
    await _mongo_UserSchema.updateMany({ $or: [{ "tc.player1": userId }, { "tc.player2": userId }] }, { $set: { "tc.turn": giliran } })
}

const replaceTicTac_toe_game = async (userId, symboll, id) => {
    await _mongo_UserSchema.updateMany({ $or: [{ "tc.player1": userId }, { "tc.player2": userId }] }, { $set: { ["tc." + id]: symboll } })
}

function generateBoardIcons(gameState) {
    const defaultIcons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
    const icons = [...defaultIcons]
    
    for(let i = 0; i < 9; i++) {
        const position = `a${i}`
        if(gameState[position] === 'x') {
            icons[i] = '❌'
        } else if(gameState[position] === 'o') {
            icons[i] = '⭕'
        }
    }
    
    return [
        icons.slice(0, 3).join(' '),
        icons.slice(3, 6).join(' '),
        icons.slice(6, 9).join(' ')
    ]
}

function checkWinCondition(gameState) {
    const winningConditions = [
        ['a0', 'a1', 'a2'], ['a3', 'a4', 'a5'], ['a6', 'a7', 'a8'],
        ['a0', 'a3', 'a6'], ['a1', 'a4', 'a7'], ['a2', 'a5', 'a8'],
        ['a0', 'a4', 'a8'], ['a2', 'a4', 'a6']
    ]
    
    for(const condition of winningConditions) {
        const [a, b, c] = condition.map(pos => gameState[pos])
        if(a && a === b && b === c) {
            return a
        }
    }
    return null
}

function checkDraw(gameState) {
    for(let i = 0; i < 9; i++) {
        if(gameState[`a${i}`] === '') return false
    }
    return true
}

async function handleGameWin(rem, from, gameState, winner, boardIcons, prefix) {
    const poinRandomTictac = Math.floor(Math.random() * 10) + 35
    const winnerPlayer = gameState.xo[0][winner]
    const loserPlayer = winner === 'x' ? gameState.xo[0].o : gameState.xo[0].x
    const winIcon = winner === 'x' ? '❌' : '⭕'
    
    await addTicTac_profile(winnerPlayer, 'poin', poinRandomTictac)
    await addTicTac_profile(winnerPlayer, 'win', 1)
    await addTicTac_profile(loserPlayer, 'lose', 1)
    
    await rem.sendTextWithMentions(from, `*Winner (${winIcon}) @${winnerPlayer.replace('@s.whatsapp.net', '')}*\nPoin : *+${poinRandomTictac}*\n\n❌ : @${gameState.xo[0].x.replace('@s.whatsapp.net', '')}\n⭕ : @${gameState.xo[0].o.replace('@s.whatsapp.net', '')}\n\n ${boardIcons.join('\n ')}`)
    await rem.sendButtons(from, 'Link Button', [{id: 'winner_profile', text: `${prefix}tc profile`}], '', '')
    await _mongo_UserSchema.updateMany({ $or: [{ iId: gameState.player1 }, { iId: gameState.player2 }] }, { $set: { tc: {} } })
}

async function handleGameDraw(rem, from, gameState, boardIcons, prefix) {
    await addTicTac_profile(gameState.xo[0].x, 'draw', 1)
    await addTicTac_profile(gameState.xo[0].o, 'draw', 1)
    await addTicTac_profile(gameState.xo[0].x, 'poin', 5)
    await addTicTac_profile(gameState.xo[0].o, 'poin', 5)
    
    await rem.sendTextWithMentions(from, `Seri\nPoin : *+5*\n\n❌ : @${gameState.xo[0].x.replace('@s.whatsapp.net', '')}\n⭕ : @${gameState.xo[0].o.replace('@s.whatsapp.net', '')}\n\n ${boardIcons.join('\n ')}`)
    await rem.sendButtons(from, 'Link Button', [{id: 'draw_profile', text: `${prefix}tc profile`}], '', '')
    await _mongo_UserSchema.updateMany({ $or: [{ iId: gameState.player1 }, { iId: gameState.player2 }] }, { $set: { tc: {} } })
}

module.exports = {
    setTicTac_profile,
    getTicTac_profile,
    addTicTac_profile,
    // getTicTac_profile_position,
    // replaceTicTac_profile_lastlead,
    // addTicTacHistory_profile,

    setTicTac_toe,
    getTicTac_toe,
    // getTicTac_toe_position,
    replaceTicTac_xo,
    replaceTicTac_status,
    replaceTicTac_turn,
    replaceTicTac_toe_game,

    generateBoardIcons,
    checkWinCondition,
    checkDraw,
    handleGameWin,
    handleGameDraw
}