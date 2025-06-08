const priority = 3;
const isAwait = false
const cmd = ['ping']

async function messageHandler (rem, message, userDb, groupDb, mentionUserDb, clientData) {
    await rem.reply(message.from, `Pong!\nID: BOT_${rem.apiKey}`)
}

module.exports = { priority, isAwait, cmd, messageHandler }