module.exports.config = {
	name: "sleep",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Tính thời gian đi ngủ hoàn hảo cho bạn",
	commandCategory: "Tiện ích",
	usages: "[Time]",
	cooldowns: 5,
	dependencies: {
		"moment-timezone": ""
	}
};

module.exports.languages = {
	"vi": {
		"returnTimeNow": "Nếu bạn đi ngủ bây giờ, những thời gian hoàn hảo nhất để thức dậy là:\n%1",
		"returnTimeSet": "Nếu bạn đi ngủ vào lúc %1, những thời gian hoàn hảo nhất để thức dậy là:\n%2"	
	},
	"en": {
		"returnTimeNow": "If you go to sleep now, the perfect time to wake up is:\n%1",
		"returnTimeSet": "If you go to sleep at %1, perfect times to wake up is:\n%2"	
	}
}

module.exports.run = function({ api, event, args, getText }) {
	const { threadID, messageID } = event;
	const { throwError } = global.utils;
	const moment = global.nodemodule["moment-timezone"];

	function parseTimeInput(input) {
		if (!input) return null;
		const s = String(input).trim();
		let m = s.match(/^(\d{1,2})\D+(\d{1,2})$/); // 8:30, 8h30, 08-30
		if (m) return { hour: parseInt(m[1]), minute: parseInt(m[2]) };
		m = s.match(/^(\d{1,2})h?$/i); // 8, 08, 8h
		if (m) return { hour: parseInt(m[1]), minute: 0 };
		return null;
	}

	var wakeTime = [];
	let content = args.join(" ").trim();
	if (!content) {
		for (var i = 1; i < 7; i++) wakeTime.push(moment().tz("Asia/Ho_Chi_Minh").add(90 * i + 15, 'm').format("HH:mm"));
		return api.sendMessage(getText("returnTimeNow", wakeTime.join(', ')), threadID, messageID);
	}
	else {
		const parsed = parseTimeInput(content);
		if (!parsed) return throwError(this.config.name, threadID, messageID);
		const h = parsed.hour, m = parsed.minute;
		if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return throwError(this.config.name, threadID, messageID);
		const base = moment().tz("Asia/Ho_Chi_Minh").set({ hour: h, minute: m, second: 0, millisecond: 0 });
		for (var i = 1; i < 7; i++) wakeTime.push(base.clone().add(90 * i + 15, 'm').format("HH:mm"));
		const displayed = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
		return api.sendMessage(getText("returnTimeSet", displayed, wakeTime.join(', ')), threadID, messageID);
	}
}   