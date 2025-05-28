const { requestToGolangEngine, transformKeysFromCapitalizeToStandartObject } = require('../utils/utils');
const { getNama } = require('../command/profile/functions');

function formatWhatsmeowMessage(apiKey, _userDb, body, messageRaw, botInfo) {
    if (!body || !body.Info || !body.Message) {
        return {};
    }

    let event = body;
    let info = event.Info;
    let msg = event.Message;

    const typeGet = getMessageType(msg)
    if(!typeGet) return 'ignore_type'
    const timeMessage = new Date(info.Timestamp).getTime() / 1000;

    if(info.Sender === 'botNumberAPISended@s.whatsapp.net') {
        return {
            key: {
                remoteJid: info.Chat,
                id: info.ID,
                fromMe: true,
                participant: info.IsGroup ? botInfo?.jid : undefined,
            },
            messageTimestamp: timeMessage,
            status: 'PENDING',
            message: transformKeysFromCapitalizeToStandartObject(msg)
        }
    }

    let formattedMessage = {
        key: {
            remoteJid: info.Chat,
            id: info.ID,
            fromMe: info.IsFromMe,
            participant: info.IsGroup ? info.Sender : undefined,
        },
        messageTimestamp: timeMessage,
        pushName: info.PushName,
        verifiedBizName: info.VerifiedName ? info.VerifiedName?.Details?.verifiedName : undefined,
        t: timeMessage,
        id: info.ID,
        from: info.Chat,
        fromMe: info.IsFromMe,
        chatId: info.Chat,
        isGroupMsg: info.IsGroup,
        isStories: (info.Chat === 'status@broadcast'),
        sender: info.Sender?.split('@')?.[0]?.split(':')?.[0] + '@s.whatsapp.net',
        pushname: getNama(_userDb) || info.PushName,
        timestamp: new Date(info.Timestamp),
        isEphemeralMessage: event.IsEphemeral,
        viewOnce: event.IsViewOnce || event.IsViewOnceV2 || event.IsViewOnceV2Extension,
        type: typeGet,
        isMedia: false,
        mentionedJidList: [],
        quotedMsg: null,
        message: messageRaw || body
    };
    if(formattedMessage.isGroupMsg) {
        formattedMessage.key.participant = info.Sender;
    }
    
    formattedMessage.isMedia = isMediaMessage(formattedMessage.type);

    if (formattedMessage.isMedia) {
        formattedMessage.mimetype = getMimeType(msg, formattedMessage.type);
        formattedMessage.caption = getCaption(msg, formattedMessage.type);
        formattedMessage.duration = getDuration(msg, formattedMessage.type);
        formattedMessage.fileLength = getFileLength(msg, formattedMessage.type);
        formattedMessage.fileSHA256 = getFileSha256(msg, formattedMessage.type);
        formattedMessage.fileEncSHA256 = msg[formattedMessage.type].fileEncSHA256;

        formattedMessage.getMedia = async () => {
            let typeGetApi = ''
            if(typeGet === 'imageMessage' || typeGet === 'stickerMessage') {
                typeGetApi = 'image'
            } else if(typeGet === 'videoMessage') {
                typeGetApi = 'video'
            } else if(typeGet === 'audioMessage') {
                typeGetApi = 'audio'
            } else if(typeGet === 'documentMessage') {
                typeGetApi = 'document'
            } else {
                return null
            }

            let data = {
                apiKey,
                TypeMedia: typeGetApi,
                Url: msg[formattedMessage.type].URL,
                DirectPath: msg[formattedMessage.type].directPath,
                MediaKey: msg[formattedMessage.type].mediaKey,
                Mimetype: formattedMessage.mimetype,
                FileEncSHA256: formattedMessage.fileEncSHA256,
                FileSHA256: formattedMessage.fileSHA256,
                FileLength: formattedMessage.fileLength,
            }
            let response = await requestToGolangEngine('/api/downloadMedia', data);
            const base64 = await response.json();
            const base64ToBuffer = Buffer.from(base64.data.Data.split(',')[1], 'base64');
            return base64ToBuffer;
        };
    }

    // Handle quoted message
    if (msg[formattedMessage.type].contextInfo && msg[formattedMessage.type].contextInfo.quotedMessage) {
        formattedMessage.quotedMsg = formatQuotedMessage(apiKey, msg[formattedMessage.type].contextInfo, info, botInfo);
    }

    formattedMessage.mentionedJidList = getMentionedJids(msg[formattedMessage.type]);
    formattedMessage.body = getMessageBody(msg, formattedMessage.type);

    formattedMessage.reply = (text) => {
        console.log(`Replying to ${formattedMessage.id} with: ${text}`);
    };

    return formattedMessage;
}

function getMessageType(msg) {
    let ignoredTypes = ['messageContextInfo', 'pinInChatMessage', 'protocolMessage', 'scheduledCallEditMessage', 'scheduledCallCreationMessage', 'keepInChatMessage', 'requestPhoneNumberMessage', 'stickerSyncRmrMessage', 'fastRatchetKeySenderKeyDistributionMessage', 'senderKeyDistributionMessage'];
    const lengthObjectKeysMedia = Object.keys(msg).length;

    for(let i = 0; i < lengthObjectKeysMedia; i++) {
        if (ignoredTypes.includes(Object.keys(msg)[i])) {
            continue;
        }
        return Object.keys(msg)[i];
    }
    return '';
}

function isMediaMessage(type) {
    return ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(type);
}

function getMimeType(msg, type) {
    return msg[type] ? msg[type].mimetype : '';
}

function getCaption(msg, type) {
    return msg[type] && msg[type].caption ? msg[type].caption : '';
}

function getDuration(msg, type) {
    return (type === 'audioMessage' || type === 'videoMessage') && msg[type].seconds ? msg[type].seconds : 0;
}

function getFileLength(msg, type) {
    return msg[type] && msg[type].fileLength ? msg[type].fileLength : 0;
}

function getFileSha256(msg, type) {
    return msg[type] && msg[type].fileSHA256 ? msg[type].fileSHA256 : '';
}

function formatQuotedMessage(apiKey, contextInfo, info, botInfo) {
    const quotedMsg = contextInfo.quotedMessage;
    const type = getMessageType(quotedMsg);
    const isMedia = isMediaMessage(type);

    let quotedMsgInfo = {
        type: type,
        id: contextInfo.stanzaID,
        from: info.Chat,
        sender: contextInfo.participant?.split('@')?.[0]?.split(':')?.[0] + '@s.whatsapp.net',
        fromMe: (contextInfo.participant === botInfo?.id) || (contextInfo.participant === botInfo?.jid),
        body: getMessageBody(quotedMsg, type),
        isMedia: isMedia,
        mimetype: getMimeType(quotedMsg, type),
    };
    if(isMedia) {
        quotedMsgInfo.caption = getCaption(quotedMsg, type);
        quotedMsgInfo.duration = getDuration(quotedMsg, type);
        quotedMsgInfo.fileLength = getFileLength(quotedMsg, type);
        quotedMsgInfo.fileSHA256 = getFileSha256(quotedMsg, type);
        quotedMsgInfo.fileEncSHA256 = quotedMsg[type].fileEncSHA256;

        quotedMsgInfo.getMedia = async () => {
            let typeGetApi = ''
            if(type === 'imageMessage' || type === 'stickerMessage') {
                typeGetApi = 'image'
            } else if(type === 'videoMessage') {
                typeGetApi = 'video'
            } else if(type === 'audioMessage') {
                typeGetApi = 'audio'
            } else if(type === 'documentMessage') {
                typeGetApi = 'document'
            } else {
                return null
            }

            let data = {
                apiKey,
                TypeMedia: typeGetApi,
                Url: quotedMsg[type].URL,
                DirectPath: quotedMsg[type].directPath,
                MediaKey: quotedMsg[type].mediaKey,
                Mimetype: quotedMsgInfo.mimetype,
                FileEncSHA256: quotedMsgInfo.fileEncSHA256,
                FileSHA256: quotedMsgInfo.fileSHA256,
                FileLength: quotedMsgInfo.fileLength,
            }
            let response = await requestToGolangEngine('/api/downloadMedia', data);
            const base64 = await response.json();
            const base64ToBuffer = Buffer.from(base64.data.Data.split(',')[1], 'base64');
            return base64ToBuffer;
        };
    }

    return quotedMsgInfo;
}

function getMentionedJids(msgContent) {
    return msgContent.contextInfo && msgContent.contextInfo.mentionedJID 
        ? msgContent.contextInfo.mentionedJID 
        : [];
}

function getMessageBody(msg, type) {
    switch (type) {
        case 'conversation':
            return msg.conversation || '';
        case 'extendedTextMessage':
            return msg.extendedTextMessage.text || '';
        case 'imageMessage':
            return msg[type].caption || '';
        case 'videoMessage':
            return msg[type].caption || '';
        case 'documentMessage':
            return msg[type].caption || '';
        default:
            return msg[type]?.text || msg[type]?.caption || '';
    }
}

module.exports = formatWhatsmeowMessage;