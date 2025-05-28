const priority = 1
const isAwait = false

function messageHandler (rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { args } = clientData

    if (args[0] == 'Cekprefix' || args[0] == 'cekprefix' || args[0] == 'cekPrefix' || args[0].toLowerCase() == 'prefix') {
        if(message.isGroupMsg) {
            rem.reply(message.from, `Prefix Group Ini: *${prefix}*`)
        } else {
            rem.reply(message.from, `Prefix: *${prefix}*`)
        }
    }
}

module.exports = { priority, isAwait, messageHandler }