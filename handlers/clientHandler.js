const fs = require('fs')
const fetch = require('node-fetch')
const snappy = require('snappy')
const PhoneNumber = require('awesome-phonenumber')

const ffmpeg = require('fluent-ffmpeg')
const { requestToGolangEngine, isBase64, buildBase64Data } = require('../utils/utils')

const FileType = require('file-type')

function formatResponseFromGoClient (from, responseData, teks = '') {
    const mapReturnData = {
        key: {
            remoteJid: from,
            fromMe: true,
            id: responseData.data?.Id
        },
        message: {
            extendedTextMessage: { text: teks }
        },
        messageTimestamp: new Date(responseData.data?.Timestamp),
    }
    return mapReturnData
}
const getTypeFile = async (buffer) => {
    const typeFileRaw = await FileType.fromBuffer(buffer);
    if (!typeFileRaw) return null;
    const [type, subtype] = typeFileRaw.mime.split('/');
    return { type, subtype, mime: typeFileRaw.mime };
};

module.exports = (rem, message, user) => {
    async function contacts(jid, _contactDbE) {
        if(!jid.includes('@s.whatsapp.net')) return jid
        const findName = _contactDbE?.name
        if(findName == undefined || findName == null || findName == '') {
            return PhoneNumber(`+${jid.replace('@s.whatsapp.net', '')}`).getNumber('international')
        } else {
            return findName
        }
    }

    // Chat Stuff
    async function reply(from, text) {
        const option = { apiKey: rem, phone: from, body: text, contextInfo: { StanzaId: message.id, Participant: message.sender } }
        const responseData = await requestToGolangEngine('/api/sendMessage', option)
        return formatResponseFromGoClient(from, responseData, text)
    }

    async function sendText(from, text, optionsText = {}, options = {}) {
        const payloadSend = {
            apiKey: rem,
            phone: from,
            body: text
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: options.quoted.id, Participant: options.quoted.sender }
        }
        if(optionsText?.mentions) {
            if(!payloadSend.contextInfo) payloadSend.ContextInfo = {}
            payloadSend.contextInfo.MentionedJID = optionsText.mentions
        }
        const responseData = await requestToGolangEngine('/api/sendMessage', payloadSend)
        return formatResponseFromGoClient(from, responseData, text)
    }

    async function sendTextWithMentions (from, teks, isReply = '') {
        const payloadSend = {
            apiKey: rem,
            phone: from,
            body: teks
        }
        let responseData = undefined
        if(!teks.includes('@')) {
            if(message?.isConsole) return console.log(teks)
        } else {
            let teks2 = teks.replace(/\n/g, " ");
            const testTags = teks2.trim().split(' ')
            let tags = []
            for(let i = 0; i < testTags.length; i++) {
                if(testTags[i].includes('@')) {
                    const testTags2 = testTags[i].replace('@', '') + '@s.whatsapp.net'
                    if(!isNaN(testTags2.split('@')[0])) {
                       tags.push(testTags2)
                    }
                }
            }

            payloadSend.contextInfo = { MentionedJID: tags }
            if(isReply != '') {
                payloadSend.contextInfo.StanzaId = isReply?.id
                payloadSend.contextInfo.Participant = isReply?.sender
            }

            if(message?.isConsole) return console.log(teks)
        }

        responseData = await requestToGolangEngine('/api/sendMessage', payloadSend)
        return formatResponseFromGoClient(from, responseData, teks)
    }

    async function sendFileAuto(from, file, title = '', caption = '', isReply = '', option = {}) {
        const buildPayload = (phone, fileData, typeFileRaw, caption, isReply, secondsDuration) => {
            const payload = {
                apiKey: rem,
                phone,
                body: caption || title,
            };
            if (isReply) {
                payload.contextInfo = { StanzaId: isReply.id, Participant: isReply.sender };
            }
            if(option?.mentions) {
                if(!payload.contextInfo) payload.contextInfo = {}
                payload.contextInfo.MentionedJID = option.mentions
            }
            if(typeFileRaw.type === 'document') {
                payload.filename = title
            }
            // if(secondsDuration) {
            //     payload.Seconds = Math.floor(secondsDuration)
            // }

            payload.mediaType = typeFileRaw.type
            payload.mimetype = typeFileRaw.mime
            if(typeFileRaw.type === 'image' || typeFileRaw.type === 'video' || typeFileRaw.type === 'audio' || typeFileRaw.type === 'document') {
                payload.media = fileData;
            } else if(typeFileRaw.type === 'sticker') {
                payload.sticker = fileData;
            }

            return payload;
        };
    
        const sendMessage = async (buffer) => {
            const typeFileRaw = await getTypeFile(buffer);
            let fileData, endpoint;
    
            let typeFile = ''
            let secondsDuration = 0
            if (typeFileRaw) {
                fileData = undefined
                switch (typeFileRaw.type) {
                    case 'image':
                        // if webp
                        if(typeFileRaw.mime === 'image/webp') {
                            typeFile = 'sticker'
                            fileData = buildBase64Data(typeFileRaw.mime, buffer);
                            endpoint = '/api/sendStickerMessage';
                        } else {
                            typeFile = 'image'
                            fileData = buildBase64Data(typeFileRaw.mime, buffer);
                            endpoint = '/api/sendMedia';
                        }
                        break;
                    case 'video':
                        typeFile = 'video'
                        fileData = buildBase64Data(typeFileRaw.mime, buffer);
                        endpoint = '/api/sendMedia';
                        break;
                    case 'audio':
                        // convert to this ffmpeg -i yourinput -ac 1 -ar 16000 -c:a libopus voicemessage.ogg with buffer result without save file
                        const tmpFolderLocation = `./lib/cache/ffmpeg`
                        const tmpFileLocation = `${tmpFolderLocation}/${Date.now()}.mp3`
                        if(!fs.existsSync(tmpFolderLocation)) fs.mkdirSync(tmpFolderLocation, { recursive: true })
                        fs.writeFileSync(tmpFileLocation, buffer)

                        const resultFileLocation = `${tmpFolderLocation}/result_${Date.now()}.ogg`
                        const promiseFfmpeg = new Promise((resolve, reject) => {
                            ffmpeg(tmpFileLocation)
                                .audioChannels(1)
                                .audioFrequency(16000)
                                .audioCodec('libopus')
                                .format('ogg')
                                .on('end', () => {
                                    resolve()
                                })
                                .on('error', (err) => {
                                    reject(err)
                                })
                                .pipe(fs.createWriteStream(resultFileLocation))
                        })
                        const getSecondsAudio = new Promise((resolve, reject) => {
                            ffmpeg.ffprobe(tmpFileLocation, (err, metadata) => {
                                if(err) reject(err)
                                resolve(metadata.format.duration)
                            })
                        })
                        secondsDuration = await getSecondsAudio
                        await promiseFfmpeg

                        buffer = fs.readFileSync(resultFileLocation)
                        fs.unlinkSync(tmpFileLocation)
                        fs.unlinkSync(resultFileLocation)
                        
                        typeFile = 'audio'
                        fileData = buildBase64Data('audio/ogg', buffer);
                        endpoint = '/api/sendMedia';
                        break;
                    default:
                        // Fallback to document if the type is not handled
                        typeFile = 'document'
                        fileData = buildBase64Data('application/octet-stream', buffer);
                        endpoint = '/api/sendMedia';
                }
            } else {
                // Fallback to sending as document when type is not detected
                typeFile = 'document'
                fileData = buildBase64Data('application/octet-stream', buffer);
                endpoint = '/api/sendMedia';
            }
    
            const payload = buildPayload(from, fileData, { type: typeFile, mime: typeFileRaw.mime }, caption, isReply, secondsDuration);
            const requestData = await requestToGolangEngine(endpoint, payload)
            return formatResponseFromGoClient(from, requestData, caption)
        };
    
        // Handle URL-based file, base64 string, and buffer data
        if (file?.url) {
            const response = await fetch(file.url);
            const buffer = await response.buffer();
            return await sendMessage(buffer);
        } else if (Buffer.isBuffer(file) || isBase64(file)) {
            const buffer = isBase64(file) ? Buffer.from(file, 'base64') : file;
            return await sendMessage(buffer);
        } else if (file.startsWith('https://') || file.startsWith('http://')) {
            const response = await fetch(file);
            const buffer = await response.buffer();
            return await sendMessage(buffer);
        } else {
            const buffer = await fs.readFileSync(file);
            return await sendMessage(buffer);
        }
    }

    async function sendFile(from, file, title = '', caption = '', isReply = '', type = '', mimetype = '', option = {}) {
        const buildPayload = (phone, fileData, typeFileRaw, caption, isReply, secondsDuration) => {
            const payload = {
                apiKey: rem,
                phone,
                body: caption || title,
            };
            if (isReply) {
                payload.contextInfo = { StanzaId: isReply.id, Participant: isReply.sender };
            }
            if(option?.mentions) {
                if(!payload.contextInfo) payload.contextInfo = {}
                payload.contextInfo.MentionedJID = option.mentions
            }
            if(typeFileRaw.type === 'document') {
                payload.filename = title
            }
            // if(secondsDuration) {
            //     payload.Seconds = Math.floor(secondsDuration)
            // }

            payload.mediaType = typeFileRaw.type
            payload.mimetype = typeFileRaw.mime
            if(typeFileRaw.type === 'image' || typeFileRaw.type === 'video' || typeFileRaw.type === 'audio' || typeFileRaw.type === 'document') {
                payload.media = fileData;
            } else if(typeFileRaw.type === 'sticker') {
                payload.sticker = fileData;
            }

            return payload;
        };

        const sendMessage = async (buffer) => {
            let fileData, endpoint;
            let typeFile = type || 'document'; // Use provided type or fallback to document
            let mimeType = mimetype || 'application/octet-stream'; // Use provided mimetype or fallback
            let secondsDuration = 0;

            // Handle audio conversion if type is audio
            if (typeFile === 'audio') {
                const tmpFolderLocation = `./lib/cache/ffmpeg`
                const tmpFileLocation = `${tmpFolderLocation}/${Date.now()}.mp3`
                if(!fs.existsSync(tmpFolderLocation)) fs.mkdirSync(tmpFolderLocation, { recursive: true })
                fs.writeFileSync(tmpFileLocation, buffer)

                const resultFileLocation = `${tmpFolderLocation}/result_${Date.now()}.ogg`
                const promiseFfmpeg = new Promise((resolve, reject) => {
                    ffmpeg(tmpFileLocation)
                        .audioChannels(1)
                        .audioFrequency(16000)
                        .audioCodec('libopus')
                        .format('ogg')
                        .on('end', () => {
                            resolve()
                        })
                        .on('error', (err) => {
                            reject(err)
                        })
                        .pipe(fs.createWriteStream(resultFileLocation))
                })
                const getSecondsAudio = new Promise((resolve, reject) => {
                    ffmpeg.ffprobe(tmpFileLocation, (err, metadata) => {
                        if(err) reject(err)
                        resolve(metadata.format.duration)
                    })
                })
                secondsDuration = await getSecondsAudio
                await promiseFfmpeg

                buffer = fs.readFileSync(resultFileLocation)
                fs.unlinkSync(tmpFileLocation)
                fs.unlinkSync(resultFileLocation)
                
                mimeType = 'audio/ogg'
            }

            // Determine endpoint based on type
            switch (typeFile) {
                case 'sticker':
                    fileData = buildBase64Data(mimeType, buffer);
                    endpoint = '/api/sendStickerMessage';
                    break;
                default:
                    fileData = buildBase64Data(mimeType, buffer);
                    endpoint = '/api/sendMedia';
            }

            const payload = buildPayload(from, fileData, { type: typeFile, mime: mimeType }, caption, isReply, secondsDuration);
            const requestData = await requestToGolangEngine(endpoint, payload)
            return formatResponseFromGoClient(from, requestData, caption)
        };

        // Handle URL-based file, base64 string, and buffer data
        if (file?.url) {
            const response = await fetch(file.url);
            const buffer = await response.buffer();
            return await sendMessage(buffer);
        } else if (Buffer.isBuffer(file) || isBase64(file)) {
            const buffer = isBase64(file) ? Buffer.from(file, 'base64') : file;
            return await sendMessage(buffer);
        } else if (file.startsWith('https://') || file.startsWith('http://')) {
            const response = await fetch(file);
            const buffer = await response.buffer();
            return await sendMessage(buffer);
        } else {
            const buffer = await fs.readFileSync(file);
            return await sendMessage(buffer);
        }
    }
            

    async function sendButtons (from, body, button, header = '', footer = '', options = {}, optionsText = {}, getMetadata = false, isSendNewButton = true) {
        if(message?.isConsole) return console.log('unsupported format | buttons')

        let arrayButton = button
        const textId = `${arrayButton.map((button) => button.id).join('|r|')}`
        const idMetadata = snappy.compressSync(textId)
        const textBodyButtons = `${body}\n\n${arrayButton.map((button, i) => `${i + 1}. ${button.text}`).join('\n')}\n\nmetadata:${Buffer.from(idMetadata).toString('base64')}`
        if(getMetadata) return textBodyButtons

        const payloadSend = {
            apiKey: rem,
            phone: from,
            body: textBodyButtons,
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: options.quoted.id, Participant: options.quoted.sender }
        }
        if(optionsText?.mentions) {
            if(!payloadSend.contextInfo) payloadSend.contextInfo = {}
            payloadSend.contextInfo.MentionedJID = optionsText.mentions
        }
        const responseData = await requestToGolangEngine('/api/sendMessage', payloadSend)
        return formatResponseFromGoClient(from, responseData, textBodyButtons)
    }

    async function sendList (from, body, button, header = '', footer = '', options = {}, optionsText = {}) {
        if(message?.isConsole) return console.log('unsupported format | listButtons')

        let arraySections = button

        let textFormat = ''
        let idButtonFormat = ''
        let countNumber = 1
        for(let i = 0; i < arraySections.length; i++) {
            let insideRow = `\n*${arraySections[i].title}*`
            let idInsideRow = ''
            for(let j = 0; j < arraySections[i].rows.length; j++) {
                insideRow += `\n   ${countNumber}. ${arraySections[i].rows[j].title}`
                idInsideRow += `${arraySections[i].rows[j].rowId}|r|`
                countNumber++
            }
            textFormat += insideRow
            idButtonFormat += idInsideRow
        }
    
        const idMetadata = snappy.compressSync(idButtonFormat)
        const textBodyButtons = `--${header}--\n\n${body}\n${textFormat}\n\nlmeta:${Buffer.from(idMetadata).toString('base64')}`

        const payloadSend = {
            apiKey: rem,
            phone: from,
            body: textBodyButtons,
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: options.quoted.id, Participant: options.quoted.sender }
        }
        if(optionsText?.mentions) {
            if(!payloadSend.contextInfo) payloadSend.contextInfo = {}
            payloadSend.contextInfo.MentionedJID = optionsText.mentions
        }
        const responseData = await requestToGolangEngine('/api/sendMessage', payloadSend)
        return formatResponseFromGoClient(from, responseData, textBodyButtons)
    }
    
    async function sendButtonsImage (from, body, imageFile, button, header = '', footer = '', options = {}) {
        if(message?.isConsole) return console.log('unsupported format | buttonsImage')

        let imageFileFilter = undefined
        let imageTypeButton = undefined
        if(Buffer.isBuffer(imageFile)) {
            // to base64
            imageTypeButton = await getTypeFile(imageFile)
            imageFileFilter = imageFile.toString('base64')
        } else if(imageFile.startsWith('https://') || imageFile.startsWith('http://')) {
            var response = await fetch(imageFile)
            // to base64
            const bufferResponse = await response.buffer()
            imageTypeButton = await getTypeFile(bufferResponse)
            imageFileFilter = bufferResponse.toString('base64')
        } else if(isBase64(imageFile)) {
            imageFileFilter = imageFile

            const bufferResponse = Buffer.from(imageFile, 'base64')
            imageTypeButton = await getTypeFile(bufferResponse)
        } else {
            const fsBuffer = fs.readFileSync(imageFile)
            imageTypeButton = await getTypeFile(fsBuffer)
            imageFileFilter = fsBuffer.toString('base64')
        }

        imageFileFilter = `data:${imageTypeButton.mime};base64,${imageFileFilter}`

        let arrayButton = button
    
        const textId = `${arrayButton.map((button) => button.id).join('|r|')}`
        const idMetadata = snappy.compressSync(textId)
        const textBodyButtons = `${body}\n\n${arrayButton.map((button, i) => `${i + 1}. ${button.text}`).join('\n')}\n\nmetadata:${Buffer.from(idMetadata).toString('base64')}`
        
        const payloadSend = {
            apiKey: rem,
            phone: from,
            body: textBodyButtons,
            media: imageFileFilter,
            mediaType: imageTypeButton.type,
            mimetype: imageTypeButton.mime
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: options.quoted.id, Participant: options.quoted.sender }
        }
        const responseData = await requestToGolangEngine('/api/sendMedia', payloadSend)
        return formatResponseFromGoClient(from, responseData, textBodyButtons)
    }

    // async function sendReact(from, key, reaction) {
    //     if(message?.isConsole) return console.log('unsupported format | sendReact')

    //     const payloadSend = {
    //         Phone: from,
    //         Body: reaction,
    //         Id: key?.id || key
    //     }
    //     const responseData = await axios.post(`${process.env.CLIENT_GOLANG_URL}/chat/react`, payloadSend, { headers: { Token: rem } })
    //     return formatResponseFromGoClient(from, responseData)
    // }

    async function sendContact(from, name, vcard, options = {}) {
        if(message?.isConsole) return console.log('unsupported format | sendContact')

        const payloadSend = {
            apiKey: rem,
            phone: from,
            name: name,
            vcard: vcard,
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: options.quoted.id, Participant: options.quoted.sender }
        }
        const responseData = await requestToGolangEngine('/api/sendContact', payloadSend)
        return formatResponseFromGoClient(from, responseData)
    }

    async function sendEditMessage (from, key, text, optionsText = {}, options = {}) {
        if(message?.isConsole) return console.log('unsupported format | editMessage')

        const payloadSend = {
            apiKey: rem,
            phone: from,
            id: key?.id ? key.id : key,
            body: text
        }
        if(options?.quoted) {
            payloadSend.contextInfo = { StanzaId: optionsText.quoted.id, Participant: optionsText.quoted.sender }
        }
        if(optionsText?.mentions) {
            if(!payloadSend.contextInfo) payloadSend.contextInfo = {}
            payloadSend.contextInfo.MentionedJID = optionsText.mentions
        }

        const responseData = await requestToGolangEngine('/api/sendMessage', payloadSend)
        return formatResponseFromGoClient(from, responseData, text)
    }

    async function deleteMessage (from, payload) {
        if(message?.isConsole) return console.log('unsupported format | deleteMessage')

        let payloadSend = {}
        let endpointDel = '/api/deleteMessageById'
        if(payload.fromMe) {
            payloadSend = {
                apiKey: rem,
                phone: from,
                idMessage: payload.key.id,
                participant: payload.fromMe ? global.listBot[rem].user.jid : (from || payload.key.participant),
            }
        } else {
            payloadSend = {
                apiKey: rem,
                idMessage: payload.key.id,
                timestamp: payload.key.timestamp,
                isFromMe: payload.fromMe,
                chat: from,
                sender: payload.fromMe ? global.listBot[rem].user.jid : (from || payload.key.participant),
            }
            endpointDel = '/api/deleteMessageByIdForMe'
        }

        const responseData = await requestToGolangEngine(endpointDel, payloadSend)
        return formatResponseFromGoClient(from, responseData)
    }

    // async function readMessages (payload) {
    //     if(message?.isConsole) return console.log('unsupported format | readMessages')

    //     const from = payload.remoteJid
    //     let payloadSend = {}
    //     if(payload.fromMe != undefined) {
    //         payloadSend = {
    //             Chat: from,
    //             Sender: payload.participant || from,
    //             Id: Array.isArray(payload.id) ? payload.id : [payload.id]
    //         }
    //     } else {
    //         payloadSend = {
    //             Chat: from,
    //             Sender: payload.key.participant || from,
    //             Id: Array.isArray(payload.key.id) ? payload.key.id : [payload.key.id]
    //         }
    //     }

    //     const responseData = await axios.post(`${process.env.CLIENT_GOLANG_URL}/chat/markread`, payloadSend, { headers: { Token: rem } })
    //     return true
    // }

    // Group Stuff
    async function groupMetadata(from) {
        if(message?.isConsole) return console.log('unsupported format | groupMetadata')

        const payloadSend = {
            groupJID: from
        }
        const responseData = await requestToGolangEngine('/api/getInfoGroup', payloadSend)
        const formattedData = {
            id: responseData.data.GroupInfo?.JID,
            subject: responseData.data.GroupInfo?.Name,
            subjectOwner: responseData.data.GroupInfo?.NameSetBy,
            subjectTime: responseData.data.GroupInfo?.NameSetAt,
            size: responseData.data.GroupInfo?.Participants.length,
            creation: responseData.data.GroupInfo?.GroupCreated,
            owner: responseData.data.GroupInfo?.OwnerJID,
            desc: responseData.data.GroupInfo?.Topic,
            descId: responseData.data.GroupInfo?.TopicID,
            linkedParent: responseData.data.GroupInfo?.LinkedParentJID,
            restrict: responseData.data.GroupInfo?.IsLocked,
            announce: responseData.data.GroupInfo?.IsAnnounce,
            isCommunity: responseData.data.GroupInfo?.IsDefaultSubGroup,
            isCommunityAnnounce: responseData.data.GroupInfo?.IsAnnounce,
            joinApprovalMode: responseData.data.GroupInfo?.MemberAddMode,
            memberAddMode: responseData.data.GroupInfo?.MemberAddMode,
            participants: responseData.data.GroupInfo?.Participants.map((participant) => ({ id: participant.JID, admin: participant.IsAdmin ? 'admin' : null })),
            ephemeralDuration: responseData.data.GroupInfo?.DisappearingTimer
        }
        return formattedData
    }

    async function groupAcceptInvite(code) {
        if(message?.isConsole) return console.log('unsupported format | groupAcceptInvite')

        const payloadSend = {
            apiKey: rem,
            code: code
        }
        await requestToGolangEngine('/api/acceptInviteGroup', payloadSend)
        return true
    }

    async function groupInviteCode(from) {
        if(message?.isConsole) return console.log('unsupported format | groupInviteCode')

        const payloadSend = {
            apiKey: rem,
            groupJID: from,
            revoke: false
        }
        const responseData = await requestToGolangEngine('/api/getInviteLinkGroup', payloadSend)
        return responseData.data?.InviteLink.split('/')[3]
    }

    async function groupGetInviteInfo(code) {
        if(message?.isConsole) return console.log('unsupported format | groupGetInviteInfo')

        const payloadSend = {
            apiKey: rem,
            code: code
        }
        const responseData = await requestToGolangEngine('/api/getInviteInfoGroup', payloadSend)
        const formattedData = {
            id: responseData.data.GroupInfo?.JID,
            subject: responseData.data.GroupInfo?.Name,
            subjectOwner: responseData.data.GroupInfo?.NameSetBy,
            subjectTime: responseData.data.GroupInfo?.NameSetAt,
            size: responseData.data.GroupInfo?.Participants.length,
            creation: responseData.data.GroupInfo?.GroupCreated,
            owner: responseData.data.GroupInfo?.OwnerJID,
            desc: responseData.data.GroupInfo?.Topic,
            descId: responseData.data.GroupInfo?.TopicID,
            linkedParent: responseData.data.GroupInfo?.LinkedParentJID,
            restrict: responseData.data.GroupInfo?.IsLocked,
            announce: responseData.data.GroupInfo?.IsAnnounce,
            isCommunity: responseData.data.GroupInfo?.IsDefaultSubGroup,
            isCommunityAnnounce: responseData.data.GroupInfo?.IsAnnounce,
            joinApprovalMode: responseData.data.GroupInfo?.MemberAddMode,
            memberAddMode: responseData.data.GroupInfo?.MemberAddMode,
            participants: responseData.data.GroupInfo?.Participants.map((participant) => ({ id: participant.JID, admin: participant.IsAdmin ? 'admin' : null })),
            ephemeralDuration: responseData.data.GroupInfo?.DisappearingTimer
        }
        return formattedData
    }

    async function groupRevokeInvite(from) {
        if(message?.isConsole) return console.log('unsupported format | groupRevokeInvite')

        const payloadSend = {
            apiKey: rem,
            groupJID: from,
            revoke: true
        }
        await requestToGolangEngine('/api/getInviteLinkGroup', payloadSend)
        return true
    }

    async function groupParticipantsUpdate(from, participants, action) {
        if(message?.isConsole) return console.log('unsupported format | groupParticipantsUpdate')

        const payloadSend = {
            apiKey: rem,
            groupJID: from,
            phone: Array.isArray(participants) ? participants : [participants],
            action: action
        }
        await requestToGolangEngine('/api/updateParticipantsGroup', payloadSend)
        return true
    }

    // async function groupSettingUpdate(from, value) {
    //     if(message?.isConsole) return console.log('unsupported format | groupSettingUpdate')

    //     const payloadSend = {
    //         groupJID: from,
    //         Announce: value === 'announcement' ? true : false,
    //     }
    //     await axios.post(`${process.env.CLIENT_GOLANG_URL}/group/announce`, payloadSend, { headers: { Token: rem } })
    //     return true
    // }

    async function groupUpdateSubject(from, subject) {
        if(message?.isConsole) return console.log('unsupported format | groupUpdateSubject')

        const payloadSend = {
            apiKey: rem,
            groupJID: from,
            name: subject
        }
        await requestToGolangEngine('/api/changeNameGroup', payloadSend)
        return true
    }

    async function groupUpdateDescription(from, desc) {
        if(message?.isConsole) return console.log('unsupported format | groupUpdateDescription')

        const payloadSend = {
            apiKey: rem,
            groupJID: from,
            desc: desc
        }
        await requestToGolangEngine('/api/changeDescriptionGroup', payloadSend)
        return true
    }

    // async function updateProfilePicture(from, image) {
    //     if(message?.isConsole) return console.log('unsupported format | updateProfilePicture')

    //     const payloadSend = {
    //         groupJID: from,
    //         Image: image.toString('base64')
    //     }
    //     await axios.post(`${process.env.CLIENT_GOLANG_URL}/group/photo`, payloadSend, { headers: { Token: rem } })
    //     return true
    // }

    // get all group list
    async function groupFetchAllParticipating() {
        if(message?.isConsole) return console.log('unsupported format | groupFetchAllParticipating')

        const responseData = await requestToGolangEngine('/api/getListGroup', { apiKey: rem })
        const formattedData = responseData?.data?.GroupList.map((item) => {
			return {
				id: item.JID,
				subject: item.Name,
				size: item.Participants.length,
				creation: item.GroupCreated,
				owner: item.OwnerJID,
				desc: item.Topic,
				descId: item.TopicID,
				restrict: item.IsLocked,
				announce: item.IsAnnounce,
				isCommunity: item.IsDefaultSubGroup,
				isCommunityAnnounce: item.IsAnnounce,
				joinApprovalMode: item.MemberAddMode,
				memberAddMode: item.MemberAddMode,
				participants: item.Participants.map((participant) => ({ id: participant.JID, admin: participant.IsAdmin ? 'admin' : null })),
				ephemeralDuration: item.DisappearingTimer
			}
		})
        return formattedData
    }

    // leave group
    async function groupLeave(from) {
        if(message?.isConsole) return console.log('unsupported format | groupLeave')

        const payloadSend = {
            apiKey: rem,
            groupJID: from
        }
        await requestToGolangEngine('/api/leaveGroup', payloadSend)
        return true
    }

    // Avatar Stuff
    async function profilePictureUrl(from, hd = false) {
        if(message?.isConsole) return console.log('unsupported format | profilePictureUrl')

        const payloadSend = {
            phone: from,
            preview: !hd
        }
        const responseData = await requestToGolangEngine('/api/getProfilePicUrl', payloadSend)
        return responseData?.data?.ProfilePicURL || 'https://i.ibb.co.com/2YBMbtd/images-pp-blank.png'
    }

    // User Stuff
    // async function fetchStatus(from) {
    //     if(message?.isConsole) return console.log('unsupported format | fetchStatus')

    //     const payloadSend = {
    //         Phone: Array.isArray(from) ? from : [from]
    //     }
    //     const responseData = await axios.post(`${process.env.CLIENT_GOLANG_URL}/user/info`, payloadSend, { headers: { Token: rem } })
    //     return responseData.data?.data?.Users
    // }

    async function onWhatsApp(from) {
        if(message?.isConsole) return console.log('unsupported format | onWhatsApp')
        let checkPhone = Array.isArray(from) ? from : [from]
        let resultCheck = []

        for (let i = 0; i < checkPhone.length; i++) {
            const payloadSend = {
                apiKey: rem,
                phone: checkPhone[i]
            }
            const responseData = await requestToGolangEngine('/api/checkUser', payloadSend)
            if(responseData?.data?.IsRegistered?.[0]) {
                resultCheck.push({ exists: responseData?.data?.IsRegistered?.[0]?.IsIn, jid: responseData?.data?.IsRegistered?.[0]?.JID })
		    }
        }
        return resultCheck
    }

    // async function sendPresenceUpdate(type, from) {
    //     if(message?.isConsole) return console.log('unsupported format | sendPresenceUpdate')

    //     const payloadSend = {
    //         Phone: from,
    //         State: type
    //     }
    //     await axios.post(`${process.env.CLIENT_GOLANG_URL}/chat/presence`, payloadSend, { headers: { Token: rem } })
    //     return true
    // }

    return {
        apiKey: rem,
        contacts,
        reply,
        sendText,
        sendTextWithMentions,
        sendFileAuto,
        sendFile,
        sendButtons,
        sendList,
        sendButtonsImage,
        sendReact,
        sendContact,
        sendEditMessage,
        deleteMessage,
        readMessages,
        groupMetadata,
        groupAcceptInvite,
        groupInviteCode,
        groupGetInviteInfo,
        groupRevokeInvite,
        groupParticipantsUpdate,
        groupSettingUpdate,
        groupUpdateSubject,
        groupUpdateDescription,
        updateProfilePicture,
        groupFetchAllParticipating,
        groupLeave,
        profilePictureUrl,
        fetchStatus,
        onWhatsApp,
        sendPresenceUpdate,
        user
    }
}