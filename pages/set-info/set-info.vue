<template>
	<view class="content">
		<div class="list-item" @click="dataCodeClicked()">
			<view class="title">当前字符</view>
			<view>{{dataCode}}</view>
		</div>
		<div v-if="hasConfig" class="list-item" @click="communicationModeClicked()">
			<view class="title">当前模式</view>
			<view>{{communicationMode}}</view>
		</div>
	</view>
</template>

<script setup>
	import * as storageUtils from '../../utils/storageUtils.js'
	import {
		ref,
		computed
	} from 'vue';
	import {
		onLoad,
		onUnload,
		onShow
	} from '@dcloudio/uni-app'
	
	const dataCode = ref("")
	const communicationMode = ref('')
	const hasConfig = ref(false)
	
	onLoad((options) => {
		
		console.log("options.hasConfig", options.hasConfig)
		
		hasConfig.value = options.hasConfig
	
		dataCode.value = storageUtils.getDataCode()
		communicationMode.value = storageUtils.getcommunicationMode()
	})
	
	// 点击字符编码
	function dataCodeClicked() {
		const itemList = ['HEX', 'ASCII'];
		uni.showActionSheet({
			itemList,
			success(res) {
				dataCode.value = itemList[res.tapIndex];
				
				try {
				    storageUtils.setDataCode(itemList[res.tapIndex]);
				} catch (e) {
				    // error
					console.log('写入缓存失败', e);
				}
			}
		})
	}
	
	function communicationModeClicked() {
		const itemList = ['数据模式', '配置模式'];
		uni.showActionSheet({
			itemList,
			success(res) {
				communicationMode.value = itemList[res.tapIndex];
				
				try {
				    storageUtils.setcommunicationMode(itemList[res.tapIndex]);
				} catch (e) {
				    // error
					console.log('写入缓存失败', e);
				}
			}
		})
	}
	
	</script>

<style>
	.content {
		margin-top: 10rpx;
		margin-left: 20rpx;
		margin-right: 30rpx;
	}
	
	.list-item {
		padding-top: 20rpx;
		padding-bottom: 20rpx;
		display: flex;
		border-bottom: 1px solid lightgray;
	}
	.title {
		flex: 1;
	}
</style>
