require('dotenv').config();

const { spawn, exec, execSync } = require('child_process')
const path = require('path');
const axios = require('axios');
const { sleep } = require('./utils/utils');
const sessionInit = require('./session_init');

if(!process.env.PORT_START) return console.error('PORT_START is not set in environment variables. Please set it before running the script.');
if(!process.env.PORT_WEB) return console.error('PORT_WEB is not set in environment variables. Please set it before running the script.');
if(!process.env.PORT_GOLANG) return console.error('PORT_GOLANG is not set in environment variables. Please set it before running the script.');
if(!process.env.PROCESS_COUNT) return console.error('PROCESS_COUNT is not set in environment variables. Please set it before running the script.');

if(!process.env.WEB_ADMIN_USERNAME) return console.error('WEB_ADMIN_USERNAME is not set in environment variables. Please set it before running the script.');
if(!process.env.WEB_ADMIN_PASSWORD) return console.error('WEB_ADMIN_PASSWORD is not set in environment variables. Please set it before running the script.');

if(!process.env.SERVER_ID) return console.error('SERVER_ID is not set in environment variables. Please set it before running the script.');
if(!process.env.MONGO_URI) return console.error('MONGO_URI is not set in environment variables. Please set it before running the script.');
if(!process.env.KEY_GOLANG) return console.error('KEY_GOLANG is not set in environment variables. Please set it before running the script.');

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
            script: 'client.js',
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
            CLIENT_ID: false,
            PORT: process.env.PORT_WEB || 5000,
            CLIENT_ALL_PORT: JSON.stringify(clientAllPort),
            MONGO_URI: process.env.MONGO_URI,
            SERVER_ID: process.env.SERVER_ID || 'default-server',
            WEB_ADMIN_USERNAME: process.env.WEB_ADMIN_USERNAME || 'admin',
            WEB_ADMIN_PASSWORD: process.env.WEB_ADMIN_PASSWORD || 'ilyaca',
        }
    });

    // turn off all pm2 process
    await turnOffAllClient()
    await turnOffWebInterface()

    // first start golang engine
    await initGolangEngine(clientAllPort);
    parsedProcessRun.forEach(client => {
        client.env.ENGINE_GOLANG_KEY = process.env.KEY_GOLANG;
        client.env.ENGINE_GOLANG_URL = global.golangEngine.engineUrl;
        client.env.ENGINE_GOLANG_BUILD_TIME = global.golangEngine.buildTime;
        client.env.ENGINE_GOLANG_VERSION = global.golangEngine.version;
    });

    // start all client
    await startAllProcess(parsedProcessRun);
    console.log('+ All clients and web interface started successfully!');

    await sleep(5000); // wait for all clients to start

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
		// process.exit(0);
        execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
	}

    await turnOffGolangEngine()
    const fileNameGolangEngine = 'rem-comp-golang' + (currentOS.extension || '');
    const parsedWEBHOOK_MAIN = JSON.stringify(clientAllPort.map(client => `http://localhost:${client.port}/webhook/golangengine`))
    const portGolang = process.env.PORT_GOLANG || 3001;

    return new Promise((resolve, reject) => {
		exec(`pm2 start "${path.resolve(process.cwd() + '/' + fileNameGolangEngine)}" --name rem-comp-golang --update-env`, {
			cwd: process.cwd(), 
			env: Object.assign(process.env, { ENGINE_GOLANG_KEY: process.env.KEY_GOLANG, ENGINE_GOLANG_PORT: process.env.PORT_GOLANG, WEBHOOK_MAIN: parsedWEBHOOK_MAIN, WHATSAPP_CONN_IDMSG: "RMCP" }) 
		}, async (error) => {
			if (error) {
				console.error('+ Error when initialize whatsmeow engine, Err: ', 'whatsmeowerr_err_start')
				console.error(`exec error: ${error}`);
				// process.exit(0);
                execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
			}

			await sleep(5000)
			axios.get(`http://localhost:${portGolang}/version`, { timeout: 30000 }).then((response) => {
				console.log('+ Golang engine started!')
                global.golangEngine = {};
                global.golangEngine.golangKey = process.env.KEY_GOLANG;
				global.golangEngine.engineUrl = `http://localhost:${portGolang}`
				const buildTimeParsed = Number(response.data.buildTime)
				global.golangEngine.buildTime = buildTimeParsed
				global.golangEngine.version = response.data.version
				resolve()
			}).catch((e) => {
				console.error('+ Error when initialize whatsmeow engine, Err: ', 'whatsmeowerr_err_ping')
				console.error(`exec_ping error: ${e}`);
				// process.exit(0);
                execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
			})
		});
	})
}

async function startAllProcess(processArr) {
    return new Promise((resolve, reject) => {
        const startPromises = processArr.map(client => {
            return new Promise((res, rej) => {
                exec(`pm2 start ${client.script} --name ${client.name} --update-env --no-autorestart`, {
                    cwd: process.cwd(),
                    env: Object.assign(process.env, client.env)
                }, (error) => {
                    if (error) {
                        console.error(`+ Error when starting client ${client.name}, Err: `, 'whatsmeowerr_err_start_client')
                        console.error(`exec error: ${error}`);
                        // process.exit(0);
                        execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
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
					// process.exit(0);
                    execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
				}
			});
		} else {
			resolve()
		}
	})
}

// turn off all pm2 process with name client-* and web-interface
async function turnOffAllClient() {
    return new Promise(async (resolve, reject) => {
        const getList = await getListPm2()
        const filterClient = getList.filter(client => client.name.startsWith('client-'));
        if(filterClient.length > 0) {
            const clientNames = filterClient.map(client => client.name).join(' ');
            exec(`pm2 delete ${clientNames}`, {
                cwd: process.cwd()
            }, (error) => {
                if (error) {
                    console.error('+ Error when turning off all client, Err: ', 'whatsmeowerr_err_stop_all')
                    console.error(`exec error: ${error}`);
                    // process.exit(0);
                    execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}
async function turnOffWebInterface() {
    return new Promise(async (resolve, reject) => {
        const isExistWebInterface = (execSync(`pm2 list`)).toString().includes('web-interface');
        if(isExistWebInterface) {
            exec(`pm2 delete web-interface`, {
                cwd: process.cwd()
            }, (error) => {
                if (error) {
                    console.error('+ Error when turning off web interface, Err: ', 'whatsmeowerr_err_stop_web')
                    console.error(`exec error: ${error}`);
                    // process.exit(0);
                    execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}

async function getListPm2() {
    // use jlist to get all pm2 process
    return new Promise((resolve, reject) => {
        exec(`pm2 jlist`, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                console.error('+ Error when getting list pm2, Err: ', 'whatsmeowerr_err_list_pm2')
                console.error(`exec error: ${error}`);
                return reject(error);
            }
            try {
                const pm2List = JSON.parse(stdout);
                resolve(pm2List);
            } catch (e) {
                console.error('+ Error when parsing pm2 list, Err: ', 'whatsmeowerr_err_parse_pm2')
                reject(e);
            }
        });
    });
}


setupMultiCLient().then(() => {
    console.log('+ Multi client setup completed successfully!');
}).catch((error) => {
    console.error('+ Error during multi client setup:', error);
}).finally(() => {
    execSync(`pm2 stop ${process.env.pm_id}`, { cwd: process.cwd() });
});