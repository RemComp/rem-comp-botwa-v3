const priority = 2
const isAwait = true

async function messageHandler (rem, message, _userDb, _groupDb, _mentionUserDb, clientData) {
    const { isBotGroupAdmins } = clientData
    if(!message.isGroupMsg || !message.from || !message.sender) return
    if(!_groupDb?.isAntiLink) return
    if(!isBotGroupAdmins || message.type === 'stickerMessage') return
    if(!message.body || !message.body.includes('chat.whatsapp.com/')) return

    const filterLinkGroup = 'https://chat.whatsapp.com/' + message.body.split('chat.whatsapp.com/')?.[1]?.split(' ')?.[0]

    const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i
    const [_, code] = filterLinkGroup.match(linkRegex) || []
    let checkSenderLink = undefined
    try {
        checkSenderLink = await rem.groupGetInviteInfo(code) || { size: 10 }
    } catch (err) {
        global.logger.error('Error checking group link:', err)
    }

    let checkGroupLink = undefined
    try {
        checkGroupLink = await rem.groupInviteCode(message.from)
    } catch (err) {
        global.logger.error('Error checking group link:', err)
    }
    
    if(checkSenderLink != undefined) {
        if(checkGroupLink != undefined) {
            if(checkGroupLink != code) {
                rem.reply(message.from, `*「 GROUP LINK DETECTOR 」*\nKamu mengirimkan link grup chat, maaf kamu di kick dari grup :(`).then(() => {
                    rem.deleteMessage(message.from, { id: message.id, remoteJid: message.from, fromMe: message.key.fromMe, participant : message.key.participant } )
                    rem.groupParticipantsUpdate(message.from, [message.sender], "remove")
                })
            }
        } else {
            rem.reply(message.from, `*「 GROUP LINK DETECTOR 」*\nKamu mengirimkan link grup chat, maaf kamu di kick dari grup :(`).then(() => {
                rem.groupParticipantsUpdate(message.from, [message.sender], "remove")
            })
        }
        return 'break'
    }
}

module.exports = { priority, isAwait, messageHandler }