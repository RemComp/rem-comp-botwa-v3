const { randomBytes } = require('crypto');
const axios = require('axios');

const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
const isBase64 = (str) => base64RegExp.test(str);
const buildBase64Data = (mime, buffer) => {
    const base64Data = buffer.toString('base64');
    return `data:${mime};base64,${base64Data}`;
};

async function requestToGolangEngine(path, data, options = {}) {
	try {
		if(!global.golangEngine.url) {
			global.log?.error(`Golang engine URL is not set. Please ensure the engine is initialized.`);
			return new Error('whatsmeowerr_engine_not_ready')
		}

		const response = await axios.post(`${global.golangEngine.url}${path}`, { data }, Object.assign({ validateStatus: () => true }, options))
		return response.data
	} catch(e) {
		console.error(`Error request to golang engine:`, e.message)
		global?.log?.warn(`Error request to golang engine:`, e)
		return { error: e }
	}
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi untuk mengubah huruf pertama menjadi lowercase
const uncapitalizeFirstLetter = (str) => {
	if (typeof str !== 'string') return str;
	return str.charAt(0).toLowerCase() + str.slice(1);
};

// Fungsi rekursif untuk mengubah semua keys dalam object
const transformKeysFromCapitalizeToStandartObject = (obj) => {
	// Jika input bukan object atau null, kembalikan langsung
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	// Jika array, proses setiap elemen
	if (Array.isArray(obj)) {
		return obj.map(item => transformKeysFromCapitalizeToStandartObject(item));
	}

	// Buat object baru untuk menyimpan hasil
	const newObj = {};

	// Proses setiap key dalam object
	Object.keys(obj).forEach(key => {
		// Ubah key menjadi lowercase di huruf pertama
		const newKey = uncapitalizeFirstLetter(key);

		// Proses value secara rekursif jika berupa object
		newObj[newKey] = transformKeysFromCapitalizeToStandartObject(obj[key]);
	});

	return newObj;
};

function timeConvert(input, now = new Date().getTime()) {
    var timeleft = input - now;

    var days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
    var hours = Math.floor((timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

    return {day: days, hour: hours, minute: minutes, second: seconds}
}

function numberWithCommas(x) {
	if(global?.isFalseCommas?.includes(senderFunction)) return x.toString()
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function numberWithCommas2(x) {
	return x.toString().replace(/\B(?=(\d{2})+(?!\d))/g, ".");
}
function fixNumberEPlus(number) {
    var data = number.toString().split(/[eE]/);
    if (data.length == 1) return data[0];
  
    let z = '',
    sign = number < 0 ? '-' : '',
    str = data[0].replace('.', ''),
    mag = Number(data[1]) + 1;
  
    if (mag < 0) {
      z = sign + '0.';
      while (mag++) z += '0';
      return z + str.replace(/^\-/, '');
    }
    mag -= str.length;
    while (mag--) z += '0';
    return str + z;
}

const showElapsedTime = (timestamp) => {
    if (typeof timestamp !== 'number') return 'NaN'        

    const SECOND = 1000
    const MINUTE = 1000 * 60
    const HOUR = 1000 * 60 * 60
    const DAY = 1000 * 60 * 60 * 24
    const MONTH = 1000 * 60 * 60 * 24 * 30
    const YEAR = 1000 * 60 * 60 * 24 * 30 * 12
    
    const elapsed = ((new Date()).valueOf() - timestamp)
    
    if (elapsed <= MINUTE) return `${Math.round(elapsed / SECOND)} Detik`
    if (elapsed <= HOUR) return `${Math.round(elapsed / MINUTE)} Menit`
    if (elapsed <= DAY) return `${Math.round(elapsed / HOUR)} Jam`
    if (elapsed <= MONTH) return `${Math.round(elapsed / DAY)} Hari`
    if (elapsed <= YEAR) return `${Math.round(elapsed / MONTH)} Bulan`
    return `${Math.round(elapsed / YEAR)} Tahun`
}

function shuffleArray(array) {
    var currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}   

function formatRequiredDataClient(rem, _userDb, _groupDb, message) {
	const botNumber = rem.user.jid
	const groupAdmins = message.isGroupMsg && _groupDb?.metadata ? _groupDb?.metadata.filter(admn => admn.admin != null).map(admn2 => admn2.id) : ''
	const isGroupAdmins = message.isGroupMsg ? groupAdmins.includes(message.sender) : false
	const isBotGroupAdmins = message.isGroupMsg ? groupAdmins.includes(botNumber) : false

	const isBanned = _userDb.isBanned || false
	const isSuperBanned = _userDb.isSuperBanned || false
	const isPrem = _userDb.isPremium
	const isSuperOwner = ownerNumber.includes(sender)
	const isOwner = ownerNumber2.includes(sender)
	const isSideOwner = sideOwnerNumber.includes(sender)
	const isAdmin = _userDb.isAdmin || isSideOwner || isOwner || isSuperOwner
	const isMod = _userDb.rl.isMod || isSideOwner || isOwner || isSuperOwner

	let prefix = '.'
	if(isGroupMsg) {
		prefix = _groupDb?.prefix || '.'
	} else {
		if(body != undefined ? body.startsWith('!') : false) {
			prefix = '!'
		} else if(body != undefined ? body.startsWith('.') : false) {
			prefix = '.'
		} else if(caption != undefined && caption.startsWith('!')) {
			prefix = '!'
		} else if(caption != undefined && caption.startsWith('.')) {
			prefix = '.'
		} else if(message.selectedButtonId != undefined && message.selectedButtonId.startsWith('!')) {
			prefix = '!'
		} else if(message.selectedButtonId != undefined && message.selectedButtonId.startsWith('.')) {
			prefix = '.'
		} else if(message.selectedRowId != undefined && message.selectedRowId.startsWith('!')) {
			prefix = '!'
		} else if(message.selectedRowId != undefined && message.selectedRowId.startsWith('.')) {
			prefix = '.'
		}
	}

	const args = (caption || body || '').split(' ')
	let allArgs = args
	if(message.selectedButtonId != undefined && message.selectedButtonId.startsWith(prefix)) {
		allArgs = message.selectedButtonId.split(' ') || ''
	} else if(message.selectedRowId != undefined && message.selectedRowId.startsWith(prefix)) {
		allArgs = message.selectedRowId.split(' ') || ''
	} else {
		allArgs = commands.split(' ') || ''
	}
	const isCmd = allArgs[0].toLowerCase().startsWith(prefix)

	return {
		prefix, args, allArgs, isCmd,
		isGroupAdmins, isBotGroupAdmins, isPrem, isSuperOwner, isOwner, isSideOwner, isAdmin, isMod, isBanned, isSuperBanned
	}
}

function generateRandomString(length) {
  return randomBytes(length / 2).toString('hex').slice(0, length);
}

module.exports = {
	buildBase64Data,
	isBase64,
    requestToGolangEngine,
    sleep,
    transformKeysFromCapitalizeToStandartObject,
	timeConvert,
	numberWithCommas,
	numberWithCommas2,
	fixNumberE: fixNumberEPlus,
	showElapsedTime,
	shuffleArray,
	formatRequiredDataClient,
	generateRandomString
}