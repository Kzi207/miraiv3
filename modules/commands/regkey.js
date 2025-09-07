const fs = require('fs-extra');
const moment = require('moment-timezone');

function generateRandomKey(month) {
    const prefix = "Vtuan_";
    const suffix = Math.random().toString(36).substring(2, 9);
    return prefix + month + '_' + suffix;
}

module.exports.config = {
    name: "regkey",
    version: "1.0.0",
    hasPermssion: 2,
    Rent: 2,
    credits: "Niio-team (Vtuan)",
    description: "Quản lí người thuê bot",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 0
};

module.exports.run = async ({ api, event, args }) => {
    const month = parseInt(args[0]);
    
    if (!month || month < 1 || month > 12) {
        return api.sendMessage("Vui lòng nhập một số từ 1 đến 12 để lấy key tương ứng với tháng!", event.threadID);
    }

    try {
        let data = await fs.readFile(DATAKEY, 'utf-8');
        let jsonData = data ? JSON.parse(data) : {};

        let key = generateRandomKey(month);

        while (jsonData.used_keys.includes(key)) {
            key = generateRandomKey(month);
        }

        jsonData.unUsed_keys.push(key); 
        await fs.writeFile(DATAKEY, JSON.stringify(jsonData, null, 4), 'utf-8');

        api.sendMessage(`${key}`, event.threadID);
    } catch (error) {
        console.error('Lỗi khi đọc hoặc ghi dữ liệu:', error);
        api.sendMessage("Đã xảy ra lỗi, vui lòng thử lại sau!", event.threadID);
    }
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
    try {
        let data1 = await fs.readFile(DATAKEY, 'utf-8');
        let jsonData1 = data1 ? JSON.parse(data1) : {};

        let data2 = await fs.readFile(rentbot, 'utf-8');
        let rentDATA = data2 ? JSON.parse(data2) : {};


        if (jsonData1.unUsed_keys && jsonData1.unUsed_keys.includes(event.body)){
            jsonData1.used_keys.push(event.body);
            jsonData1.unUsed_keys = jsonData1.unUsed_keys.filter(key => key !== event.body);

            const timeEnd = moment().add(event.body.split('_')[1], 'months').tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");

            if (rentDATA[event.threadID]) {
                rentDATA[event.threadID].timeEnd = timeEnd;
            } else {
                rentDATA[event.threadID] = {
                    user: event.senderID,
                    key: event.body,
                    time: moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss"),
                    timeEnd: timeEnd
                };
            }

            await fs.writeFile(DATAKEY, JSON.stringify(jsonData1, null, 4), 'utf-8');
            await fs.writeFile(rentbot, JSON.stringify(rentDATA, null, 4), 'utf-8');

            api.sendMessage("key đã được kích hoạt", handleReply.threadID, event.messageID);
        } else if (jsonData1.used_keys.includes(event.body)) {
            api.sendMessage("Key đã được sử dụng", handleReply.threadID, event.messageID);
        } else {
            api.sendMessage("Key không tồn tại", handleReply.threadID, event.messageID);
        }
    } catch (error) {
        console.error('Lỗi khi đọc hoặc ghi dữ liệu:', error);
        api.sendMessage("Đã xảy ra lỗi, vui lòng thử lại sau!", handleReply.threadID);
    }
};