const priority = 2
const isAwait = true

const { addLevelingXp } = require('./level/functions')
const { getUserItemId, getItemLevel } = require('./item/functions')
const { addMoney } = require('./economy/functions_money')
const { 
    getTicTac_toe, replaceTicTac_status, replaceTicTac_xo, replaceTicTac_turn, replaceTicTac_toe_game,
    generateBoardIcons, checkWinCondition, checkDraw, handleGameDraw, handleGameWin
} = require('./tictac/functions')

const { numberWithCommas, fixNumberE, shuffleArray } = require('../utils/utils')

const { _mongo_GroupSchema, _mongo_UserSchema } = require('../lib/database')

async function messageHandler (rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    if(!message.isGroupMsg || !message.from || !message.sender) return

    if(_groupDb?.game?.mathgame || _groupDb?.game?.quizgame) {
        await quizgameCheck(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)
    }

    // Add tic-tac-toe game check
    if(_userDb?.tc && Object.keys(_userDb.tc).length > 0) {
        await tictacGameCheck(rem, message, _userDb, _groupDb, _mentionUserDb, clientData)
    }
}

async function quizgameCheck(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { args } = clientData
    const { from, body, quotedMsg, sender } = message

    let isMessageMathGame = false
    let isMessageQuiz = false
    let positionMathGame_player = false
    let positionQuizGame_player = false
    const _mathgame = _groupDb?.game?.mathgame
    const _quizgame = _groupDb?.game?.quizgame
    if(quotedMsg != null &&  quotedMsg.fromMe) {
        let messageMathGame = _mathgame.map(mth => mth?.mid)
        let replyied_body = quotedMsg.id

        if(messageMathGame.includes(replyied_body)) {
            isMessageMathGame = true
            positionMathGame_player = _mathgame.findIndex(el => el?.mid == replyied_body)
        }

        const responsesquizgame = _quizgame.map(qz => qz?.mid)
        if(responsesquizgame.includes(replyied_body)) {
            isMessageQuiz = true
            positionQuizGame_player = _quizgame.findIndex(el => el?.mid == replyied_body)
        }
    }            
    if(isMessageMathGame) {
        const jawabanMathGame_Answer = _mathgame[positionMathGame_player]
        if(args[0].includes(',')) {
            var args012Filter_mathgame = args[0].replace(/,/gi, '.')
            var args02Filter_mathgame = args012Filter_mathgame
        } else {
            var args02Filter_mathgame = args[0]
        }

        if(args02Filter_mathgame.includes('-')) {
            if(args02Filter_mathgame.includes('.')) {
                var args01Filter_mathgame = Math.abs(args02Filter_mathgame).toFixed(1)
                var args0Filter_mathgame = '-'+args01Filter_mathgame
            } else {
                var args01Filter_mathgame = Math.abs(args02Filter_mathgame)
                var args0Filter_mathgame = '-'+args01Filter_mathgame
            }
        } else if(args02Filter_mathgame.includes('.')) {
            var args01Filter_mathgame = Math.abs(args02Filter_mathgame).toFixed(1)
            var args0Filter_mathgame = `${args01Filter_mathgame}`
        } else {
            var args0Filter_mathgame = args[0]
        }
        if(args0Filter_mathgame == jawabanMathGame_Answer.jawaban) {
            if(jawabanMathGame_Answer.diff == 'Easy') {
                var XPNambahMathGame = Math.floor(Math.random() * 10) + 1000
            } else if(jawabanMathGame_Answer.diff == 'Normal') {
                var XPNambahMathGame = Math.floor(Math.random() * 10) + 3000
            } else if(jawabanMathGame_Answer.diff == 'Hard') {
                var XPNambahMathGame = Math.floor(Math.random() * 10) + 5000
            }

            if (getUserItemId(_userDb) == undefined) {
                var amountXpssNambahMath = Math.floor(XPNambahMathGame)
            } else {
                var amountXpssNambahMath = Math.floor(XPNambahMathGame * getItemLevel(_userDb).level)
            }

            rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(amountXpssNambahMath))} XP`)
            await addLevelingXp(sender, amountXpssNambahMath)
            await _mongo_GroupSchema.updateOne({ iId: from, "game.mathgame.mid": quotedMsg.id }, { $unset: { "game.mathgame.$": 1 } })
            await _mongo_GroupSchema.updateOne({ iId: from }, { $pull: { "game.mathgame": null } })
        } else {
            rem.reply(from, 'SLAH')
        }
    } else if (isMessageQuiz) {
        if(_quizgame[positionQuizGame_player].game == 'fm100') { // fm100
            const jawabanQuizGame_answer = _quizgame[positionQuizGame_player].jawaban.map(all => all.toLowerCase().replace(/\s/g, ''))
            const jawabanArgs_chat = body.toLowerCase().replace(/\s/g, '')

            if(_quizgame[positionQuizGame_player]?.isJawab?.includes(jawabanArgs_chat)) return rem.reply(from, `sudah ada yang menjawab dengan jawaban yang sama sebelumnya`)
            if(jawabanQuizGame_answer.includes(jawabanArgs_chat)) {
                var XPNambahQuizGame = Math.floor(Math.random() * 10) + 6000
                rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(XPNambahQuizGame))} XP`)
                if(_quizgame[positionQuizGame_player].reason != undefined) rem.sendText(from, _quizgame[positionQuizGame_player].reason)

                await addLevelingXp(sender, XPNambahQuizGame)
                await _mongo_GroupSchema.updateOne({ iId: from, "game.quizgame.mid": quotedMsg.id }, { $set: { "game.quizgame.$.isDone": true }, $push: { "game.quizgame.$.isJawab": jawabanArgs_chat } })
            } else {
                rem.reply(from, 'SLAH')
            }
        } else if(!_quizgame[positionQuizGame_player].isDone && _quizgame[positionQuizGame_player].game == 'tebakgambar') { // tebakgambar
            const jawabanQuizGame_answer = _quizgame[positionQuizGame_player].jawaban.replace(/\s/g, '').toLowerCase()
            const jawabanArgs_chat = body.toLowerCase().replace(/\s/g, '')

            if(jawabanArgs_chat == jawabanQuizGame_answer) {
                var XPNambahQuizGame = Math.floor(Math.random() * 10) + 6000
                rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(XPNambahQuizGame))} XP`)
                if(_quizgame[positionQuizGame_player].reason != undefined) rem.sendText(from, _quizgame[positionQuizGame_player].reason)
                await addLevelingXp(sender, XPNambahQuizGame)
                await _mongo_GroupSchema.updateOne({ iId: from, "game.quizgame.mid": quotedMsg.id }, { $set: { "game.quizgame.$.isDone": true } })
            } else {
                rem.reply(from, 'SLAH')
            }
        } else if(!_quizgame[positionQuizGame_player].isDone && _quizgame[positionQuizGame_player].game == 'tebakbendera') { // tebaklbendera
            const jawabanQuizGame_answer = _quizgame[positionQuizGame_player].jawaban.replace(/\s/g, '').toLowerCase()
            const jawabanArgs_chat = body.toLowerCase().replace(/\s/g, '')

            if(jawabanArgs_chat == jawabanQuizGame_answer) {
                var XPNambahQuizGame = Math.floor(Math.random() * 10) + 6000
                var MoneyNambahQuizGame = Math.floor(Math.random() * 10) + 8000
                rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(XPNambahQuizGame))} XP!\n+${MoneyNambahQuizGame} Money!`)
                if(_quizgame[positionQuizGame_player].reason != undefined) rem.sendText(from, _quizgame[positionQuizGame_player].reason)

                await addMoney(sender, MoneyNambahQuizGame)
                await addLevelingXp(sender, XPNambahQuizGame)
                await _mongo_GroupSchema.updateOne({ iId: from, "game.quizgame.mid": quotedMsg.id }, { $set: { "game.quizgame.$.isDone": true } })
            } else {
                rem.reply(from, 'SLAH')
            }
        } else if(!quizgame[positionQuizGame_player].isDone && _quizgame[positionQuizGame_player].game == 'tbjapan') { //tebak huruf japan
            const jawabanQuizGame_answer = _quizgame[positionQuizGame_player].jawaban.replace(/\s/g, '').toLowerCase()
            const jawabanArgs_chat = body.toLowerCase().replace(/\s/g, '')

            if(jawabanArgs_chat == jawabanQuizGame_answer) {
                var XPNambahQuizGame = Math.floor(Math.random() * 10) + 6000
                var MoneyNambahQuizGame = Math.floor(Math.random() * 10) + 8000
                rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(XPNambahQuizGame))} XP!\n+${MoneyNambahQuizGame} Money!`)
                if(_quizgame[positionQuizGame_player].reason != undefined) rem.sendText(from, _quizgame[positionQuizGame_player].reason)

                await addMoney(sender, MoneyNambahQuizGame)
                await addLevelingXp(sender, XPNambahQuizGame)
                await _mongo_GroupSchema.updateOne({ iId: from, "game.quizgame.mid": quotedMsg.id }, { $set: { "game.quizgame.$.isDone": true } })
            } else {
                rem.reply(from, 'SLAH!')
            }
        } else if(!_quizgame[positionQuizGame_player].isDone && _quizgame[positionQuizGame_player].game == 'tebakwilayah') { // tebaklbendera
            const jawabanQuizGame_answer = _quizgame[positionQuizGame_player].jawaban.replace(/\s/g, '').toLowerCase()
            const jawabanArgs_chat = body.toLowerCase().replace(/\s/g, '')

            if(jawabanArgs_chat == jawabanQuizGame_answer) {
                var XPNambahQuizGame = Math.floor(Math.random() * 10) + 8000
                var MoneyNambahQuizGame = Math.floor(Math.random() * 10) + 8000
                rem.reply(from, `BTUL\n\n+${numberWithCommas(fixNumberE(XPNambahQuizGame))} XP!\n+${MoneyNambahQuizGame} Money!`)
                if(_quizgame[positionQuizGame_player].reason != undefined) rem.sendText(from, _quizgame[positionQuizGame_player].reason)

                await addMoney(sender, MoneyNambahQuizGame)
                await addLevelingXp(sender, XPNambahQuizGame)
                await _mongo_GroupSchema.updateOne({ iId: from, "game.quizgame.mid": quotedMsg.id }, { $set: { "game.quizgame.$.isDone": true } })
            } else {
                rem.reply(from, 'SLAH')
            }
        }
    }
}

async function tictacGameCheck(rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { args, isCmd, isMedia, type, prefix } = clientData
    const { from, body, sender } = message

    const checkTictacToePlayer = getTicTac_toe(_userDb)
    if(!checkTictacToePlayer) return

    // Handle waiting status - player2 accepting the game
    if(checkTictacToePlayer.status === 'waiting' && checkTictacToePlayer.player2 === sender) {
        if(!isMedia && type !== 'sticker' && (args[0]?.toLowerCase() === '*y*' || args[0]?.toLowerCase() === 'y')) {
            const playerListTictacToe = [checkTictacToePlayer.player1, checkTictacToePlayer.player2]
            await shuffleArray(playerListTictacToe)
            
            await replaceTicTac_status(sender, 'playing')
            await replaceTicTac_xo(sender, [{x: playerListTictacToe[0], o: playerListTictacToe[1]}])
            await replaceTicTac_turn(sender, playerListTictacToe[0])
            
            rem.sendTextWithMentions(from, `*Tictac*\n\n❌ : @${playerListTictacToe[0].replace('@s.whatsapp.net', '')}\n⭕ : @${playerListTictacToe[1].replace('@s.whatsapp.net', '')}\n*Giliran : @${playerListTictacToe[0].replace('@s.whatsapp.net', '')}*\n\n 1️⃣ 2️⃣ 3️⃣\n 4️⃣ 5️⃣ 6️⃣\n 7️⃣ 8️⃣ 9️⃣`)
        }
        return
    }

    // Handle playing status - actual game moves
    if(checkTictacToePlayer.status === 'playing' && !isCmd && !isMedia && type !== 'sticker') {
        if(isNaN(args[0])) return

        if(checkTictacToePlayer.turn !== sender) {
            const currentGame = getTicTac_toe(_userDb)
            return rem.sendTextWithMentions(from, `Sekarang giliran @${currentGame.turn.replace('@s.whatsapp.net', '')}`)
        }

        const selectedNumber = Math.floor(args[0]) - 1
        if(isNaN(selectedNumber) || selectedNumber < 0 || selectedNumber > 8) return

        const selectedPosition = `a${selectedNumber}`
        if(checkTictacToePlayer[selectedPosition] !== '') {
            return rem.reply(from, `Nomor *${selectedNumber + 1}* telah terpilih`)
        }

        // Switch turns
        const nextTurn = checkTictacToePlayer.turn === checkTictacToePlayer.player1 
            ? checkTictacToePlayer.player2 
            : checkTictacToePlayer.player1
        await replaceTicTac_turn(sender, nextTurn)

        // Place move
        const playerSymbol = checkTictacToePlayer.xo[0].x === sender ? 'x' : 'o'
        if(playerSymbol === 'x' || playerSymbol === 'o') {
            await replaceTicTac_toe_game(sender, playerSymbol, selectedPosition)
        } else {
            return rem.reply(from, `Invalid!\nerr: unauthorized`)
        }

        // Get updated game state
        const updatedUserDb = await _mongo_UserSchema.findOne({ iId: sender })
        const gameState = getTicTac_toe(updatedUserDb)

        // Generate board display
        const boardIcons = generateBoardIcons(gameState)
        
        // Check for win
        const winner = checkWinCondition(gameState)
        
        if(winner) {
            await handleGameWin(rem, from, gameState, winner, boardIcons, prefix)
        } else if(checkDraw(gameState)) {
            await handleGameDraw(rem, from, gameState, boardIcons, prefix)
        } else {
            // Continue game
            const currentTurn = getTicTac_toe(updatedUserDb)
            rem.sendTextWithMentions(from, `*Tictac*\n\n❌ : @${gameState.xo[0].x.replace('@s.whatsapp.net', '')}\n⭕ : @${gameState.xo[0].o.replace('@s.whatsapp.net', '')}\n\n*Giliran : @${currentTurn.turn.replace('@s.whatsapp.net', '')}*\n\n ${boardIcons.join('\n ')}`)
        }
    }
}

module.exports = { priority, isAwait, messageHandler }