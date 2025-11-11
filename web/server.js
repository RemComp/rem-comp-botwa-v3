const express = require('express');
const path = require('path');
const formidable = require('formidable');
const QRCode = require('qrcode');

const Logger = require('../utils/logger');
global.log = new Logger();
global.golangEngine = {
    golangKey: process.env.ENGINE_GOLANG_KEY,
    engineUrl: process.env.ENGINE_GOLANG_URL,
    buildTime: process.env.ENGINE_GOLANG_BUILD_TIME,
    version: process.env.ENGINE_GOLANG_VERSION,
}
if(!global.golangEngine.engineUrl) {
    global.log.error('Golang Engine is not initialized. Please check your environment variables.');
    process.exit(0);
}

const { generateRandomString } = require('../utils/utils');
const { addBot, startBot, stopBot, logoutBot } = require('../handlers/handlers');
const { _mongo_JadibotDeviceSchema } = require('../lib/database');

const app = express();
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.static(path.join(__dirname, 'src')));

app.use(/^\/api\/.*/, async (req, res, next) => {
    let { username, password } = req.body;
    if(!username && !password) {
        const form = formidable({ uploadDir: path.resolve(process.cwd(), 'upload') });
        const fields = await form.parse(req);
        if (
            Array.isArray(fields) &&
            fields[0] &&
            Array.isArray(fields[0].username) &&
            Array.isArray(fields[0].password)
        ) {
            const username = fields[0].username[0];
            const password = fields[0].password[0];
        } else {
            console.error('Data login tidak lengkap atau format tidak sesuai:', fields);
            return res.json({ success: false, message: 'Data login tidak lengkap' });
        }
        req.formParsed = fields
    }
    if(!password) return res.json({ success: false, message: 'Password is required' });

    if (username === process.env.WEB_ADMIN_USERNAME && password === process.env.WEB_ADMIN_PASSWORD) {
        // req.user_permissions = permissions
        next();
    } /*else {
        const user = global.db.prepare('SELECT * FROM web_admin WHERE username = ? AND password = ?').get(username, password);
        if(user) {
            req.user_permissions = user.permissions.split(',');
            next();
        } else {
            return res.json({ success: false, message: 'Invalid Password' });
        }
    }*/
    else {
        return res.json({ success: false, message: 'Invalid Password' });
    }
});

app.get('/', (req, res) => {
    res.sendFile('./src/index.html', { root: __dirname });
});

app.post('/api/auth', async (req, res) => {
    let { username, password } = req.body;
    if(!password) return res.json({ success: false, message: 'Password is required' });

    if (username === process.env.WEB_ADMIN_USERNAME && password === process.env.WEB_ADMIN_PASSWORD) {
        return res.json({ success: true, message: 'Login success'/*, permissions: permissions*/ });
    } /*else {
        // search in database web_admin
        const user = global.db.prepare('SELECT * FROM web_admin WHERE username = ? AND password = ?').get(username, password);
        if(user) {
            return res.json({ success: true, message: 'Login success', permissions: user.permissions.split(',') });
        } else {
            return res.json({ success: false, message: 'Invalid Password' });
        }
    }*/ else {
        return res.json({ success: false, message: 'Invalid Password' });
    }
});

// scan
app.post('/api/list-qr', async (req, res) => {
    const searchQuery = {};
    if(req.body.search) {
        searchQuery.$or = [
            { nameDevice: { $regex: req.body.search, $options: 'i' } },
            { apiKey: { $regex: req.body.search, $options: 'i' } },
            { 'settings.numberHp': { $regex: req.body.search, $options: 'i' } },
            { ownerJadibotPhone: { $regex: req.body.search, $options: 'i' } }
        ];
    }
    if(req.body.filterBotUtama) {
        searchQuery.isBotUtama = true;
    }
    if(req.body.filterServerId) {
        searchQuery.serverId = req.body.filterServerId;
    }
    if(req.body.filterStatus) {
        searchQuery.stateStatus = parseInt(req.body.filterStatus);
    }
    const devices = await _mongo_JadibotDeviceSchema.find(searchQuery)
        .skip((req.body.page - 1) * req.body.limit) // pagination
        .limit(req.body.limit); // limit
    const listBotQr = devices.map(device => ({
        id: device.apiKey,
        status: device.stateStatus,
        numberWa: device.settings?.numberHp || null,
        isHaveQr: device.stateStatus === 2,
        isBotUtama: device.isBotUtama || false,
        nameDevice: device.nameDevice,
        ownerJadibotPhone: device.ownerJadibotPhone,
        serverId: device.serverId
    }));
    const totalCount = await _mongo_JadibotDeviceSchema.countDocuments(searchQuery);
    res.json({
        success: true,
        message: 'List scan retrieved',
        listQr: listBotQr,
        totalCount: totalCount,
        totalPage: Math.ceil(totalCount / req.body.limit),
        serverId: process.env.SERVER_ID
    });
});

app.post('/api/add-qr', async (req, res) => {
    const apiKeyBot = req.body.costumApiKey || generateRandomString(32);
    const nameDevice = req.body.nameDevice
    const methodPairing = req.body.methodPairing || 'qr';
    const numberHp = req.body.numberHp || '';
    const ownerJadibotPhone = req.body.ownerJadibotPhone || '';

    if(!nameDevice) return res.status(400).json({ success: false, message: 'nameDevice is required' });
    if(methodPairing === 'code' && !numberHp) return res.status(400).json({ success: false, message: 'numberHp is required' });
    if(!ownerJadibotPhone) return res.status(400).json({ success: false, message: 'ownerJadibotPhone is required' });
    
    const checkErr = await addBot(apiKeyBot, nameDevice, undefined, ownerJadibotPhone, methodPairing, numberHp, false)
    if(checkErr.error) return res.status(400).json({ success: false, message: checkErr.message });
    res.json({ success: true, message: 'Bot Added', botId: apiKeyBot });
});

app.post('/api/start-qr', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    const checkErr = await startBot(device.apiKey, device.nameDevice, device.sourceJadibotApiKey, device.ownerJadibotPhone);
    if(checkErr.error) return res.status(400).json({ success: false, message: checkErr.message });
    res.json({ success: true, message: 'Bot started successfully', botId: device.apiKey });
});

app.post('/api/stop-qr', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    const checkErr = await stopBot(device.apiKey);
    if(checkErr.error && checkErr.error != 'not_connected') return res.status(400).json({ success: false, message: checkErr.message });
    res.json({ success: true, message: 'Bot stopped successfully' });
});

app.post('/api/logout-qr', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    const checkErr = await logoutBot(device.apiKey);
    if(checkErr.error) return res.status(400).json({ success: false, message: checkErr.message });
    res.json({ success: true, message: 'Bot logged out successfully' });
});

app.post('/api/delete-qr', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    // if stateStatus is 1, 2 (scanning) or 3 (connected), stop the bot first
    if(device.stateStatus === 1 || device.stateStatus === 2 || device.stateStatus === 3) {
        const checkErr = await stopBot(device.apiKey, true);
        if(checkErr.error) return res.status(400).json({ success: false, message: checkErr.message });
    }

    // delete device from database
    await _mongo_JadibotDeviceSchema.deleteOne({ apiKey: botIdString });
    res.json({ success: true, message: 'Bot deleted successfully' });
});

app.post('/api/get-qr', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    if(device.stateStatus !== 2) {
        return res.status(400).json({ success: false, message: 'Bot is not in scanning state' });
    }

    res.json({
        success: true,
        message: 'QR Code retrieved successfully',
        scan: device.scan
    });
});

app.post('/api/toggle-bot-utama', async (req, res) => {
    if(!req.body.botId) return res.status(400).json({ success: false, message: 'botId is required' });
    const botIdString = req.body.botId.toString();

    const device = await _mongo_JadibotDeviceSchema.findOne({ apiKey: botIdString });
    if(!device) return res.status(404).json({ success: false, message: 'Bot not found' });

    // toggle isBotUtama
    await _mongo_JadibotDeviceSchema.updateOne(
        { apiKey: botIdString },
        { $set: { isBotUtama: req.body.isBotUtama } }
    );

    res.json({
        success: true,
        message: `Bot ${req.body.isBotUtama ? 'set as' : 'removed from'} utama successfully`,
        isBotUtama: device.isBotUtama
    });
});

app.post('/api/generate-qr', async (req, res) => {
    try {
        if(!req.body.data) {
            return res.status(400).json({ success: false, message: 'data is required' });
        }

        const qrCodeDataURL = await QRCode.toDataURL(req.body.data, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 200
        });

        res.json({
            success: true,
            message: 'QR Code generated successfully',
            qrCode: qrCodeDataURL
        });
    } catch (error) {
        console.error('QR Code generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate QR code'
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});