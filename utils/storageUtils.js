let communicationMode = "数据模式"

export function getcommunicationMode() {
	return communicationMode
}

export function setcommunicationMode(mode) {
	communicationMode = mode
}

export function getDataCode() {
	try {
		const value = uni.getStorageSync('dataCode');
		return value ? value: 'ASCII'
		
	} catch(e) {
		return 'ASCII'
	}
	
}

export function setDataCode(code) {
	uni.setStorageSync('dataCode', code);
}