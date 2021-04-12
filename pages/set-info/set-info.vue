<template>
	<view class="content">
		<div class="div-flex" @click="dataCodeClicked()">
			<view class="title">当前字符</view>
			<view>{{dataCode}}</view>
		</div>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				dataCode: 'Hex', // 当前字符，Hex/ASCII
			}
		},
		onLoad() {
			try {
			    const value = uni.getStorageSync('dataCode');
			    if (value) {
			        this.dataCode = value;
			    }
			} catch (e) {
			    // error
				console.log('读取缓存失败', e);
			}
		},
		methods: {

			// 点击字符编码
			dataCodeClicked() {
				
				const that = this;
				const itemList = ['Hex', 'ASCII'];
				uni.showActionSheet({
					itemList,
					success(res) {
						that.dataCode = itemList[res.tapIndex];
						
						try {
						    uni.setStorageSync('dataCode', itemList[res.tapIndex]);
						} catch (e) {
						    // error
							console.log('写入缓存失败', e);
						}
					}
				})
			},

		}
	}
</script>

<style>
	.content {
		margin-top: 30rpx;
		margin-left: 20rpx;
		margin-right: 30rpx;
	}
	
	.div-flex {
		padding-top: 15rpx;
		padding-bottom: 15rpx;
		display: flex;
	}
	.title {
		flex: 1;
	}
</style>
