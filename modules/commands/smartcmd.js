module.exports.config = {
    name: "smartcmd",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Vtuan",
    description: "Quản lý hệ thống phân biệt lệnh thông minh",
    commandCategory: "Admin Bot",
    usages: "[on/off/test/addalias/removealias/list] [args]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const SmartCommandParser = require("../../utils/smartCommandParser.js");
    
    if (!args[0]) {
        return api.sendMessage(
            `🤖 Smart Command System\n\n` +
            `📋 Các lệnh có sẵn:\n` +
            `• ${global.config.PREFIX}smartcmd on - Bật hệ thống thông minh\n` +
            `• ${global.config.PREFIX}smartcmd off - Tắt hệ thống thông minh\n` +
            `• ${global.config.PREFIX}smartcmd test [lệnh] - Test phân tích lệnh\n` +
            `• ${global.config.PREFIX}smartcmd addalias [lệnh] [alias] - Thêm alias\n` +
            `• ${global.config.PREFIX}smartcmd removealias [lệnh] [alias] - Xóa alias\n` +
            `• ${global.config.PREFIX}smartcmd list - Xem danh sách alias\n` +
            `• ${global.config.PREFIX}smartcmd status - Xem trạng thái hệ thống`,
            threadID, messageID
        );
    }

    const action = args[0].toLowerCase();
    const smartParser = new SmartCommandParser();

    switch (action) {
        case 'on':
            global.config.smartCommandSystem = true;
            return api.sendMessage("✅ Đã bật hệ thống phân biệt lệnh thông minh!", threadID, messageID);

        case 'off':
            global.config.smartCommandSystem = false;
            return api.sendMessage("❌ Đã tắt hệ thống phân biệt lệnh thông minh!", threadID, messageID);

        case 'test':
            if (!args[1]) {
                return api.sendMessage("❌ Vui lòng nhập lệnh để test!\nVí dụ: smartcmd test help", threadID, messageID);
            }
            
            const testInput = args.slice(1).join(' ');
            const result = smartParser.parseCommand(testInput, global.client.commands);
            
            if (result) {
                let response = `🧠 Kết quả phân tích lệnh "${testInput}":\n\n`;
                response += `📌 Lệnh tìm thấy: ${result.command.config.name}\n`;
                response += `🎯 Độ tin cậy: ${(result.confidence * 100).toFixed(1)}%\n`;
                response += `🔍 Loại khớp: ${result.matchType}\n`;
                response += `📝 Mô tả: ${result.command.config.description}\n`;
                
                if (result.suggestions) {
                    response += `\n💡 Gợi ý khác:\n`;
                    result.suggestions.forEach((suggestion, index) => {
                        response += `${index + 1}. ${suggestion.target} (${(suggestion.rating * 100).toFixed(1)}%)\n`;
                    });
                }
                
                return api.sendMessage(response, threadID, messageID);
            } else {
                const intent = smartParser.analyzeIntent(testInput);
                const suggestions = smartParser.suggestCommands(testInput, global.client.commands, 3);
                
                let response = `❓ Không tìm thấy lệnh "${testInput}"\n\n`;
                response += `🎯 Ý định phân tích: ${intent.intent} (${(intent.confidence * 100).toFixed(1)}%)\n\n`;
                
                if (suggestions.length > 0) {
                    response += `💡 Gợi ý lệnh:\n`;
                    suggestions.forEach((suggestion, index) => {
                        response += `${index + 1}. ${suggestion.command.config.name} - ${suggestion.command.config.description}\n`;
                    });
                }
                
                return api.sendMessage(response, threadID, messageID);
            }

        case 'addalias':
            if (!args[1] || !args[2]) {
                return api.sendMessage("❌ Cú pháp: smartcmd addalias [lệnh] [alias]\nVí dụ: smartcmd addalias help trogiup", threadID, messageID);
            }
            
            const commandName = args[1].toLowerCase();
            const newAlias = args[2].toLowerCase();
            
            if (!global.client.commands.has(commandName)) {
                return api.sendMessage(`❌ Lệnh "${commandName}" không tồn tại!`, threadID, messageID);
            }
            
            // Thêm alias vào hệ thống
            if (!smartParser.commandAliases.has(commandName)) {
                smartParser.commandAliases.set(commandName, []);
            }
            
            const aliases = smartParser.commandAliases.get(commandName);
            if (!aliases.includes(newAlias)) {
                aliases.push(newAlias);
                return api.sendMessage(`✅ Đã thêm alias "${newAlias}" cho lệnh "${commandName}"!`, threadID, messageID);
            } else {
                return api.sendMessage(`⚠️ Alias "${newAlias}" đã tồn tại cho lệnh "${commandName}"!`, threadID, messageID);
            }

        case 'removealias':
            if (!args[1] || !args[2]) {
                return api.sendMessage("❌ Cú pháp: smartcmd removealias [lệnh] [alias]\nVí dụ: smartcmd removealias help trogiup", threadID, messageID);
            }
            
            const cmdName = args[1].toLowerCase();
            const aliasToRemove = args[2].toLowerCase();
            
            if (smartParser.commandAliases.has(cmdName)) {
                const aliases = smartParser.commandAliases.get(cmdName);
                const index = aliases.indexOf(aliasToRemove);
                if (index > -1) {
                    aliases.splice(index, 1);
                    return api.sendMessage(`✅ Đã xóa alias "${aliasToRemove}" khỏi lệnh "${cmdName}"!`, threadID, messageID);
                } else {
                    return api.sendMessage(`⚠️ Alias "${aliasToRemove}" không tồn tại cho lệnh "${cmdName}"!`, threadID, messageID);
                }
            } else {
                return api.sendMessage(`❌ Lệnh "${cmdName}" không có alias nào!`, threadID, messageID);
            }

        case 'list':
            let response = "📋 Danh sách alias hiện tại:\n\n";
            let hasAliases = false;
            
            for (const [commandName, aliases] of smartParser.commandAliases) {
                if (aliases.length > 0) {
                    response += `🔹 ${commandName}: ${aliases.join(', ')}\n`;
                    hasAliases = true;
                }
            }
            
            if (!hasAliases) {
                response += "❌ Chưa có alias nào được thiết lập!";
            }
            
            return api.sendMessage(response, threadID, messageID);

        case 'status':
            const isEnabled = global.config.smartCommandSystem !== false;
            const totalAliases = Array.from(smartParser.commandAliases.values())
                .reduce((total, aliases) => total + aliases.length, 0);
            
            return api.sendMessage(
                `📊 Trạng thái hệ thống Smart Command:\n\n` +
                `🔧 Trạng thái: ${isEnabled ? '✅ Đang hoạt động' : '❌ Đã tắt'}\n` +
                `📝 Tổng số alias: ${totalAliases}\n` +
                `🎯 Độ chính xác fuzzy matching: 40-60%\n` +
                `🧠 Hỗ trợ phân tích ngữ cảnh: ✅\n` +
                `💡 Hỗ trợ gợi ý lệnh: ✅`,
                threadID, messageID
            );

        default:
            return api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng smartcmd để xem hướng dẫn.", threadID, messageID);
    }
};
