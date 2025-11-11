// 连接到设备
function connectToDevice(deviceId) {
	return new Promise((resolve, reject) => {
		uni.createBLEConnection({
			deviceId: deviceId,
			timeout: 10000,
			success: () => {
				resolve(true)
			},
			fail: (err) => reject(new Error(`连接失败: ${err.errMsg}`)), // ${JSON.stringify(err)}
		})
	})
}

// 断开连接
function disconnectDevice(deviceId) {
	return new Promise((resolve, reject) => {
		uni.closeBLEConnection({
			deviceId: deviceId,
			success: () => resolve(true),
			fail: (err) => resolve(false),
		})
	})
}

// 扫描服务
function scanService(deviceId) {
	console.log('scanService 开始', deviceId)
	return new Promise((resolve, reject) => {
		uni.getBLEDeviceServices({
			deviceId: deviceId,
			success: (res) => {
				console.log('scanService 成功')
				resolve(res.services)
			},
			fail: (err) => {
				console.log('scanService 失败')
				reject(new Error(`扫描服务失败: ${err.errMsg}`))
			},
		})
	})
}

// 扫描服务的特征值
function scanCharacteristics(deviceId, serviceId) {
	return new Promise((resolve, reject) => {
		uni.getBLEDeviceCharacteristics({
			deviceId: deviceId,
			serviceId,
			success: (res) => {
				resolve(res.characteristics)
			},
			fail: (err) => reject(new Error(`扫描特征值失败: ${err.errMsg}`)),
		})
	})
}

// 交换mtu
function changeMtu(deivceId, mtu = 247) {
	return new Promise((resolve, reject) => {
		uni.setBLEMTU({
			deviceId: deivceId,
			mtu,
			success: (res) => {
				console.log('changeMtu', res)
				resolve(mtu)
			},
			fail: (err) => {
				console.warn(`MTU设置失败: ${JSON.stringify(err)}，继续执行后续操作`)
				resolve(23) // 允许失败但继续流程
			},
		})
	})
}

// 打开通知
function enableNotification(deivceId, serviceId, characteristicId) {
	return new Promise((resolve, reject) => {
		uni.notifyBLECharacteristicValueChange({
			deviceId: deivceId,
			serviceId,
			characteristicId,
			state: true,
			success: () => resolve(),
			fail: (err) => reject(new Error(`打开通知失败: ${err.errMsg}`)),
		})
	})
}


// 打开通知
function disableNotification(deivceId, serviceId, characteristicId) {
	return new Promise((resolve, reject) => {
		uni.notifyBLECharacteristicValueChange({
			deviceId: deivceId,
			serviceId,
			characteristicId,
			state: false,
			success: () => resolve(),
			fail: (err) => reject(new Error(`打开通知失败: ${err.errMsg}`)),
		})
	})
}

/**
 * 向 BLE 设备写入数据（支持 ArrayBuffer ）
 * @param {string} deviceId - 蓝牙设备 ID
 * @param {string} serviceId - 服务 UUID
 * @param {string} characteristicId - 特征值 UUID
 * @param {ArrayBuffer} data - 要写入的数据（ArrayBuffer ）
 * @param {number} maxGroupLen - 每包发送的最大值，默认20
 * @param {string} writeType - 写入类型：'write'（有响应）或 'writeNoResponse'（无响应）
 * @param {number} timeout - 超时时间
 * @returns {Promise<boolean>} - 写入成功返回 true，失败返回 false
 */
async function writeDataAutoGroup(
	deviceId,
	serviceId,
	characteristicId,
	data,
	maxGroupLen = 20,
	writeType = 'write',
	timeout = 5000,
) {

	if (!(data instanceof ArrayBuffer)) {
		throw new Error('数据格式必须是 ArrayBuffer')
	}

	if (!Number.isInteger(maxGroupLen) || maxGroupLen <= 0) {
		throw new Error('maxGroupLen必须是正整数');
	}

	console.log('maxGroupLen', maxGroupLen)

	const totalLength = data.byteLength;
	const result = [];
	let offset = 0; // 当前偏移量

	// 循环截取子Buffer
	while (offset < totalLength) {
		// 计算当前组的结束位置（避免超出总长度）
		const end = Math.min(offset + maxGroupLen, totalLength);
		// 截取子Buffer（slice(start, end)：包含start，不包含end）
		const subBuffer = data.slice(offset, end);
		result.push(subBuffer);
		// 移动偏移量到下一组起始位置
		offset = end;

		const bSuccess = await writeData(deviceId, serviceId, characteristicId, data, writeType, timeout)
		if (!bSuccess) {
			return false
		}
	}

	return true
}



/**
 * 向 BLE 设备写入数据（支持 ArrayBuffer ）
 * @param {string} deviceId - 蓝牙设备 ID
 * @param {string} serviceId - 服务 UUID
 * @param {string} characteristicId - 特征值 UUID
 * @param {ArrayBuffer} data - 要写入的数据（ArrayBuffer ）
 * @param {string} writeType - 写入类型：'write'（有响应）或 'writeNoResponse'（无响应）
 * @param {number} timeout - 超时时间
 * @returns {Promise<boolean>} - 写入成功返回 true，失败返回 false
 */
async function writeData(
	deviceId,
	serviceId,
	characteristicId,
	data,
	writeType = 'write',
	timeout = 5000,
) {
	// 处理数据格式（转换为 ArrayBuffer）
	let buffer
	if (data instanceof ArrayBuffer) {
		// 直接使用 ArrayBuffer
		buffer = data
	} else {
		throw new Error('数据格式必须是 ArrayBuffer')
	}

	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error('写入操作超时'))
		}, timeout)

		console.log('发送：', ab2hex(buffer), serviceId, characteristicId)
		uni.writeBLECharacteristicValue({
			deviceId,
			serviceId,
			characteristicId,
			value: buffer,
			writeType,
			success: () => {
				console.log('数据写入成功')
				clearTimeout(timeoutId) // 清除超时定时器
				resolve(true)
			},
			fail: (err) => {
				console.error('数据写入失败:', err)
				clearTimeout(timeoutId) // 清除超时定时器
				resolve(false)
			},
		})
	})
}

/**
 * 发送数据到BLE设备并等待响应
 * @param {Object} options - 配置参数
 * @param {string} options.deviceId - 设备ID
 * @param {string} options.sendServiceId - 发送服务UUID
 * @param {string} options.sendCharacteristicId - 发送特征值UUID
 * @param {string} options.recvServiceId - 接收服务UUID
 * @param {string} options.recvCharacteristicId - 接收特征值UUID
 * @param {ArrayBuffer} options.data - 要发送的ArrayBuffer数据
 * @param {number} [options.timeout=5000] - 超时时间(毫秒)，默认5秒
 * @returns {Promise<Object>} - 返回Promise，成功时包含响应数据，失败时包含错误信息
 */
function sendReceive({
	deviceId,
	sendServiceId,
	sendCharacteristicId,
	recvServiceId,
	recvCharacteristicId,
	data,
	maxGroupLen = 20,
	writeType = 'write',
	timeout = 5000
}) {
	return new Promise((resolve, reject) => {
		// 超时定时器
		const timer = setTimeout(() => {
			// 超时处理，移除事件监听并返回失败
			uni.offBLECharacteristicValueChange(listener);
			reject(new Error(`发送数据后等待响应超时(${timeout}ms)`));
		}, timeout);

		// 特征值变化监听函数
		function listener(res) {
			// 验证是否是目标设备、服务和特征值的响应
			if (
				res.deviceId === deviceId &&
				res.serviceId === recvServiceId &&
				res.characteristicId === recvCharacteristicId
			) {
				// 收到正确的响应，清除定时器和监听
				clearTimeout(timer);
				uni.offBLECharacteristicValueChange(listener);

				// 解析数据并返回
				resolve({
					success: true,
					data: res.value, // ArrayBuffer格式的响应数据
					deviceId,
					recvServiceId,
					recvCharacteristicId
				});
			}
		}

		// 注册特征值变化监听
		uni.onBLECharacteristicValueChange(listener);

		writeDataAutoGroup(deviceId, sendServiceId, sendCharacteristicId, data, maxGroupLen, writeType).then((
			result) => {
			if (!result) {
				// 发送失败，清除定时器和监听
				clearTimeout(timer);
				uni.offBLECharacteristicValueChange(listener);
				reject(new Error(`发送数据失败:`));
			}
		}).catch(e => {
			reject(e)
		})


	});
}


/**
 * 将十六进制字符串转换为 ArrayBuffer
 */
function hex2ab(hexString) {
	// 移除空格和校验
	const cleanHex = hexString.replace(/\s/g, '')
	if (cleanHex.length % 2 !== 0) {
		throw new Error('十六进制字符串长度必须为偶数')
	}

	const buffer = new ArrayBuffer(cleanHex.length / 2)
	const view = new Uint8Array(buffer)

	for (let i = 0; i < cleanHex.length; i += 2) {
		view[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
	}

	return buffer
}

// buffer 转 十六进制字符串
function ab2hex(buffer) {
	let hexArr = Array.prototype.map.call(new Uint8Array(buffer), function(bit) {
		return ('00' + bit.toString(16)).slice(-2)
	})
	return hexArr.join('').toUpperCase()
}

/**
 * 将字符串根据 Unicode 编码转换为 ArrayBuffer
 */
function stringToArrayBuffer(str) {
	// 将字符串转换为 UTF-8 编码的字节序列
	const utf8 = unescape(encodeURIComponent(str))
	const buffer = new ArrayBuffer(utf8.length)
	const view = new Uint8Array(buffer)

	for (let i = 0; i < utf8.length; i++) {
		view[i] = utf8.charCodeAt(i)
	}

	return buffer
}

/**
 * 将 ArrayBuffer 根据 Unicode 编码转换回字符串
 */
function arrayBufferToString(buffer) {
	const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let str = '';
	let i = 0;
	const len = view.length;

	while (i < len) {
		const byte = view[i];
		let charCode = 0;

		// 处理 UTF-8 多字节规则
		if (byte < 0x80) {
			// 1 字节：0xxxxxxx（ASCII 兼容）
			charCode = byte;
			i++;
		} else if (byte >= 0xC0 && byte < 0xE0) {
			// 2 字节：110xxxxx 10xxxxxx
			if (i + 1 >= len) break; // 字节不足，容错退出
			charCode = ((byte & 0x1F) << 6) | (view[i + 1] & 0x3F);
			i += 2;
		} else if (byte >= 0xE0 && byte < 0xF0) {
			// 3 字节：1110xxxx 10xxxxxx 10xxxxxx（中文常用）
			if (i + 2 >= len) break;
			charCode = ((byte & 0x0F) << 12) | ((view[i + 1] & 0x3F) << 6) | (view[i + 2] & 0x3F);
			i += 3;
		} else if (byte >= 0xF0 && byte < 0xF8) {
			// 4 字节：11110xxx 10xxxxxx 10xxxxxx 10xxxxxx（特殊字符）
			if (i + 3 >= len) break;
			charCode = ((byte & 0x07) << 18) | ((view[i + 1] & 0x3F) << 12) | ((view[i + 2] & 0x3F) << 6) | (view[i +
				3] & 0x3F);
			i += 4;
		} else {
			// 非法 UTF-8 字节，用 � 替换
			charCode = 0xFFFD;
			i++;
		}

		str += String.fromCharCode(charCode);
	}

	return str;
}


// 提取uuid中变为2字节，并翻转
function extractBytesFromUUID(uuid) {
	// 移除连字符并转换为大写
	const cleanUUID = uuid.replace(/-/g, '').toUpperCase()

	// 验证 UUID 格式
	if (cleanUUID.length !== 32 || !/^[0-9A-F]+$/.test(cleanUUID)) {
		throw new Error('无效的 UUID 格式')
	}

	// 提取第一段的后半部分 (字符 8-11)
	const firstPart = cleanUUID.substring(4, 8)

	// 转换字节顺序 (大端序 → 小端序)
	const reversedBytes = firstPart.match(/.{2}/g).reverse().join('') // "D69E"

	return reversedBytes
}

/**
 * 微信小程序中可await的超时等待函数
 * @param {number} ms - 等待的毫秒数
 * @returns {Promise<void>} 一个Promise，在指定毫秒后resolve
 */
function timeout(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

/**
 * 判断字符串是否为十六进制字符串
 * @param {String} str - 待判断的字符串
 * @returns {Boolean} 是十六进制字符串则返回true，否则返回false
 */
function isHexString(str) {
	// 排除非字符串类型
	if (typeof str !== 'string') {
		return false;
	}
	// 正则规则：仅包含0-9、a-f、A-F，且至少1个字符
	const hexReg = /^[0-9a-fA-F]+$/;
	return hexReg.test(str);
}


export {
	connectToDevice,
	disconnectDevice,
	scanService,
	scanCharacteristics,
	changeMtu,
	enableNotification,
	writeData,
	writeDataAutoGroup,

	hex2ab,
	ab2hex,
	stringToArrayBuffer,
	arrayBufferToString,
	extractBytesFromUUID,
	timeout,
	isHexString,
}