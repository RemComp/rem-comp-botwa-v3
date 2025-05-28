const { _mongo_JadibotDeviceSchema } = require('../lib/database')
const { startBot } = require('./handlers/handlers')

async function initSession() {
    const getDeviceSameServer = await _mongo_JadibotDeviceSchema.find({ serverId: process.env.SERVER_ID })
    if(getDeviceSameServer.length === 0) return false;

    for(const device of getDeviceSameServer) {
        
    }
}