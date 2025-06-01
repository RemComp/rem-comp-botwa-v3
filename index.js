require('dotenv').config();

const { spawn, exec, execSync } = require('child_process')
const path = require('path');
const { sleep } = require('./utils/utils');
const sessionInit = require('./session_init');

if(!process.env.MONGO_URI) return console.error('MONGO_URI is not set in environment variables. Please set it before running the script.');

async function setupMultiCLient() {
    // if not running by pm2, stop
    if (!process.env.pm_id) {
        console.error('This script should be run using PM2. Please start it with "pm2 start index.js --name rem"');
        process.exit(1);
    }

    // parse running client
    const maxClients = parseInt(process.env.PROCESS_COUNT) || 1;
    const portStartClient = parseInt(process.env.PORT_START) || 3000;
    const parsedProcessRun = [];
    for (let i = 0; i < maxClients; i++) {
        const port = portStartClient + i;
        parsedProcessRun.push({
            name: `client-${i + 1}`,
            script: 'index.js',
            env: {
                PORT: port,
                CLIENT_ID: i + 1,
                CLIENT_NAME: `Client ${i + 1}`,
                MONGO_URI: process.env.MONGO_URI,
                SERVER_ID: process.env.SERVER_ID || 'default-server',
            }
        });
    }
    // web interface
    const clientAllPort = parsedProcessRun.map(client => { return { id: client.env.CLIENT_ID, name: client.env.CLIENT_NAME, port: client.env.PORT } })
    parsedProcessRun.push({
        name: 'web-interface',
        script: 'web/server.js',
        env: {
            PORT: process.env.PORT_WEB || 5000,
            CLIENT_ALL_PORT: JSON.stringify(clientAllPort),
            MONGO_URI: process.env.MONGO_URI,
            SERVER_ID: process.env.SERVER_ID || 'default-server',
        }
    });

    // turn off all pm2 process
    await turnOffAllClient()
    await turnOffWebInterface()

    // first start golang engine
    await initGolangEngine(clientAllPort);
    parsedProcessRun.forEach(client => {
        client.env.ENGINE_GOLANG = global.golangEngine.engineUrl;
        client.env.ENGINE_GOLANG_BUILD_TIME = global.golangEngine.buildTime;
        client.env.ENGINE_GOLANG_VERSION = global.golangEngine.version;
    });

    // start all client
    await startAllProcess(parsedProcessRun);
    console.log('+ All clients and web interface started successfully!');

    // initialize session
    await sessionInit.initSession();
}

const golangSupportedOS = [
	{ 
		os: 'Windows', 
		platform: 'win32', 
		extension: '.exe', 
	},
	{ 
		os: 'Linux', 
		platform: 'linux', 
		extension: '', 
	},
];
function checkOSGolangSupported() {
	const currentOS = golangSupportedOS.find(os => os.platform === process.platform);
	return currentOS
}
async function initGolangEngine(clientAllPort = []) {
    const currentOS = checkOSGolangSupported()
	if(!currentOS) {
		console.error('+ Error when initialize whatsmeow engine, Err: ', 'whatsmeowerr_unsupported_platform')
		process.exit(0);
	}

    await turnOffGolangEngine()
    const fileNameGolangEngine = 'rem-comp-golang' + (currentOS.extension || '');
    const parsedWEBHOOK_MAIN = JSON.stringify(clientAllPort.map(client => `http://localhost:${client.port}/webhook/golangengine`))

    return new Promise((resolve, reject) => {
		exec(`pm2 start "${path.resolve(process.cwd() + '/' + fileNameGolangEngine)}" --name rem-comp-golang --update-env`, {
			cwd: process.cwd(), 
			env: Object.assign(process.env, { ENGINE_GOLANG_PORT: process.env.PORT_GOLANG, WEBHOOK_MAIN: parsedWEBHOOK_MAIN, WHATSAPP_CONN_IDMSG: "RMCP" }) 
		}, async (error) => {
			if (error) {
				console.error('+ Error when initialize whatsmeow engine, Err: ', 'whatsmeowerr_err_start')
				console.error(`exec error: ${error}`);
				process.exit(0);
			}

			await sleep(5000)
			axios.get(`http://localhost:${portGolang}/version`, { timeout: 30000 }).then((response) => {
				console.log('+ Golang engine started!')
				global.golangEngine.engineUrl = `http://localhost:${portGolang}`
				const buildTimeParsed = Number(response.data.buildTime)
				global.golangEngine.buildTime = buildTimeParsed
				global.golangEngine.version = response.data.version
				resolve()
			}).catch((e) => {
				console.error('+ Error when initialize whatsmeow engine, Falling back to baileys, Err: ', 'whatsmeowerr_err_ping')
				console.error(`exec_ping error: ${e}`);
				process.exit(0);
			})
		});
	})
}

async function startAllProcess(processArr) {
    return new Promise((resolve, reject) => {
        const startPromises = processArr.map(client => {
            return new Promise((res, rej) => {
                exec(`pm2 start ${client.script} --name ${client.name} --update-env`, {
                    cwd: process.cwd(),
                    env: Object.assign(process.env, client.env)
                }, (error) => {
                    if (error) {
                        console.error(`+ Error when starting client ${client.name}, Err: `, 'whatsmeowerr_err_start_client')
                        console.error(`exec error: ${error}`);
                        process.exit(0);
                    } else {
                        res();
                    }
                });
            });
        });

        Promise.all(startPromises).then(() => {
            resolve();
        }).catch(err => {
            reject(err);
        });
    });
}

async function turnOffGolangEngine() {
	return new Promise(async (resolve, reject) => {
		const isExistGolangEngine = (await execSync(`pm2 list`)).toString().includes('rem-comp-golang');
		if(isExistGolangEngine) {
			exec(`pm2 delete rem-comp-golang`, {
				cwd: process.cwd()
			}, async (error) => {
				await sleep(1000)
				resolve()
				if (error) {
					console.error('+ Error when initialize whatsmeow engine, Err: ', 'whatsmeowerr_err_stop')
					console.error(`exec error: ${error}`);
					process.exit(0);
				}
			});
		} else {
			resolve()
		}
	})
}

// turn off all pm2 process with name client-* and web-interface
async function turnOffAllClient() {
    return new Promise((resolve, reject) => {
        exec(`pm2 delete client-*`, {
            cwd: process.cwd()
        }, (error) => {
            if (error) {
                console.error('+ Error when turning off all client, Err: ', 'whatsmeowerr_err_stop_all')
                console.error(`exec error: ${error}`);
                process.exit(0);
            }
            resolve();
        });
    });
}
async function turnOffWebInterface() {
    return new Promise((resolve, reject) => {
        exec(`pm2 delete web-interface`, {
            cwd: process.cwd()
        }, (error) => {
            if (error) {
                console.error('+ Error when turning off web interface, Err: ', 'whatsmeowerr_err_stop_web')
                console.error(`exec error: ${error}`);
                process.exit(0);
            }
            resolve();
        });
    });
}


setupMultiCLient()