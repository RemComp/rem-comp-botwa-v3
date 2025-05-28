const priority = 3;
const isAwait = false
const cmd = ['ping']

async function messageHandler (rem, message, args, isSenderAdmin, isBotAdmin) {
    return rem.reply(message, { text: `Pong!\nID: BOT_${rem.apiKey}` })
}

module.exports = { priority, isAwait, cmd, messageHandler }