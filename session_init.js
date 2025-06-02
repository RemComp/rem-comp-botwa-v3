const { _mongo_JadibotDeviceSchema } = require('./lib/database')
const { startBot } = require('./handlers/handlers')

async function initSession() {
    const getDeviceSameServer = await _mongo_JadibotDeviceSchema.find({
        serverId: process.env.SERVER_ID,
        stateStatus: { $in: [1, 2, 3] } // get stateStatus 1 2 3
    });
    if(getDeviceSameServer.length === 0) return false;

    for(const device of getDeviceSameServer) {
        console.log(`[INIT] Starting bot for device: ${device.nameDevice} (${device.apiKey})`);
        const isErr = await startBot(device.apiKey, device.nameDevice, device.sourceJadibotApiKey, device.ownerJadibotPhone)
        if(isErr.error)  console.error(`[INIT] Error starting bot for device ${device.nameDevice}:`, isErr.error);
    }
}

module.exports = {
    initSession
}