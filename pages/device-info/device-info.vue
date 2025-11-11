<template>
	<view class="page-content">
		<view class="title-box">
			<text>日志：</text>
			<view class="btn-box">
				<button size="mini" type="primary" plain="true" @click="setConfig">设置</button>
				<button size="mini" type="primary" plain="true" @click="clearLog">清屏</button>
			</view>
		</view>

		<view class="log-box">
			<view v-for="(item, index) in logList" :key="index" class="log-item" @click="selectLog(item)">
				<view class="item-header">
					<text v-if="item.dataType == DATA_TYPE_SEND" class="send-txt">发送：</text>
					<text v-else-if="item.dataType == DATA_TYPE_RECEIVE" class="receive-txt">接收：</text>
					<text v-else-if="item.dataType == DATA_TYPE_FAILED" class="failed-txt">失败：</text>
					<text v-else class="other-txt">其他：</text>
					<text>{{item.time}}</text>
				</view>
				<view class="item-body">
					{{item.dataInfo}}
				</view>
			</view>
		</view>

		<view class="input-box">
			<input class="input-wrap" v-model="inputData" :placeholder="inputPlaceHoler" confirm-type="send"
				@confirm="sendData" />
			<button size="mini" type="primary" @click="sendData">发送</button>
		</view>
	</view>
</template>

<script setup>
	import * as bleUtil from '../../utils/bleUtil.js'
	import * as bleConfig from '../../utils/bleConfig.js'
	import * as util from '../../utils/util.js'
	import * as storageUtils from '../../utils/storageUtils.js'
	import {
		ref,
		getCurrentInstance,
		computed
	} from 'vue';
	import {
		onLoad,
		onUnload,
		onShow
	} from '@dcloudio/uni-app'


	// 其他类型
	const DATA_TYPE_OTHER = 'other'
	// 发送类型
	const DATA_TYPE_SEND = 'send'
	// 接收类型
	const DATA_TYPE_RECEIVE = 'receive'
	// 失败类型
	const DATA_TYPE_FAILED = 'failed'

	const currentDevice = ref(null)

	// 当前设备每包最大的发送数据长度
	const maxGroupBytesLen = ref(20)

	const hasConfig = ref(false)

	// 发送数据编码，hex ascii
	const dataCode = ref('ASCII')
	const communicationMode = ref('')

	// 日志列表
	const logList = ref([])

	const inputData = ref('')

	// 1. 获取页面实例（关键：替代 this）
	const instance = getCurrentInstance();
	// 2. 获取事件通道（等同于 Vue2 的 this.getOpenerEventChannel()）
	const eventChannel = instance.proxy.getOpenerEventChannel();

	const inputPlaceHoler = computed(() => {
		return dataCode.value == 'HEX' ? "请输入十六进制数据" : "请输入字符数据"
	})

	onLoad(() => {

		eventChannel.on('acceptDataFromOpenerPage', (data) => {
			currentDevice.value = data.device;
			maxGroupBytesLen.value = data.maxGroupBytesLen ?? 20
			hasConfig.value = data.hasConfig
			uni.setNavigationBarTitle({
				title: currentDevice.value.name + '_' + communicationMode.value
			});


		});

		listenNotifications()
	})

	onUnload(() => {
		if (currentDevice.value) {
			uni.closeBLEConnection({
				deviceId: currentDevice.value.deviceId,
				success() {

				}
			});
		}

	})

	onShow(() => {
		dataCode.value = storageUtils.getDataCode()
		communicationMode.value = storageUtils.getcommunicationMode()
		if (currentDevice.value) {
			uni.setNavigationBarTitle({
				title: currentDevice.value.name + '_' + communicationMode.value
			});
		}
	})

	//设置
	function setConfig() {
		uni.navigateTo({
			url: `../set-info/set-info?hasConfig=${hasConfig.value}`
		})
	}

	function clearLog() {
		logList.value = []
	}

	function selectLog(item) {
		uni.setClipboardData({
			data: item.dataInfo,
			success() {
				uni.showToast({
					title: "复制成功"
				})
			}
		})
	}

	function sendData() {
		if (dataCode.value == 'HEX') {
			sendHexData()
		} else {
			sendUtf8Data()
		}
	}

	function sendUtf8Data() {
		if (inputData.value.length == 0) {
			uni.showToast({
				icon: 'none',
				title: "请输入数据"
			})
			return
		}

		const strData = inputData.value

		const bufferData = bleUtil.stringToArrayBuffer(strData)

		logList.value.push({
			dataType: DATA_TYPE_SEND,
			time: util.formatTime(),
			dataInfo: strData,
		})

		const serviceUUID = communicationMode.value == '数据模式' ? bleConfig.SERVICE_UUID : bleConfig.CONFIG_SERVICE_UUID
		const characteristicUUID = communicationMode.value == '数据模式' ? bleConfig.WRITE_CHARACTERISTIC_UUID : bleConfig
			.CONFIG_WRITE_CHARACTERISTIC_UUID

		bleUtil.writeDataAutoGroup(currentDevice.value.deviceId, serviceUUID, characteristicUUID,
			bufferData, maxGroupBytesLen.value).then((res) => {

			if (!res) {
				logList.value.push({
					dataType: DATA_TYPE_OTHER,
					time: util.formatTime(),
					dataInfo: "发送失败",
				})
			} else {
				inputData.value = ""
			}
		})
	}

	function sendHexData() {
		if (inputData.value.length % 2 != 0 || inputData.value.length == 0) {
			uni.showToast({
				icon: 'none',
				title: "请输入偶数长度"
			})
			return
		}
		if (!bleUtil.isHexString(inputData.value)) {
			uni.showToast({
				icon: 'none',
				title: "请输入十六进制数据"
			})
			return
		}
		const strData = inputData.value

		const bufferData = bleUtil.hex2ab(strData)

		logList.value.push({
			dataType: DATA_TYPE_SEND,
			time: util.formatTime(),
			dataInfo: strData,
		})
		const serviceUUID = communicationMode.value == '数据模式' ? bleConfig.SERVICE_UUID : bleConfig.CONFIG_SERVICE_UUID
		const characteristicUUID = communicationMode.value == '数据模式' ? bleConfig.WRITE_CHARACTERISTIC_UUID : bleConfig
			.CONFIG_WRITE_CHARACTERISTIC_UUID

		bleUtil.writeDataAutoGroup(currentDevice.value.deviceId, serviceUUID, characteristicUUID,
			bufferData, maxGroupBytesLen.value).then((res) => {

			if (!res) {
				logList.value.push({
					dataType: DATA_TYPE_OTHER,
					time: util.formatTime(),
					dataInfo: "发送失败",
				})
			} else {
				inputData.value = ""
			}
		})
	}

	// 监听控制点通知
	function listenNotifications() {
		uni.onBLEConnectionStateChange(function(res) {
			logList.value.push({
				dataType: DATA_TYPE_OTHER,
				time: util.formatTime(),
				dataInfo: '蓝牙已断开...',
			})

		})
		uni.onBLECharacteristicValueChange((res) => {
			if (dataCode.value == 'HEX') {
				const hexStr = bleUtil.ab2hex(res.value)
				console.log(`接收数据: ${hexStr}`)

				logList.value.push({
					dataType: DATA_TYPE_RECEIVE,
					time: util.formatTime(),
					dataInfo: hexStr,
				})
			} else {
				const str = bleUtil.arrayBufferToString(res.value)
				console.log(`接收数据: ${str}`)

				logList.value.push({
					dataType: DATA_TYPE_RECEIVE,
					time: util.formatTime(),
					dataInfo: str,
				})
			}


		})
	}
</script>

<style lang="scss" scoped>
	.page-content {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 16rpx;
		box-sizing: border-box;
		background-color: #f0f0f0;
	}

	.title-box {
		color: #333;
		font-size: 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 28rpx;
	}

	.btn-box {
		display: flex;
		gap: 14rpx;
		align-items: center;
	}

	.log-box {
		flex: 1;
		width: 100%;
		height: 0;
		overflow-y: auto;
		overflow-x: hidden;

		.log-item {
			box-sizing: border-box;
			border-bottom: 1px solid #999;
			padding: 14rpx 10rpx;
			font-size: 14px;

			.item-header {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.send-txt {
					color: blue;
				}

				.receive-txt {
					color: #f58220;
				}

				.failed-txt {
					color: red;
				}

				.other-txt {
					color: #333;
				}
			}

			.item-body {
				box-sizing: border-box;
				padding: 16rpx 0 0 30rpx;
				white-space: normal;
				word-wrap: break-word; // 允许长单词/字符串换行
				word-break: break-all; // 强制在任意字符处换行（适配连续无分隔文本）

			}
		}
	}

	.input-box {
		display: flex;
		gap: 10rpx;

		.input-wrap {
			flex: 1;
			border: 1px solid gray;
			display: inline-block;
			padding-left: 10px;
			padding-right: 10px;
			border-radius: 5px;
			height: 40px;
		}
	}
</style>