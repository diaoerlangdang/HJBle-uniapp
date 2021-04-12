<template>
	<view>
		<scroll-view class="data-list" scroll-y="true">
			<view v-for="(item, index) in dataList" :key="index" class="data-item">

				<view v-if="item.dataType == receiveType" class="receive">
					<!--类型-->
					<view class="receive-type">{{item.dataType}}</view>
					<!--数据-->
					<view class="receive-content">{{item.content}}</view>
				</view>

				<view v-else-if="item.dataType == sendType" class="send">
					<!--类型-->
					<view class="send-type">{{item.dataType}}</view>
					<!--数据-->
					<view class="send-content">{{item.content}}</view>
				</view>

				<view v-else class="other">
					<!--数据-->
					<view class="other-content">{{item.content}}</view>
				</view>

				<!--分割线-->
				<view class="separator-line"></view>
			</view>
		</scroll-view>

		<view class="tips">
			<text class="tips_text">发送字节：{{sendByteLen}} Byte</text>
			<text class="tips_text tips_speed">实时速率：{{receiveSpeed}} B/s</text>
			<text class="tips_text tips_receivce_bytes">接收字节：{{receiveByteLen}} Byte</text>
		</view>

		<view class="title">
			<text>日志：</text>
			<button class="titleBtn" size="mini" @click="setConfig()">设置</button>
			<button class="titleBtn" size="mini" @click="clearAllData()">清空</button>
		</view>

		<view class="footer">
			<input class="footer-input" v-model="inputData" :placeholder='inputPlaceHoler' />
			<button class="sendBtn" @click="sendDataBtnClicked()" type="primary">发送</button>
		</view>

	</view>
</template>

<script>
	export default {
		data() {
			return {
				device: null,
				connected: false,
				dataList: [{
					dataType: "其他",
					content: "正在连接。。。"
				}],
				receiveType: "接收",
				sendType: "发送",
				otherType: "其他",
				inputData: "",
				inputPlaceHoler: '请输入十六进制数',
				dataCode: 'Hex', // 编码类型

				sendByteLen: 0, // 已发送的字节数长度
				receiveByteLen: 0, // 已接收的字节数长度
				receiveSpeed: 0, // 实时速率，每秒接收字节数
				recLenBySecond: 0, // 计算速率使用

				maxGroupLen: 20, // 每包发送最大数据长度

				serviceId: "0000FFF0-0000-1000-8000-00805F9B34FB",
				receiveId: "0000FFF1-0000-1000-8000-00805F9B34FB",
				sendId: "0000FFF2-0000-1000-8000-00805F9B34FB",
			}
		},
		onLoad(option) {
			// console.log(option.query)
			const eventChannel = this.getOpenerEventChannel()
			// eventChannel.emit('acceptDataFromOpenedPage', {
			// 	data: 'test'
			// });
			// eventChannel.emit('someEvent', {
			// 	data: 'test'
			// });

			var that = this;
			// 监听acceptDataFromOpenerPage事件，获取上一页面通过eventChannel传送到当前页面的数据
			eventChannel.on('acceptDataFromOpenerPage', function(data) {
				that.device = data.device;
				uni.setNavigationBarTitle({
					title: that.device.name
				});
				
				try{
					// 连接设备并扫描服务
					that.connectDeviceAndScanService(data.device);
				}catch(e){
					console.log('连接失败', e);
				}
				
			});

			// 蓝牙连接监控
			uni.onBLEConnectionStateChange(function(res) {
				// 该方法回调中可以用于处理连接意外断开等异常情况
				console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
				that.connected = res.connected;
				if (!res.connected) {
					that.addData({
						dataType: "其他",
						content: "连接已断开"
					})
				}
			});
		},
		
		onShow() {
			this.inputData = '';
			try {
			    const value = uni.getStorageSync('dataCode');
			    if (value) {
			        this.inputPlaceHoler = (value == 'Hex') ? '请输入十六进制数' : '请输入字符数据';
					this.dataCode = value;
			    }
			} catch (e) {
			    // error
				console.log('读取缓存失败', e);
			}
		},

		onUnload() {
			// 若设备连接，则断开
			if (this.connected) {
				uni.closeBLEConnection({
					deviceId: this.device.deviceId,
					success() {

					}
				});
			}
		},
		methods: {

			//添加数据
			addData(data) {
				this.dataList.push(data);
			},

			// 开始计算速率
			startComputeSpeedTimer() {
				var that = this
				setInterval(function() {
					that.receiveSpeed = that.recLenBySecond;
					that.recLenBySecond = 0;
				}, 1000) //循环时间 这里是1秒 
			},
			
			// 连接设备并扫描服务
			async connectDeviceAndScanService(device) {
				
				var result = false;
				for (var i=0; i<5; i++) {
					console.log('开始连接设备。。。');
					result = await this.connectDevice(device);
					if (!result) {
						await this.sleep(100);
					} else {
						break;
					}
				}
				if (result) {
					this.addData({
						dataType: "其他",
						content: "连接成功，正在扫描服务。。。"
					});
				} else {
					this.addData({
						dataType: "其他",
						content: "连接失败"
					});
					return ;
				}
				
				var that = this;
				// 此处有bug，延迟100ms在扫描服务可避免iOS上扫描特征失败的问题
				setTimeout(function() {
					that.getServiceAndCharacteristics(device);
				}, 100);
			},

			// 连接设备
			connectDevice(device) {
				var that = this;

				return new Promise(function(resolve, reject) {

					uni.createBLEConnection({
						deviceId: device.deviceId,
						timeout: 10000, // 10s超时
						success(res) {
							resolve(true);
						},
						fail(res) {
							console.log(res);
							resolve(false);
						}
					})
				});
			},

			// 获取服务
			getServiceAndCharacteristics(device) {
				var that = this;
				uni.getBLEDeviceServices({
					deviceId: device.deviceId,
					success(res) {
						// console.log('扫描服务', res);
						// 此处有bug，返回的服务在android上为空数组，可再次调用，直到成功
						if (res.services.length <= 0) {
							that.getServiceAndCharacteristics(device);
							return;
						}
						uni.getBLEDeviceCharacteristics({
							deviceId: device.deviceId,
							serviceId: that.serviceId,
							success(res) {
								console.log('扫描特征', res);
								that.addData({
									dataType: "其他",
									content: '扫描成功，正在打开通知。。。'
								});

								// 打开通知
								that.openNotify(device);

							},
							fail(res) {
								console.log('获取特征失败', res);
								that.addData({
									dataType: "其他",
									content: "扫描服务失败"
								});
							}
						})

					},
					fail(res) {
						console.log('获取服务失败', res);
						that.addData({
							dataType: "其他",
							content: "扫描服务失败"
						});
					}
				})
			},

			// 打开通知
			openNotify(device) {
				var that = this;
				// 监听通知
				uni.onBLECharacteristicValueChange(function(res) {
					var content = '';
					if (this.dataCode == 'Hex') {
						content = ab2hex(res.value);
					} else {
						content = arrayBufferToString(res.value);
					}
					that.receiveByteLen += res.value.byteLength;
					that.recLenBySecond += res.value.byteLength;

					console.log('返回的数据：', content)
					that.addData({
						dataType: "接收",
						content: content
					})
				});

				// 打开通知
				uni.notifyBLECharacteristicValueChange({
					deviceId: device.deviceId,
					serviceId: that.serviceId,
					characteristicId: that.receiveId,
					state: true,
					success(res) {
						that.addData({
							dataType: "其他",
							content: '打开通知成功'
						})
					},
					fail(res) {
						that.addData({
							dataType: "其他",
							content: "打开通知失败"
						});
					}
				})
			},

			// 清空所有数据
			clearAllData() {
				this.dataList = [];
				this.sendByteLen = 0;
				this.receiveByteLen = 0;
			},

			//设置
			setConfig() {
				uni.navigateTo({
					url:"../set-info/set-info"
				})
			},

			// 点击发送按钮
			sendDataBtnClicked() {
				console.log(this.inputData);
				var buffer;
				if (this.dataCode == 'Hex') {
					// 不是偶数
					if (this.inputData.length % 2 != 0) {
						toast("数据必须为2的倍数");
						return;
					}
					
					// 不是hex数据
					if (!isHex(this.inputData)) {
						toast("请输入Hex数据");
						return;
					}
					
					buffer = stringToHexBuffer(this.inputData);
					
				} else {
					buffer = stringToArrayBuffer(this.inputData);
				}
				
				this.sendData(buffer);
			},

			// 发送数据
			async sendData(buffer) {
				var count = parseInt((buffer.byteLength + this.maxGroupLen - 1) / this.maxGroupLen);
				try {

					for (var i = 0; i < count; i++) {
						console.log('第' + i + '次', '共' + count + '次');
						var tmpBuffer;
						if ((i + 1) >= count) {
							tmpBuffer = buffer.slice(i * this.maxGroupLen, buffer.byteLength);
						} else {
							tmpBuffer = buffer.slice(i * this.maxGroupLen, (i + 1) * this.maxGroupLen);
						}

						var result = await this.sendPacketData(tmpBuffer);
						if (!result) {
							this.addData({
								dataType: "其他",
								content: "发送数据失败"
							});
							return;
						}
						// 当不是最后一包时，延迟 200ms 增加android发送连续包时成功率
						if ((i + 1) < count) {
							await this.sleep(200);
						}
					}

					this.sendByteLen += buffer.byteLength;
					this.addData({
						dataType: "发送",
						content: this.inputData
					});
					this.inputData = '';

				} catch (e) {
					console.log(e);
				}
			},

			// 延迟
			sleep(ms) {
				return new Promise(resolve =>
					setTimeout(resolve, ms)
				)
			},

			// 发送一包数据
			sendPacketData(buffer) {
				var that = this;

				// //前20个字节
				// var before = dataStr.substring(0, 40);
				// var after = dataStr.substring(40);

				// var buffer = this.stringToHexBuffer(before)
				console.log('发送数据', ab2hex(buffer));
				return new Promise(function(resolve, reject) {

					uni.writeBLECharacteristicValue({
						deviceId: that.device.deviceId,
						serviceId: that.serviceId,
						characteristicId: that.sendId,
						value: buffer,
						success: function(res) {
							// success
							console.log('write success:', res)
							resolve(true)
						},
						fail: function(res) {
							// fail
							console.log('write failed:', res)
							resolve(false)
						},
						complete: function(res) {
							// complete
							console.log('write', res)
						}
					})
				})
			},
		},
	}
	
	// 是否为hex值
	function isHex(data) {
		var regPos = /^([0-9a-fA-F])*$/;
		return regPos.test(data);
	}

	// ArrayBuffer转16进度字符串示例
	function ab2hex(buffer) {
		const hexArr = Array.prototype.map.call(
			new Uint8Array(buffer),
			function(bit) {
				return ('00' + bit.toString(16)).slice(-2)
			}
		)
		return hexArr.join('')
	}

	//字符串转buffer 十六进制
	function stringToHexBuffer(data) {
		// var data = 'AA5504B10000B5'
		var typedArray = new Uint8Array(data.match(/[\da-f]{2}/gi).map(function(h) {
			return parseInt(h, 16)
		}))

		return typedArray.buffer;
	}

	//字符串转buffer 十六进制
	function stringToUint8Array(data) {
		// var data = 'AA5504B10000B5'
		var typedArray = new Uint8Array(data.match(/[\da-f]{2}/gi).map(function(h) {
			return parseInt(h, 16)
		}))

		return typedArray;
	}
	

	// 字符串转byte数组
	function stringToArrayBuffer(str) {
		var bytes = new Array();
		var len, c;
		len = str.length;
		for (var i = 0; i < len; i++) {
			c = str.charCodeAt(i);
			if (c >= 0x010000 && c <= 0x10FFFF) {
				bytes.push(((c >> 18) & 0x07) | 0xF0);
				bytes.push(((c >> 12) & 0x3F) | 0x80);
				bytes.push(((c >> 6) & 0x3F) | 0x80);
				bytes.push((c & 0x3F) | 0x80);
			} else if (c >= 0x000800 && c <= 0x00FFFF) {
				bytes.push(((c >> 12) & 0x0F) | 0xE0);
				bytes.push(((c >> 6) & 0x3F) | 0x80);
				bytes.push((c & 0x3F) | 0x80);
			} else if (c >= 0x000080 && c <= 0x0007FF) {
				bytes.push(((c >> 6) & 0x1F) | 0xC0);
				bytes.push((c & 0x3F) | 0x80);
			} else {
				bytes.push(c & 0xFF);
			}
		}
		var array = new Int8Array(bytes.length);
		for (var i in bytes) {
			array[i] = bytes[i];
		}
		return array.buffer;
	}
	
	// byte数组转字符串
	function arrayBufferToString(arr) {
		if (typeof arr === 'string') {
			return arr;
		}
		var dataview = new DataView(arr);
		var ints = new Uint8Array(arr.byteLength);
		for (var i = 0; i < ints.length; i++) {
			ints[i] = dataview.getUint8(i);
		}
		arr = ints;
		var str = '';
		var _arr = arr;
		for (var i = 0; i < _arr.length; i++) {
			var one = _arr[i].toString(2),
				v = one.match(/^1+?(?=0)/);
			if (v && one.length == 8) {
				var bytesLength = v[0].length;
				var store = _arr[i].toString(2).slice(7 - bytesLength);
				for (var st = 1; st < bytesLength; st++) {
					store += _arr[st + i].toString(2).slice(2);
				}
				str += String.fromCharCode(parseInt(store, 2));
				i += bytesLength - 1;
			} else {
				str += String.fromCharCode(_arr[i]);
			}
		}
		return str;
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
	.tips {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		width: 100%;
		margin: 0 auto;
		position: fixed;
		padding-left: 10px;
		padding-bottom: 3px;
		top: 0rpx;
		padding-right: 10px;
		background: #fff;
	}

	.tips_text {
		font-size: 9px;
	}

	.tips_receivce_bytes {
		float: right;
		margin-right: 3%;
		padding-right: 10px;
	}

	.tips_speed {
		margin: 0 auto;
	}

	.title {
		padding-left: 10px;
		padding-right: 10px;
		position: fixed;
		width: 100%;
		top: 0rpx;
		margin-top: 15px;
		overflow: hidden;
		background: #fff;
	}

	.titleBtn {
		height: 30px;
		display: block;
		margin-right: 3%;
		float: right;
	}

	.data-list {
		padding-bottom: 60px;
		padding-top: 35px;
	}

	.footer {
		background: #fff;
		padding-left: 1%;
		padding-right: 1%;
		padding-bottom: 10px;
		position: fixed;
		width: 100%;
		bottom: 0rpx;
		overflow: hidden;
	}

	.footer-input {
		border: 1px solid gray;
		display: inline-block;
		padding-left: 10px;
		padding-right: 10px;
		border-radius: 5px;
		height: 40px;
		width: 70%;
	}

	.sendBtn {
		height: 40px;
		display: block;
		margin-right: 3%;
		float: right;
	}

	/*列表单元主体*/
	.receive {
		padding-top: 5px;
		padding-bottom: 5px;
		padding-left: 5px;
		padding-right: 5px;
	}

	.send {
		padding-top: 5px;
		padding-bottom: 5px;
		padding-left: 5px;
		padding-right: 5px;
	}

	.other {
		padding-top: 5px;
		padding-bottom: 5px;
		padding-left: 5px;
		padding-right: 5px;
	}

	.receive-type {
		color: red;
		font-size: 14px;
	}

	.receive-content {
		color: red;
		font-size: 14px;
		margin-top: 5px;
		margin-left: 10px;
		/* 自动换行 */
		word-break: break-all;
	}

	.send-type {
		color: blue;
		font-size: 14px;
	}

	.send-content {
		color: blue;
		font-size: 14px;
		margin-top: 5px;
		margin-left: 10px;
		/* 自动换行 */
		word-break: break-all;
	}

	.other-content {
		color: black;
		font-size: 14px;
		margin-top: 5px;
		margin-left: 10px;
		/* 自动换行 */
		word-break: break-all;
	}

	/*列表分割线*/
	.separator-line {
		height: 1px;
		background: lightgray;
		margin-left: 5px;
		margin-right: 5px;
	}
</style>
