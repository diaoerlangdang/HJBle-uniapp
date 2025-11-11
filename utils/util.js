/**
 * 时间格式化函数
 * @param {Date} date 时间对象（默认当前时间）
 * @param {String} format 格式字符串（默认'yyyy-MM-dd HH:mm:ss'）
 * @returns {String} 格式化后的时间
 */
export function formatTime(date = new Date(), format = 'yyyy-MM-dd HH:mm:ss') {
	// 处理时间对象（兼容时间戳）
	if (typeof date === 'number') {
		date = new Date(date)
	}

	const timeObj = {
		'M+': date.getMonth() + 1, // 月份（0-11 → 1-12）
		'd+': date.getDate(), // 日期（1-31）
		'H+': date.getHours(), // 24小时制（0-23）
		'h+': date.getHours() % 12 || 12, // 12小时制（1-12）
		'm+': date.getMinutes(), // 分钟（0-59）
		's+': date.getSeconds(), // 秒（0-59）
		'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
		'S': date.getMilliseconds() // 毫秒
	}

	// 处理年份（支持yyyy/yy）
	if (/(y+)/.test(format)) {
		format = format.replace(
			RegExp.$1,
			(date.getFullYear() + '').substr(4 - RegExp.$1.length)
		)
	}

	// 处理其他占位符（补0逻辑）
	for (const key in timeObj) {
		if (new RegExp(`(${key})`).test(format)) {
			const value = timeObj[key] + '' // 转为字符串
			format = format.replace(
				RegExp.$1,
				RegExp.$1.length === 1 ? value : ('00' + value).substr(value.length)
			)
		}
	}

	return format
}