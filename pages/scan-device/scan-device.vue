<template>
	<view class="page-content">
		<button class="scan-btn" type="primary" @click="scanBtnClicked()">{{scanning ? '停止扫描' : '开始扫描'}}</button>
		<view class="title-box">
			<text>扫描列表</text>
			<view v-if="scanning" class="rotating-spin">
				<uni-icons type="spinner-cycle" size="20"></uni-icons>
			</view>

		</view>
		<view class="scan-list-box">
			<view v-for="(item, index) in deviceList" :key="index" class="list-item" @click="selectDevice(item)">
				<view class="item-box">
					<view class="item-body-box">
						<view class="ble-name">{{item.name ? item.name : '未知设备'}}</view>
						<view class="info-box">
							<view>地址：{{item.deviceId}}</view>
							<view>RSSI:{{item.RSSI}}</view>
						</view>

					</view>

					<!-- <view class="btn-box">
						<button size="mini" type="primary" @click="selectDevice(item)">连接</button>
					</view> -->

				</view>

			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue';
	import {
		onLoad,
		onUnload
	} from '@dcloudio/uni-app'
	import * as bleUtil from '../../utils/bleUtil.js'
	import * as bleConfig from '../../utils/bleConfig.js'

	const bleAvailable = ref(false) //蓝牙是否可用
	const scanning = ref(false)
	const deviceList = ref([])
	// 连接的设备
	const connectDeviceId = ref(null)
	const connectDeviceName = ref('')
	const maxGroupBytesLen = ref(20)
	const hasConfig = ref(false) // 是否支持配置模式

	onLoad(() => {
		initBluetoothAdapter()
	})

	onUnload(() => {
		// 关闭蓝牙
		uni.closeBluetoothAdapter({
			success: function() {

			}
		})
	})

	function initBluetoothAdapter() {
		uni.openBluetoothAdapter({
			success: e => {
				console.log('初始化蓝牙成功:' + e.errMsg);
				console.log(JSON.stringify(e));
				getBluetoothAdapterState();
			},
			fail: e => {
				console.log(e)
				console.log('初始化蓝牙失败，错误码：' + (e.errCode || e.errMsg));
				if (e.errCode !== 0) {
					initTypes(e.errCode, e.errMsg);
				}
			},
			complete() {}
		});
	}

	/**
	 * 获取本机蓝牙适配器状态
	 */
	function getBluetoothAdapterState() {

		uni.getBluetoothAdapterState({
			success: res => {

				bleAvailable.value = res.available;
				scanning.value = res.discovering;

				// 蓝牙不可用
				if (!res.available) {
					toast('当前蓝牙不可用');
				} else {
					startBluetoothDevicesDiscovery();
				}
			},
			fail: e => {
				console.log('获取本机蓝牙适配器状态失败，错误码：' + e.errCode);
				if (e.errCode !== 0) {
					initTypes(e.errCode);
				}
			}
		});

		// 监听蓝牙状态
		uni.onBluetoothAdapterStateChange(function(res) {
			bleAvailable.value = res.available;
			scanning.value = res.available && res.discovering;

			// 当蓝牙不可用时，停止蓝牙搜索，避免蓝牙可用时，还处于搜索状态
			if (!res.available) {
				stopBluetoothDevicesDiscovery();
			}
		});
	}

	/**
	 * 开始搜索蓝牙设备
	 */
	function startBluetoothDevicesDiscovery() {

		uni.startBluetoothDevicesDiscovery({
			allowDuplicatesKey: true,
			powerLevel: 'high',
			success: e => {
				console.log('开始搜索蓝牙设备:' + e.errMsg);

				onBluetoothDeviceFound();
			},
			fail: e => {
				console.log('搜索蓝牙设备失败，错误码：' + e.errCode);
				if (e.errCode !== 0) {
					initTypes(e.errCode);
				}
			}
		});
	}
	/**
	 * 停止搜索蓝牙设备
	 */
	function stopBluetoothDevicesDiscovery() {
		uni.stopBluetoothDevicesDiscovery({
			success: e => {
				console.log('停止搜索蓝牙设备:' + e.errMsg);
			},
			fail: e => {
				console.log('停止搜索蓝牙设备失败，错误码：' + e.errCode + e.errMsg);
				if (e.errCode !== 0) {
					initTypes(e.errCode);
				}
			}
		});
	}

	/**
	 * 发现外围设备
	 */
	function onBluetoothDeviceFound() {
		uni.onBluetoothDeviceFound(devices => {
			// console.log('开始监听寻找到新设备的事件', devices);
			updateDevicesList(devices.devices)
		});
	}


	/**
	 * 更新设备列表
	 * @param {Object} devices 蓝牙设备列表
	 */
	function updateDevicesList(devices) {

		for (let device of devices) {
			var isAdd = true; // 需要添加
			var updateIndex = -1; // 需要更新的位置


			// 过滤设备
			var advertisServiceUUIDs = device.advertisServiceUUIDs;
			if (device.advertisServiceUUIDs === undefined || advertisServiceUUIDs == null) {

				return;
			}
			

			// 第一个服务为6958
			if (advertisServiceUUIDs.length == 1 &&
				advertisServiceUUIDs[0] == "00006958-0000-1000-8000-00805F9B34FB") {


			} else if (advertisServiceUUIDs.length == 4 &&
				advertisServiceUUIDs[0] == "00006958-0000-1000-8000-00805F9B34FB") {


			} else if (advertisServiceUUIDs.length == 4 &&
				advertisServiceUUIDs[0] == "00006959-0000-1000-8000-00805F9B34FB") {

			} else {
				return;
			}
			

			for (let i = 0; i < deviceList.value.length; i++) {
				const item = deviceList.value[i];
				if (device.deviceId == item.deviceId) {
					updateIndex = i;
					isAdd = false;
					break;
				}
			}
			

			if (isAdd) {
				deviceList.value.push(device);
			} else {
				deviceList.value[updateIndex] = device;
			}
		}
	}


	// 扫描按钮点击
	function scanBtnClicked() {

		if (!bleAvailable.value) {
			initBluetoothAdapter();
			return;
		}

		// 正在扫描，则调用停止
		if (scanning.value) {
			stopBluetoothDevicesDiscovery();
		} else {
			deviceList.value = [];
			startBluetoothDevicesDiscovery();
		}
	}


	/**
	 * 选择设备
	 * @param {Object} device 选择得设备
	 */
	async function selectDevice(device) {
		uni.showLoading({
			title: "连接中..."
		})

		try {
			await connect(device)
		} catch (e) {
			console.log("连击失败", e)
			bleUtil.disconnectDevice(device.deviceId)
			uni.hideLoading()
			uni.showToast({
				icon: 'none',
				title: e.message
			})
			return
		}

		uni.hideLoading()


		uni.navigateTo({
			url: `../device-info/device-info`,
			success: function(res) {
				// 通过eventChannel向被打开页面传送数据
				res.eventChannel.emit('acceptDataFromOpenerPage', {
					device: device,
					maxGroupBytesLen: maxGroupBytesLen.value,
					hasConfig: hasConfig.value
				})
			}
		})
	}

	async function disconnectDevice(deviceId) {
		await bleUtil.disconnectDevice(deviceId)

		connectDeviceId.value = null
		connectDeviceName.value = ''
	}

	async function connect(device) {
		let err = null
		const deviceId = device.deviceId

		// 连接5次
		for (let index = 0; index < 5; index++) {
			console.log(`连接第${index + 1}次`)
			err = null
			try {
				// 连接设备
				await bleUtil.connectToDevice(deviceId)
				break
			} catch (error) {
				err = error

				await bleUtil.timeout(500)

				await bleUtil.disconnectDevice(deviceId)

				await bleUtil.timeout(500)
			}
		}

		if (err) {
			throw err
		}

		console.log('连接成功')
		connectDeviceId.value = deviceId

		// 延迟500ms
		await bleUtil.timeout(500)

		console.log('连接成功, app 状态，开始扫描')

		// 扫描服务
		const services = await bleUtil.scanService(deviceId)

		console.log('扫描服务完成')
		
		// 是否支持配置模式
		hasConfig.value = await openConfigNotify(deviceId, services)

		// 查找服务
		const dataService = services.find(
			(service) =>
			service.uuid.toUpperCase() === bleConfig.SERVICE_UUID.toUpperCase(),
		)
		if (!dataService) {
			throw new Error('不能识别的设备')
		}

		// 获取配置服务的特征值
		const characteristics = await bleUtil.scanCharacteristics(
			deviceId,
			dataService.uuid,
		)

		console.log('扫描特征完成', characteristics)

		// 检查是否存在所需的特征值
		const dataCharacteristics = characteristics.find(
			(char) =>
			char.uuid.toUpperCase() ===
			bleConfig.NOTIFY_CHARACTERISTIC_UUID.toUpperCase(),
		)

		if (!dataCharacteristics) {
			throw new Error('未找到服务')
		}

		console.log('开始打开通知')
		// 打开通知
		await bleUtil.enableNotification(
			deviceId,
			bleConfig.SERVICE_UUID,
			bleConfig.NOTIFY_CHARACTERISTIC_UUID,
		)


		console.log(`打开通知成功`)

		console.log('开始设置mtu')
		// 设置mtu 注意：：：要在打开通知之后调用（否则有的手机不好使，导致发送失败，显示没有写属性）
		const mtu = await bleUtil.changeMtu(deviceId, 512)
		maxGroupBytesLen.value = mtu - 3


		console.log(`设置MTU，MTU为${mtu}`)
	}

	async function openConfigNotify(deviceId, services) {
		// 查找服务
		const configService = services.find(
			(service) =>
			service.uuid.toUpperCase() === bleConfig.CONFIG_SERVICE_UUID.toUpperCase(),
		)
		// 不支持配置
		if (!configService) {
			return false
		}
		
		// 获取配置服务的特征值
		const characteristics = await bleUtil.scanCharacteristics(
			deviceId,
			configService.uuid,
		)
		
		console.log('扫描特征完成', characteristics)
		
		// 检查是否存在所需的特征值
		const configCharacteristics = characteristics.find(
			(char) =>
			char.uuid.toUpperCase() ===
			bleConfig.CONFIG_NOTIFY_CHARACTERISTIC_UUID.toUpperCase(),
		)
		
		if (!configCharacteristics) {
			return false
		}
		
		console.log('开始打开配置通知')
		try{
			// 打开通知
			await bleUtil.enableNotification(
				deviceId,
				bleConfig.CONFIG_SERVICE_UUID,
				bleConfig.CONFIG_NOTIFY_CHARACTERISTIC_UUID,
			)
			return true
		} catch {
			return false
		}
		
	}

	/**
	 * 判断初始化蓝牙状态
	 */
	function initTypes(code, errMsg) {
		switch (code) {
			case 10000:
				toast('未初始化蓝牙适配器');
				break;
			case 10001:
			case 10015:
				toast('未检测到蓝牙，请打开蓝牙重试！');
				break;
			case 10002:
				toast('没有找到指定设备');
				break;
			case 10003:
				toast('连接失败');
				break;
			case 10004:
				toast('没有找到指定服务');
				break;
			case 10005:
				toast('没有找到指定特征值');
				break;
			case 10006:
				toast('当前连接已断开');
				break;
			case 10007:
				toast('当前特征值不支持此操作');
				break;
			case 10008:
				toast('其余所有系统上报的异常');
				break;
			case 10009:
				toast('Android 系统特有，系统版本低于 4.3 不支持 BLE');
				break;
			default:
				toast(errMsg);
		}
	}

	/**
	 * 弹出框封装
	 */
	function toast(content, showCancel = false) {
		uni.showModal({
			title: '提示',
			content,
			showCancel
		});
	}
</script>


<style lang="scss" scoped>
	.page-content {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 16rpx;
		background-color: #f0f0f0;
		box-sizing: border-box;
	}

	.scan-btn {
		width: 90%;
	}

	.title-box {
		color: #333;
		font-size: 15px;
		display: flex;
		padding-top: 20rpx;
	}

	.scan-list-box {
		flex: 1;
		height: 0;
		overflow-y: auto;
	}

	/* 旋转动画定义：从0°转到360° */
	@keyframes rotate {
		0% {
			transform: rotate(0deg);
			/* 初始角度 */
		}

		100% {
			transform: rotate(360deg);
			/* 结束角度（一圈） */
		}
	}

	.rotating-spin {
		animation: rotate 1.5s linear infinite;
		/* 1s转一圈，线性速度，无限循环 */
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.list-item {
		width: 100%;
		padding: 20rpx 10rpx 20rpx 10rpx;
		box-sizing: border-box;
		margin-bottom: 20rpx;
		background-color: #fafafa;
		font-size: 14px;
	}

	.item-box {
		padding: 10rpx;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 18rpx;
		color: #666;

		.item-body-box {
			flex: 1;
			align-items: center;
		}

		.info-box {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			white-space: normal;
			word-wrap: break-word; // 允许长单词/字符串换行
			word-break: break-all; // 强制在任意字符处换行（适配连续无分隔文本）
		}

		.btn-box {
			display: flex;
			flex-direction: column;
			gap: 14rpx;
		}
	}

	.ble-name {
		font-size: 20px;
		color: #333;
		padding-bottom: 10rpx;
	}
</style>