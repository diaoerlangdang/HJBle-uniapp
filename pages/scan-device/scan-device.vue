<template>
	<view class="content">
		<button class="scan-btn" type="primary" @click="scanBtnClicked()">{{bleDiscovering ? '停止扫描' : '开始扫描'}}</button>
		<div v-for="(item, index) in deviceList" :key="index" class="list-item" @click="selectDevice(index)">
			<div class="div-flex">
				<view class="ble-name">名称：{{item.name ? item.name : '未知设备'}}</view>
				<view>RSSI:{{item.RSSI}}</view>
			</div>
			<view v-if="item.mac">地址：{{item.mac}}</view>
		</div>
	</view>
</template>

<script>
	export default {
		data() {
			return {

				bleDiscovering: false, //蓝牙是否正在搜索
				bleAvailable: false, //蓝牙是否可用

				deviceList: []
			}
		},
		onLoad() {
			this.initBluetoothAdapter();
		},
		onUnload: function() {
			// 关闭蓝牙
			uni.closeBluetoothAdapter({
				success: function() {

				}
			})
		},
		onShow() {
			this.deviceList = [];			
		},
		methods: {

			// 扫描按钮点击
			scanBtnClicked() {

				if (!this.bleAvailable) {
					this.initBluetoothAdapter();
					return;
				}

				// 正在扫描，则调用停止
				if (this.bleDiscovering) {
					this.stopBluetoothDevicesDiscovery();
				} else {
					this.deviceList = [];
					this.startBluetoothDevicesDiscovery();
				}
			},

			/**
			 * 选择设备
			 * @param {Object} index 选择设备的位置
			 */
			selectDevice(index) {
				var device = this.deviceList[index];

				uni.navigateTo({
					url: "../device-info/device-info",
					success: function(res) {
						// 通过eventChannel向被打开页面传送数据
						res.eventChannel.emit('acceptDataFromOpenerPage', {
							device: device
						})
					}
				})
			},

			/**
			 * 初始化蓝牙设备
			 */
			initBluetoothAdapter() {
				var that = this;
				uni.openBluetoothAdapter({
					success: e => {
						console.log('初始化蓝牙成功:' + e.errMsg);
						console.log(JSON.stringify(e));
						that.getBluetoothAdapterState();
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
			},
			/**
			 * 获取本机蓝牙适配器状态
			 */
			getBluetoothAdapterState() {

				var that = this;
				uni.getBluetoothAdapterState({
					success: res => {

						that.bleAvailable = res.available;
						that.bleDiscovering = res.discovering;

						// 蓝牙不可用
						if (!res.available) {
							toast('当前蓝牙不可用');
						} else {
							that.startBluetoothDevicesDiscovery();
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
					that.bleAvailable = res.available;
					that.bleDiscovering = res.available && res.discovering;

					// 当蓝牙不可用时，停止蓝牙搜索，避免蓝牙可用时，还处于搜索状态
					if (!res.available) {
						that.stopBluetoothDevicesDiscovery();
					}
				});
			},

			/**
			 * 开始搜索蓝牙设备
			 */
			startBluetoothDevicesDiscovery() {
				var that = this;
				uni.startBluetoothDevicesDiscovery({
					allowDuplicatesKey: true,
					success: e => {
						console.log('开始搜索蓝牙设备:' + e.errMsg);

						that.onBluetoothDeviceFound();
					},
					fail: e => {
						console.log('搜索蓝牙设备失败，错误码：' + e.errCode);
						if (e.errCode !== 0) {
							initTypes(e.errCode);
						}
					}
				});
			},
			/**
			 * 停止搜索蓝牙设备
			 */
			stopBluetoothDevicesDiscovery() {
				uni.stopBluetoothDevicesDiscovery({
					success: e => {
						console.log('停止搜索蓝牙设备:' + e.errMsg);

						// this.searchLoad = false;
					},
					fail: e => {
						console.log('停止搜索蓝牙设备失败，错误码：' + e.errCode + e.errMsg);
						if (e.errCode !== 0) {
							initTypes(e.errCode);
						}
					}
				});
			},
			/**
			 * 发现外围设备
			 */
			onBluetoothDeviceFound() {
				uni.onBluetoothDeviceFound(devices => {
					// console.log('开始监听寻找到新设备的事件', devices);
					this.updateDevicesList(devices.devices)
					// this.$set(this.disabled, 3, false);
					// this.getBluetoothDevices();
				});
			},

			/**
			 * 更新设备列表
			 * @param {Object} devices 蓝牙设备列表
			 */
			updateDevicesList(devices) {

				for (let deviceIndex in devices) {
					var isAdd = true; // 需要添加
					var updateIndex = -1; // 需要更新的位置

					var isEasy = false; // 是否支持简易模式
					var isConfig = false; // 是否支持配置
					var sendMaxLen = 20; // 每包最大发送数量
					var mac = ""; // mac 地址

					// 过滤设备
					var advertisServiceUUIDs = devices[deviceIndex].advertisServiceUUIDs;
					if (devices[deviceIndex].advertisServiceUUIDs === undefined || advertisServiceUUIDs == null) {

						return;
					}

					// 第一个服务为6958
					if (advertisServiceUUIDs.length == 1 &&
						advertisServiceUUIDs[0] == "00006958-0000-1000-8000-00805F9B34FB") {

						isEasy = false;
						isConfig = false;
						sendMaxLen = 20;

					} else if (advertisServiceUUIDs.length == 4 &&
						advertisServiceUUIDs[0] == "00006958-0000-1000-8000-00805F9B34FB") {

						isEasy = false;
						isConfig = true;
						sendMaxLen = 160;

						mac = advertisServiceUUIDs[1].substr(4, 2) + ':' +
							advertisServiceUUIDs[1].substr(6, 2) + ':' +
							advertisServiceUUIDs[2].substr(4, 2) + ':' +
							advertisServiceUUIDs[2].substr(6, 2) + ':' +
							advertisServiceUUIDs[3].substr(4, 2) + ':' +
							advertisServiceUUIDs[3].substr(6, 2);

					} else if (advertisServiceUUIDs.length == 4 &&
						advertisServiceUUIDs[0] == "00006959-0000-1000-8000-00805F9B34FB") {

						isEasy = true;
						isConfig = true;
						sendMaxLen = 160;

						mac = advertisServiceUUIDs[1].substr(4, 2) + ':' +
							advertisServiceUUIDs[1].substr(6, 2) + ':' +
							advertisServiceUUIDs[2].substr(4, 2) + ':' +
							advertisServiceUUIDs[2].substr(6, 2) + ':' +
							advertisServiceUUIDs[3].substr(4, 2) + ':' +
							advertisServiceUUIDs[3].substr(6, 2);

					} else {
						return;
					}


					for (var i = 0; i < this.deviceList.length; i++) {
						const item = this.deviceList[i];
						if (devices[deviceIndex].deviceId == item.deviceId) {
							updateIndex = i;
							isAdd = false;
							break;
						}
					}
					devices[deviceIndex].isEasy = isEasy;
					devices[deviceIndex].isConfig = isConfig;
					devices[deviceIndex].sendMaxLen = sendMaxLen;
					devices[deviceIndex].mac = mac;

					if (isAdd) {
						this.deviceList.push(devices[deviceIndex]);
					} else {
						this.deviceList[updateIndex] = devices[deviceIndex];
					}
				}
			}
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

<style>
	.content {
		margin-left: 20rpx;
		margin-right: 30rpx;
	}

	.scan-btn {
		margin-top: 20rpx;
		margin-bottom: 20rpx;
	}

	.list-item {
		width: 100%;
		padding: 20rpx 10rpx 20rpx 10rpx;
		margin-bottom: 20rpx;
		background-color: #fafafa;
	}

	.div-flex {
		display: flex;
	}

	.ble-name {
		flex: 1;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 36rpx;
		color: #8f8f94;
	}
</style>
