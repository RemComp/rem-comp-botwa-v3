const qr = require('qrcode')
const snappy = require('snappy')

const { sleep, requestToGolangEngine, formatRequiredDataClient } = require('../utils/utils')
const { _mongo_JadibotDeviceSchema, _mongo_GroupSchema, _mongo_UserSchema, _mongo_ContactSchema, initGroupDb, initUserDb } = require('../lib/database')
const clientHandler = require('./clientHandler')
const messagesBeautify = require('./messages-beautify_whatsmeow')

let listIntervalQrBulkEvent = {}
let listRunningDevice = []
const listIgnoreMessageType = ['reactionMessage', 'messageContextInfo', 'pinInChatMessage', 'protocolMessage', 'scheduledCallEditMessage', 'scheduledCallCreationMessage', 'keepInChatMessage', 'requestPhoneNumberMessage', 'stickerSyncRmrMessage', 'fastRatchetKeySenderKeyDistributionMessage', 'senderKeyDistributionMessage']
const disconnReasonParser = {
	[500]: 'bad_session',
	[428]: 'connection_closed',
	[408]: 'connection_lost',
	[440]: 'connection_conflict',
	[401]: 'connection_logout',
	[411]: 'not_multidevice',
	[515]: 'connection_reconnect',
	[408]: 'connection_timedout',
	[403]: 'connection_banned',
	[402]: 'connection_banned_temp'
}

global.listBot = {}
async function handleWebhookGolangEngine(payload) {
    if(!global.listBot?.[0]) await sleep(1000)

    let { apiKey, type, data, media, mediaKey, pollContent, pollVoteFiltered } = payload
    global.log.info(`[${apiKey}] Received webhook event: ${type} with data: ${JSON.stringify(data)}`)
    let isChangeState = false
    let isChangedData = {}
    let codeCloseConnection = undefined

    let dataJadibot = payload?.apiKey ? await _mongo_JadibotDeviceSchema.findOne({ apiKey: payload.apiKey }) : null
    if(payload?.apiKey && !dataJadibot) {
        global.log.error(`[${apiKey}] Error: apiKey not found in database, deleting device...`)
        stopBot(apiKey, true, true)
        return
    }
    let rem = payload?.apiKey ? clientHandler(apiKey, {}) : null
    let remSourceJadibot = null
    if(dataJadibot?.sourceJadibotApiKey) {
        remSourceJadibot = clientHandler(dataJadibot?.sourceJadibotApiKey, {})
    }
    if(payload?.apiKey && !global.listBot[apiKey]) await syncDataDevice()
    if(payload?.apiKey && !global.listBot[apiKey]) {
        global.log.error(`[${apiKey}] Error: apiKey not found in global.listBot`)
        return
    }

    switch(type) {
        case 'client_start':
		case 'client_newlogin':
		case 'client_relogin':
            isChangeState = 1
            isChangedData.stateStatus = 1
            isChangedData.reasonDisconnected = null

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* received event start...`)
            }
            break
        case 'client_error_newlogin':
		case 'client_error_relogin':
            isChangeState = 0
            isChangedData.stateStatus = 0
            isChangedData.reasonDisconnected = 'client_error_newlogin'
            if(dataJadibot?.stateStatus === 1) {
                startBot(apiKey, global.listBot[apiKey].nameDevice)
            }
            break
        case 'qr_bulk_event':
            isChangeState = 2
            isChangedData.stateStatus = 2
            isChangedData.reasonDisconnected = null

            if(listIntervalQrBulkEvent[apiKey]) {
				clearInterval(listIntervalQrBulkEvent[apiKey])
				listIntervalQrBulkEvent[apiKey] = null
			}

            let alreadyClosed = false
            async function sendQrBulkData(pos = 0) {
				if(pos == data.length) return

                dataJadibot = await _mongo_JadibotDeviceSchema.findOne({ apiKey: apiKey })
                if(!dataJadibot || (dataJadibot?.stateStatus === 3) || (dataJadibot?.stateStatus === 0)) return data = []
				if((dataJadibot?.settings?.pairMethod === 'code') && (pos === 0)) {
					if(!dataJadibot?.settings?.numberHp) {
						global.log.error(`[${apiKey}] Error: numberHp not found`)

                        isChangeState = 0
                        isChangedData.stateStatus = 0
                        isChangedData.reasonDisconnected = 'pair_phone-numberHp_not_found'
                        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                        data = []
						stopBot(apiKey)
                        alreadyClosed = true
                        return
					}

                    const requestPairCode = await requestToGolangEngine('/session/pairphone', {
                        apiKey: apiKey,
                        phone: dataJadibot?.settings?.numberHp,
                    })
                    if(requestPairCode.error) {
                        isChangeState = 0
                        isChangedData.stateStatus = 0
                        isChangedData.reasonDisconnected = 'pair_phone-' + requestPairCode.error
                        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                        global.log.error(`[${apiKey}] Error pair phone:`, requestPairCode.error, requestPairCode.message)
                        data = []
                        stopBot(apiKey)
                        alreadyClosed = true
                        return
                    }

                    try {
                        const base64ToText = JSON.parse(Buffer.from(requestPairCode.data, 'base64').toString('utf-8'))

                        isChangedData.scan = {
                            type: 'code',
                            code: base64ToText.LinkingCode,
                        }
                        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                        if(dataJadibot?.sourceJadibotApiKey) {
                            remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is pairing with phone number *${dataJadibot?.settings?.numberHp}*.\n\n*Pair Code:* ${base64ToText.LinkingCode}`)
                        }
                    } catch(e) {
                        global.log.error(`[${apiKey}] Error parse base64 to text:`, e)

                        isChangeState = 0
                        isChangedData.stateStatus = 0
                        isChangedData.reasonDisconnected = 'pair_phone-parse_base64_to_text_error'
                        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                        data = []
                        stopBot(apiKey)
                        alreadyClosed = true
                        return
                    }
				} else if((dataJadibot?.settings?.pairMethod === 'qr')) {
                    qr.toBuffer(data[pos], { type: 'png' }, async function (err, url) {
                        if(err) {
                            global.log.error(`[${apiKey}] Error generating QR code:`, err)

                            isChangeState = 0
                            isChangedData.stateStatus = 0
                            isChangedData.reasonDisconnected = 'pair_qr-' + err.message
                            await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                            data = []
                            stopBot(apiKey)
                            alreadyClosed = true
                            return
                        }

                        isChangedData.scan = {
                            type: 'qr',
                            code: data[pos],
                        }
                        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })

                        if(dataJadibot?.sourceJadibotApiKey) {
                            remSourceJadibot.sendFile(dataJadibot?.ownerJadibotPhone, url, '', 'Scan QR Code', '', 'image')
                        }
                    })
				}
			}

            if(!dataJadibot.ownerJadibotPhone) { // if scan but sourceJadibotApiKey or ownerJadibotPhone not found
                global.log.error(`[${apiKey}] Error: ownerJadibotPhone not found, stopping bot...`)
                return stopBot(apiKey)
            }

			sendQrBulkData()
			if(data.length > 1) {
				let posCurrent = 1
				listIntervalQrBulkEvent[apiKey] = setInterval(() => {
					if((posCurrent == data.length) || !data[posCurrent]) {
						clearInterval(listIntervalQrBulkEvent[apiKey])
						listIntervalQrBulkEvent[apiKey] = null
						if(!alreadyClosed) stopBot(apiKey)
						return
					}
					sendQrBulkData(posCurrent)
					posCurrent++
				}, 30_000)
			}
            break
        case 'qr_success':
            isChangeState = 3

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is successfully paired.`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined
                
                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'PairSuccess':
            if(data.jid) {
                global.listBot[apiKey].jid = data.jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
                global.listBot[apiKey].user = { id: data.jid, jid: global.listBot[apiKey].jid }

                isChangedData.user = global.listBot[apiKey].user
			}

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is successfully paired with JID: ${global.listBot[apiKey].user?.id}`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined
                
                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'Connected':
            isChangeState = 3
            if(data.JID) {
                global.listBot[apiKey].jid = data.JID.split('@')[0].split(':')[0] + '@s.whatsapp.net'
                global.listBot[apiKey].user = { id: data.JID, jid: global.listBot[apiKey].jid }

                isChangedData.user = global.listBot[apiKey].user
			}

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is connected with JID: ${global.listBot[apiKey].user?.id}`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined

                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'ConnectFailure':
            isChangeState = 0
            isChangedData.reasonDisconnected = disconnReasonParser[Number(data.Reason)]
            codeCloseConnection = Number(data.Reason)

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* failed to connect with reason: ${isChangedData.reasonDisconnected}`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined

                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'TemporaryBan':
            isChangeState = 0
            isChangedData.reasonDisconnected = disconnReasonParser[402]
            codeCloseConnection = 402

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is temporarily banned, please wait until the ban is lifted.`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined

                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'Disconnected':
		case 'client_disconnect':
            isChangeState = 0

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is disconnected.`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined

                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'LoggedOut':
            isChangeState = 0
            isChangedData.reasonDisconnected = disconnReasonParser[Number(data.Reason)]
            codeCloseConnection = Number(data.Reason)

            if(dataJadibot?.sourceJadibotApiKey) {
                remSourceJadibot.sendText(dataJadibot?.ownerJadibotPhone, `*${dataJadibot?.nameDevice}* is logged out with reason: ${isChangedData.reasonDisconnected}`)
                global.listBot[apiKey].sourceJadibotApiKey = undefined
                // global.listBot[apiKey].ownerJadibotPhone = undefined

                isChangedData.sourceJadibotApiKey = undefined
                // isChangedData.ownerJadibotPhone = undefined
            }
            break
        case 'Receipt':
            isChangeState = 3
            break
        case "JoinedGroup":
            isChangeState = 3

            let getGroupDb = await _mongo_GroupSchema.findOne({ iId: data.JID })
            let groupMetadata = null
            if(!getGroupDb) {
                const getGroupMetadata = await rem.groupMetadata(data.JID)
                if(!getGroupMetadata) return

                const groupData = initGroupDb(data.JID, getGroupMetadata)
                await _mongo_GroupSchema.create(groupData)

                getGroupDb = groupData
            }
            groupMetadata = getGroupDb?.metadata
            if(!groupMetadata) {
                groupMetadata = await rem.groupMetadata(data.JID)
                if(!groupMetadata) return

                getGroupDb.metadata = groupMetadata
                await _mongo_GroupSchema.updateOne({ iId: data.JID }, { $set: { metadata: groupMetadata } })
            }

            const formattedDataChange = { $set: {}, $addToSet: {}, $pull: {} }
            
            if(data?.Name) formattedDataChange.$set['metadata.subject'] = data.Name
            if(data?.Topic) formattedDataChange.$set['metadata.desc'] = data.Topic
            if(data?.TopicID) formattedDataChange.$set['metadata.descId'] = data.TopicID
            if(data?.IsLocked !== undefined) formattedDataChange.$set['metadata.restrict'] = data.IsLocked
            if(data?.IsAnnounce !== undefined) formattedDataChange.$set['metadata.announce'] = data.IsAnnounce
            if(data?.DisappearingTimer) formattedDataChange.$set['metadata.ephemeralDuration'] = data.DisappearingTimer

            if(data?.Join) {
                formattedDataChange.$addToSet['metadata.participants'] = data.Join.map((participant) => ({
                    id: participant.JID,
                    admin: null
                }))
            }
            if(data?.Leave) {
                formattedDataChange.$pull = { 'metadata.participants': { id: { $in: data.Leave } } }
            }
            if(data?.Promote) {
                await _mongo_GroupSchema.updateMany(
                    { 
                        iId: data.JID, 
                        'metadata.participants.id': { $in: data.Promote }
                    },
                    { 
                        $set: { 'metadata.participants.$.admin': 'admin' } 
                    }
                )
            }
            if(data?.Demote) {
                await _mongo_GroupSchema.updateMany(
                    { 
                        iId: data.JID, 
                        'metadata.participants.id': { $in: data.Demote }
                    },
                    { 
                        $set: { 'metadata.participants.$.admin': null } 
                    }
                )
            }

            if(Object.keys(formattedDataChange.$set).length > 0 || 
                Object.keys(formattedDataChange.$addToSet).length > 0 || 
                Object.keys(formattedDataChange.$pull).length > 0) {
                    
                const updateQuery = {}
                if(Object.keys(formattedDataChange.$set).length > 0) updateQuery.$set = formattedDataChange.$set
                if(Object.keys(formattedDataChange.$addToSet).length > 0) updateQuery.$addToSet = formattedDataChange.$addToSet
                if(Object.keys(formattedDataChange.$pull).length > 0) updateQuery.$pull = formattedDataChange.$pull
                
                await _mongo_GroupSchema.updateOne({ iId: data.JID }, updateQuery)
            }
            break
        case 'Message':
            isChangeState = 3
            if(((data.Info.Chat === 'status@broadcast') || (data.Info.Sender === 'status@broadcast'))) return

            let message = messagesBeautify(apiKey, data, data, global.listBot[apiKey].user)
            if(message == {} || message == undefined || message == [] || message == '' || !message) return
            if(!message.sender) return

            if(listIgnoreMessageType.includes(message.type) || message.type == 'protocolMessage' || message.type == 'pollUpdateMessage') return
            if(message.fromMe) return

            let groupDb = null
            let groupMetadataMessage = null
            if(message.isGroupMsg) {
                groupDb = await _mongo_GroupSchema.findOne({ iId: message.from })
                if(!groupDb) {
                    const getGroupMetadata = await rem.groupMetadata(message.from)
                    if(!getGroupMetadata) return

                    groupDb = await initGroupDb(message.from, getGroupMetadata)
                }
                groupMetadataMessage = groupDb?.metadata
                if(!groupMetadataMessage) {
                    groupMetadataMessage = await rem.groupMetadata(message.from)
                    if(!groupMetadataMessage) return

                    groupDb.metadata = groupMetadataMessage
                    await _mongo_GroupSchema.updateOne({ iId: message.from }, { $set: { metadata: groupMetadataMessage } })
                }
            }
            let userDb = await _mongo_UserSchema.findOne({ iId: message.sender })
            if(!userDb) {
                userDb = await initUserDb(message.sender)
            }
            if(userDb?.setUser?.switchNum && !message.rawFromSender) {
                message.rawFromSender = message.sender
                message.rawFromSenderUserDb = userDb
                message.sender = userDb.setUser.switchNum

                userDb = await _mongo_UserSchema.findOne({ iId: message.sender })
                if(!userDb) {
                    userDb = await initUserDb(message.sender)
                }
            }
            const mentionUserDb = await _mongo_UserSchema.findOne({ iId: message.mentionedJidList[0] })

            // check contactDb
            const contactDb = await _mongo_ContactSchema.findOne({ iId: message.sender })
            if(contactDb?.name == undefined) {
                await _mongo_ContactSchema.create({ iId: message.sender, name: message.pushName })
            } else if(contactDb?.name != message.pushName) {
                await _mongo_ContactSchema.updateOne({ iId: message.sender }, { $set: { name: message.pushName } })
            }

            if(!isNaN(parseInt(message.body)) && message?.quotedMsg != undefined && message?.quotedMsg?.id?.startsWith('RMCP') && message.quotedMsg.body.includes('metadata:')) {
                const metadata = message.quotedMsg.body.split('metadata:')[1]
                const decryptMetadata = await snappy.uncompressSync(Buffer.from(metadata, 'base64'))
                const buttonParse = Buffer.from(decryptMetadata).toString('utf-8')
                const buttonSplit = buttonParse.split('|r|')
                const selectedButtonId = buttonSplit[Number(parseInt(message.body)) - 1]
                message.selectedButtonId = selectedButtonId
                message.rawType = message.type
                message.type = 'buttonsResponseMessage'
            } else if(!isNaN(parseInt(message.body)) && message?.quotedMsg != undefined && message?.quotedMsg?.id?.startsWith('RMCP') && message.quotedMsg.body.includes('lmeta:')) {
                const Lmetadata = message.quotedMsg.body.split('lmeta:')[1]
                const LdecryptMetadata = await snappy.uncompressSync(Buffer.from(Lmetadata, 'base64'))
                const ListParse = Buffer.from(LdecryptMetadata).toString('utf-8')
                const ListSplit = ListParse.split('|r|')
                const selectedRowId = ListSplit[Number(parseInt(message.body)) - 1]
                message.selectedRowId = selectedRowId
                message.rawType = message.type
                message.type = 'listResponseMessage'
            }

            rem = clientHandler(apiKey, message, global.listBot[apiKey].user)
            let clientData = formatRequiredDataClient(rem, userDb, groupDb, message)

            let passTo = global.listCommand.filter(plugin => {
                if(!plugin?.cmd) return true
                if(clientData.isCmd && plugin?.cmd?.includes(clientData.command)) return true
                return false
            }).sort((a, b) => a.priority - b.priority)

            let currentIndex = 0
            let alreadyProcessedCmd = []
            while(currentIndex < passTo.length) {
                const plugin = passTo[currentIndex]
                
                if(!plugin.messageHandler) {
                    currentIndex++
                    continue
                }

                let isChangedData = false
                const response = plugin?.isAwait ? (await plugin.messageHandler(rem, message, userDb, groupDb, mentionUserDb, clientData)) : plugin.messageHandler(rem, message, userDb, groupDb, mentionUserDb, clientData)
                alreadyProcessedCmd.push(plugin.name)

                if(response?._userDb) {
                    userDb = response._userDb
                    isChangedData = true
                }
                if(response?._groupDb) {
                    groupDb = response._groupDb
                    isChangedData = true
                }
                if(response?._mentionUserDb) {
                    mentionUserDb = response._mentionUserDb
                    isChangedData = true
                }
                if(response?._message) {
                    message = response._message
                    isChangedData = true
                }
                if (response === 'break') break

                if(isChangedData) {
                    clientData = formatRequiredDataClient(rem, userDb, groupDb, message)
                    const newPassTo = global.listCommand.filter(plugin => {
                        if(!plugin?.cmd) return true
                        if(clientData.isCmd && plugin?.cmd?.includes(clientData.command)) return true
                        return false
                    }).sort((a, b) => a.priority - b.priority)
                    
                    
                    // Reset to start processing from the beginning with new filter results
                    passTo = newPassTo.filter(plugin => !alreadyProcessedCmd.includes(plugin.name))
                    currentIndex = 0
                    
                    if(passTo.length == 0) break
                } else {
                    currentIndex++
                }
            }
            break
        case 'server_start':
            global.log.info(`[${apiKey}] Server start, starting all devices...`)
            await sleep(1000)
            for(let i = 0; i < global.listBot.length; i++) {
                startBot(global.listBot[i].apiKey, global.listBot[i].nameDevice, global.listBot[i].sourceJadibotApiKey, global.listBot[i].ownerJadibotPhone, global.listBot[i].settings?.pairMethod)

                if(i == listRunningDevice.length - 1) listRunningDevice = []
            }
            break
        case 'server_stop':
            listRunningDevice = []
            const allStateStatus = Object.values(global.listBot).filter(all => (all.stateStatus === 3) || (all.stateStatus === 1) || (all.stateStatus === 2))
            for(const all of allStateStatus) {
                if(global.listBot[all.apiKey]) {
                    if(!listRunningDevice.includes(all.apiKey)) listRunningDevice.push(all.apiKey)
                    global.listBot[all.apiKey].stateStatus = 1
                    global.listBot[all.apiKey].reasonDisconnected = 'server_stop'
                    global.log.info(`[${all.apiKey}] Server stop, changing state to pairing...`)
                }
            }

            if(allStateStatus.length > 0) {
                await _mongo_JadibotDeviceSchema.updateMany({ apiKey: { $in: allStateStatus.map(all => all.apiKey) } }, { $set: { stateStatus: 1, reasonDisconnected: 'server_stop' } })
            }
            break
    }

    if(payload?.apiKey && !global.listBot[apiKey]) await syncDataDevice()
    if(payload?.apiKey && (isChangedData && (JSON.stringify(isChangedData) !== '{}'))) {
        const changedData = isChangedData
        if(dataJadibot?.stateStatus !== isChangeState && (isChangeState !== undefined) && (isChangeState !== null) && !isNaN(isChangeState)) {
            if(global.listBot[apiKey]) global.listBot[apiKey].stateStatus = isChangeState
            global.log.info(`[${apiKey}] State status changed to ${isChangeState}`)

            changedData.stateStatus = isChangeState
        }

        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: isChangedData })
    }

    if(payload?.apiKey && codeCloseConnection !== undefined && codeCloseConnection !== null && !isNaN(codeCloseConnection)) {
        const isCanReconnect = (codeCloseConnection != 401) && (codeCloseConnection != 403 /*Banned*/) && (codeCloseConnection != 402 /*Temp Banned*/) && (codeCloseConnection != 440) && (codeCloseConnection != 411)
        if(isCanReconnect) {
            global.log.info(`[${apiKey}] Connection closed with code ${codeCloseConnection}, trying to reconnect...`)
            startBot(apiKey, global.listBot[apiKey].nameDevice, global.listBot[apiKey].sourceJadibotApiKey, global.listBot[apiKey].ownerJadibotPhone)
        }
    }
}

/**
 * description: this function is used to start the bot
 * @apiKey: string
 * @nameDevice: string
 * @sourceJadibotApiKey: string | where is the jadibot'ed bot api key
 * @returns: void
 * 
 * stateStatus Type:
 * 0 = offline
 * 1 = pairing
 * 2 = scan
 * 3 = connected
 */
async function startBot(apiKey, nameDevice, sourceJadibotApiKey, ownerJadibotPhone, pairMethod) {
    if(sourceJadibotApiKey) {
        const rem = clientHandler(sourceJadibotApiKey, {})
        rem.sendText(ownerJadibotPhone, `*${nameDevice}* is starting...`)

        await _mongo_JadibotDeviceSchema.updateOne({ apiKey: apiKey }, { $set: { sourceJadibotApiKey, ownerJadibotPhone } })
        if(global.listBot[apiKey]) {
            global.listBot[apiKey].sourceJadibotApiKey = sourceJadibotApiKey
            global.listBot[apiKey].ownerJadibotPhone = ownerJadibotPhone
        }
    }

    const responseStartDevice = await requestToGolangEngine('/session/connect', {
		name: nameDevice,
		apiKey,
        IsNoMediaKey: false
	})
    if(responseStartDevice.error) {
        global.log.error(`[${apiKey}] Error start device:`, responseStartDevice.error)
		if(global.listBot) global.listBot[apiKey].stateStatus = 0
		return { error: responseStartDevice.error }
	}
    return responseStartDevice
}

async function stopBot(apiKey, delObjSess = false, isError = false) {
    const responseStopDevice = await requestToGolangEngine('/session/disconnect', { apiKey, isDelKey: delObjSess })
    if(responseStopDevice.error && responseStopDevice.error != 'not_connected') {
        global.log.error(`[${apiKey}] Error stop device:`, responseStopDevice.error)
        return { error: responseStopDevice.error }
    }
    global.log.info(`[${apiKey}] Device stopped successfully.`)

    if(!isError) handleWebhookGolangEngine({
        apiKey,
        type: 'client_disconnect'
    })

    return responseStopDevice
}

async function logoutBot(apiKey) {
    const responseLogoutDevice = await requestToGolangEngine('/session/logout', { apiKey })
    if(responseLogoutDevice.error) {
        global.log.error(`[${apiKey}] Error logout device:`, responseLogoutDevice.error)
        return { error: responseLogoutDevice.error }
    }
    global.log.info(`[${apiKey}] Device logged out successfully.`)
    return responseLogoutDevice
}

async function addBot(apiKey, nameDevice, sourceJadibotApiKey, ownerJadibotPhone, pairMethod, numberHp, isStart = true) {
    const getJadibotKey = await _mongo_JadibotDeviceSchema.findOne({ apiKey })
    if(getJadibotKey) {
        global.log.error(`[${apiKey}] Error: apiKey already exists in database, please use another apiKey.`)
        return { error: 'apiKey already exists' }
    }

    if(pairMethod === 'code' && !numberHp) {
        global.log.error(`[${apiKey}] Error: numberHp is required for pairMethod 'code'.`)
        return { error: 'numberHp is required for pairMethod code' }
    }

    const formattedOwnerJadibotPhone = ((ownerJadibotPhone.startsWith('08') ? ownerJadibotPhone.replace('08', '628') : ownerJadibotPhone)?.replace(/\+|@s.whatsapp.net|@|-| /gi, '')?.replace(/\s/g, '')?.trim())  + '@s.whatsapp.net'
    const formattedNumberHp = numberHp ? ((numberHp?.startsWith('08') ? numberHp.replace('08', '628') : numberHp)?.replace(/\+|@s.whatsapp.net|@|-| /gi, '')?.replace(/\s/g, '')?.trim())  + '@s.whatsapp.net' : null
    const newDevice = {
        apiKey,
        serverId: process.env.SERVER_ID || 'default',
        nameDevice,
        stateStatus: 0,
        reasonDisconnected: null,
        settings: {
            pairMethod: pairMethod || 'qr',
            numberHp: formattedNumberHp || null
        },
        sourceJadibotApiKey,
        ownerJadibotPhone: formattedOwnerJadibotPhone,
        isBotUtama: false
    }
    const newDeviceData = await _mongo_JadibotDeviceSchema.create(newDevice)
    if(!newDeviceData) {
        global.log.error(`[${apiKey}] Error: failed to add new device to database.`)
        return { error: 'failed to add new device to database' }
    }

    global.listBot[apiKey] = newDevice
    global.log.info(`[${apiKey}] Device added successfully.`)
    if(isStart) {
        const startResponse = await startBot(apiKey, nameDevice, sourceJadibotApiKey, ownerJadibotPhone, pairMethod)
        if(startResponse.error) {
            global.log.error(`[${apiKey}] Error starting device:`, startResponse.error)
            return { error: startResponse.error }
        }
    }

    return { success: true, data: newDeviceData }
}

async function syncDataDevice() {
	try {
		const getDataStatus = await requestToGolangEngine('/session/allStatus', {})
		if(getDataStatus.error) throw new Error(getDataStatus.error)

		const allDataStatus = Object.values(getDataStatus.data)
        const allSyncedApiKey = []
        const batchUpdateStateStatus = []
		for(let i = 0; i < allDataStatus.length; i++) {
			const dataStatus = allDataStatus[i]
			if(!dataStatus) continue
            allSyncedApiKey.push(dataStatus.ApiKey)

			const stateStatus = (dataStatus.Connected && dataStatus.LoggedIn) ? 3 : (dataStatus.Connected && dataStatus.QrCode) ? 2 : dataStatus.Connected ? 1 : 0
			const jidGet = dataStatus.Jid || dataStatus.JID || ''
			const formattedJidGet = jidGet.split('@')[0].split(':')[0] + '@s.whatsapp.net'
			const setStatus = {
				apiKey: dataStatus.ApiKey,
				stateStatus: stateStatus,
				jid: jidGet,
				user: {
					id: jidGet,
					jid: formattedJidGet,
				}
			}
            if(!global.listBot[dataStatus.ApiKey]) {
                const dataDevices = await _mongo_JadibotDeviceSchema.findOne({ apiKey: dataStatus.ApiKey })
                if(!dataDevices) {
                    global.log.error(`[${dataStatus.ApiKey}] Error: apiKey not found in database, deleting device...`)
                    stopBot(dataStatus.ApiKey)
                    continue
                }

                // if data stateStatus not match with dataDevices, update it
                if(dataDevices.stateStatus !== stateStatus) {
                    batchUpdateStateStatus.push({ apiKey: dataStatus.ApiKey, stateStatus })
                }

                global.listBot[dataStatus.ApiKey] = Object.assign(dataDevices, setStatus)
            }
            if(!global.listBot[dataStatus.ApiKey]?.user?.id) {
                global.listBot[dataStatus.ApiKey].jid = jidGet
                global.listBot[dataStatus.ApiKey].user = {
                    id: jidGet,
                    jid: formattedJidGet,
                }
            }

            if(global.listBot[dataStatus.ApiKey]?.stateStatus !== stateStatus) {
                batchUpdateStateStatus.push({ apiKey: dataStatus.ApiKey, stateStatus })
            }
			global.listBot[dataStatus.ApiKey] = Object.assign(global.listBot[dataStatus.ApiKey], setStatus)
		}

        // delete data that not in allSyncedApiKey in the global.listBot
        global.listBot = Object.fromEntries(Object.entries(global.listBot).filter(([key]) => allSyncedApiKey.includes(key)))

        if(batchUpdateStateStatus.length > 0) {
            const updateQueries = batchUpdateStateStatus.map(data => ({
                updateOne: {
                    filter: { apiKey: data.apiKey },
                    update: { $set: { stateStatus: data.stateStatus } }
                }
            }))
            await _mongo_JadibotDeviceSchema.bulkWrite(updateQueries)
        }
	} catch(e) {
		global.log.error(`Error sync data device:`, e)
	}
}

if(!isNaN(process.env.CLIENT_ID)) {
    setInterval(() => {
        if(!global.golangEngine.engineUrl) return
        syncDataDevice()
    }, 5000)
}

module.exports = {
    handleWebhookGolangEngine,
    startBot,
    stopBot,
    addBot,
    logoutBot,
    syncDataDevice,
    listRunningDevice,
    listIntervalQrBulkEvent,
    disconnReasonParser,
    listIgnoreMessageType
}