const Logger = require('./utils/logger');
const { loadCommand } = require('./lib/loadCommand');

global.log = new Logger();
global.golangEngine = {
    engineUrl: process.env.ENGINE_GOLANG_URL,
    buildTime: process.env.ENGINE_GOLANG_BUILD_TIME,
    version: process.env.ENGINE_GOLANG_VERSION,
}
if(!global.golangEngine.engineUrl || !global.golangEngine.buildTime || !global.golangEngine.version) {
    global.log.error('Golang Engine is not initialized. Please check your environment variables.');
    process.exit(0);
}

async function main() {
    await loadCommand();
}

main()