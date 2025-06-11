const { _mongo_JadibotDeviceSchema } = require('../../lib/database');
const { generateRandomString, addCollectorMessage } = require('../../utils/utils');
const { addBot, startBot, stopBot, logoutBot } = require('../../handlers/handlers');

const toMs = require('ms');

const priority = 3;
const isAwait = false
const cmd = ['device', 'jadibot']

async function messageHandler (rem, message, userDb, groupDb, mentionUserDb, clientData) {
    console.log(`Command: ${clientData.command} | From: ${message.sender} | Args: ${clientData.args.join(' ')}`, message.collectMessage);
    const { args, allArgs, prefix } = clientData;
    const { from, sender } = message;

    if(!allArgs[1]) {
        const getListDevice = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender })
        
        let formattedText = `*「 DEVICE 」*\n\n`;
        if(getListDevice.length > 0) {
            getListDevice.forEach((device, index) => {
                formattedText += `${index + 1}. *${device.nameDevice}*${device?.settings?.numberHp ? ` (${device.settings.numberHp?.replace('@s.whatsapp.net', '')})` : ''}\n`;
                /**
                 * stateStatus Type:
                 * 0 = offline
                 * 1 = pairing
                 * 2 = scan
                 * 3 = connected
                 */
                formattedText += `*Status :* _${device.stateStatus === 0 ? 'Offline' : device.stateStatus === 1 ? 'Pairing' : device.stateStatus === 2 ? 'Scanning' : 'Connected'}_\n\n`;
            });
        } else {
            formattedText += 'Tidak ada perangkat terdaftar.';
        }
        formattedText += `Total Perangkat: ${getListDevice.length}\n——————————\n\n`;
        rem.reply(from, formattedText);
        return rem.sendText(from, `*「 DEVICE 」*\n\n- Untuk Menambah Device\n*${clientData.prefix}device add <nama perangkat>*\nContoh: _${clientData.prefix}device add MyDevice_\n\n- Untuk Menghapus Device\n*${clientData.prefix}device delete <nomor perangkat>*\nContoh: _${clientData.prefix}device delete 1_\n\n- Untuk Start Device\n*${clientData.prefix}device <nomor perangkat>*\nContoh: _${clientData.prefix}device 1_\n\n- Untuk Stop Device\n*${clientData.prefix}device stop <nomor perangkat>*\nContoh: _${clientData.prefix}device stop 1_\n\n- Untuk Logout Device\n*${clientData.prefix}device logout <nomor perangkat>*\nContoh: _${clientData.prefix}device logout 1_\n\n- Untuk Melihat Daftar Device\n*${clientData.prefix}device*`);
    }

    if(allArgs[1] === 'add') {
        if(!allArgs[2]) return rem.reply(from, `*「 DEVICE 」*\n\nMasukkan nama perangkat yang ingin didaftarkan.\nContoh: *${clientData.prefix}device add <nama perangkat>*`);
        
        let deviceName = allArgs.slice(2).join(' ').trim();
        const existingDevice = await _mongo_JadibotDeviceSchema.findOne({ ownerJadibotPhone: message.sender, nameDevice: deviceName });
        if(existingDevice) {
            return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat dengan nama *${deviceName}* sudah terdaftar.`);
        }
        
        if(!allArgs.join().includes('grantedAccess1')) return rem.sendButtons(from, `*!! WARNING !!*\nWhatsApp melarang keras Bot Tidak Resmi, Jika ketahuan akan menyebabkan nomor *kebanned*.\n*Mohon gunakan WhatsApp dengan Nomor Virtual/Nomor Cadangan Anda*\n\nJika ingin melanjutkan, Tekan tombol Lanjutkan dibawah\nJika tidak, abaikan pesan ini`, [{id: `${prefix}device add grantedAccess1 ${deviceName}`, text: 'Lanjutkan'}], '', '@dwirizqi.h')
        deviceName = allArgs.slice(3).join(' ').trim();
        if(!allArgs.join().includes('grantedAccess2')) return rem.sendButtons(from, `*「 DEVICE 」*\n\nPilih jenis authentikasi yang ingin digunakan untuk perangkat ini.`, [
            { id: `${prefix}device add grantedAccess1 grantedAccess2 qr ${deviceName}`, text: 'Kode QR' },
            { id: `${prefix}device add grantedAccess1 grantedAccess2 code ${deviceName}`, text: 'Code' }
        ], { quoted: message });
        deviceName = allArgs.slice(5).join(' ').trim();
        if(allArgs[4] === 'code' && (message.collectMessage === undefined)) {
            await addCollectorMessage(sender, from, `${prefix}device add grantedAccess1 grantedAccess2 code ${deviceName}`, Date.now() + toMs('1m'), true, JSON.stringify(message))
            return rem.sendText(from, 'Kirimkan ke sini\nNomer telepon *yang akan di Jadibot*')
        }

        deviceName = allArgs.slice(5).join(' ').trim();
        const numberHp = (allArgs[4] === 'code') ? (message.collectMessage.startsWith('08') ? message.collectMessage.replace('08', '628') : message.collectMessage)?.replace(/\+|@s.whatsapp.net|@|-| /gi, '')?.replace(/\s/g, '')?.trim() : null
        const randomApiKey = generateRandomString(32);
        const newDevice = await addBot(randomApiKey, deviceName, (rem?.apiKey || rem), message.sender, allArgs[4], numberHp, false); 
        
        const positionDevice = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender }).countDocuments() + 1;
        return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat *${deviceName}* berhasil didaftarkan.\n\nID Perangkat: *${newDevice.data.apiKey}*\n\nUntuk memulai perangkat, gunakan perintah:\n*${clientData.prefix}device ${positionDevice}*`);
    }

    if(allArgs[1] === 'delete') {
        if(!allArgs[2]) return rem.reply(from, `*「 DEVICE 」*\n\nMasukkan nomor perangkat yang ingin dihapus.\nContoh: *${clientData.prefix}device delete 2*`);
        
        const deviceNumber = parseInt(allArgs[2], 10);
        const deviceList = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender });
        
        if(deviceNumber < 1 || deviceNumber > deviceList.length) {
            return rem.reply(from, `*「 DEVICE 」*\n\nNomor perangkat tidak valid. Silakan pilih nomor antara 1 dan ${deviceList.length}.`);
        }
        
        const deviceToDelete = deviceList[deviceNumber - 1];
        await stopBot(deviceToDelete.apiKey, true);
        await _mongo_JadibotDeviceSchema.deleteOne({ apiKey: deviceToDelete.apiKey });
        
        return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat *${deviceToDelete.nameDevice}* berhasil dihapus.`);
    }

    if(allArgs[1] === 'stop') {
        if(!allArgs[2]) return rem.reply(from, `*「 DEVICE 」*\n\nMasukkan nomor perangkat yang ingin dihentikan.\nContoh: *${clientData.prefix}device stop 1*`);
        
        const deviceNumber = parseInt(allArgs[2], 10);
        const deviceList = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender });
        
        if(deviceNumber < 1 || deviceNumber > deviceList.length) {
            return rem.reply(from, `*「 DEVICE 」*\n\nNomor perangkat tidak valid. Silakan pilih nomor antara 1 dan ${deviceList.length}.`);
        }
        
        const deviceToStop = deviceList[deviceNumber - 1];
        await stopBot(deviceToStop.apiKey, false);
        
        return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat *${deviceToStop.nameDevice}* berhasil dihentikan.`);
    }

    if(allArgs[1] === 'logout') {
        if(!allArgs[2]) return rem.reply(from, `*「 DEVICE 」*\n\nMasukkan nomor perangkat yang ingin di-logout.\nContoh: *${clientData.prefix}device logout 1*`);
        
        const deviceNumber = parseInt(allArgs[2], 10);
        const deviceList = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender });
        
        if(deviceNumber < 1 || deviceNumber > deviceList.length) {
            return rem.reply(from, `*「 DEVICE 」*\n\nNomor perangkat tidak valid. Silakan pilih nomor antara 1 dan ${deviceList.length}.`);
        }
        
        const deviceToLogout = deviceList[deviceNumber - 1];
        await logoutBot(deviceToLogout.apiKey);
        
        return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat *${deviceToLogout.nameDevice}* berhasil di-logout.`);
    }

    if(allArgs[1] && !isNaN(allArgs[1])) {
        const deviceNumber = parseInt(allArgs[1], 10);
        const deviceList = await _mongo_JadibotDeviceSchema.find({ ownerJadibotPhone: message.sender });
        
        if(deviceNumber < 1 || deviceNumber > deviceList.length) {
            return rem.reply(from, `*「 DEVICE 」*\n\nNomor perangkat tidak valid. Silakan pilih nomor antara 1 dan ${deviceList.length}.`);
        }

        const deviceToStart = deviceList[deviceNumber - 1];
        if(deviceToStart?.settings?.pairMethod === 'qr') await rem.sendText(from, 'Scan Kode QR Dibawah, cara lihat dibawah\n\nKembali ke beranda WhastApp\n*1. Titik Tiga*\n[ _Pojok kanan atas_ ]\n*2. Perangkat Tertaut*\n*3. Tautkan Perangkat*\n\n*Note :* _Jika hanya mempunyai hp 1, Buka link dibawah kode QR dengan perangkat lainnya_')
        if(deviceToStart?.settings?.pairMethod === 'code') await rem.sendFile(from, './media/img/wamdcode.png', 'wamdcode.png', 'Masukkan Kode Dibawah, cara lihat digambar\n\nKembali ke beranda WhastApp\n*1. Titik Tiga*\n[ _Pojok kanan atas_ ]\n*2. Perangkat Tertaut*\n*3. Tautkan Perangkat*\n*4. Tautkan dengan nomor telepon saja [ _Bawah sendiri_ ]*\n5. *Ketikkan kode yang kirim oleh bot*', '', 'imageMessage')

        await startBot(deviceToStart.apiKey, deviceToStart.nameDevice, (rem?.apiKey || rem), message.sender);
        return rem.reply(from, `*「 DEVICE 」*\n\nPerangkat *${deviceToStart.nameDevice}* berhasil dimulai.`);
    }

    return rem.reply(from, `*「 DEVICE 」*\n\nPerintah tidak dikenali. Gunakan *${clientData.prefix}device* untuk melihat daftar perangkat yang tersedia.`);
}

module.exports = { priority, isAwait, cmd, messageHandler }