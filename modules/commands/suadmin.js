module.exports.config = {
    name: "suadmin",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Khánh Duy",
    description: "Quản lý hệ thống thông minh của Su AI",
    commandCategory: "Admin Bot",
    usages: "[status/reset/cleanup/export/import] [args]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const SuIntelligence = require("../../utils/suIntelligence.js");
    
    if (!args[0]) {
        const commands = [
            'status - Xem trạng thái hệ thống',
            'reset - Reset dữ liệu người dùng', 
            'cleanup - Dọn dẹp dữ liệu cũ',
            'export - Xuất dữ liệu',
            'stats - Thống kê chi tiết',
            'user [uid] - Xem thông tin người dùng'
        ];
        
        return api.sendMessage(
            `🤖 Su Intelligence Admin Panel\n\n📋 Các lệnh có sẵn:\n` +
            commands.map(cmd => `• ${global.config.PREFIX}suadmin ${cmd}`).join('\n'),
            threadID, messageID
        );
    }

    const action = args[0].toLowerCase();
    const suIntelligence = new SuIntelligence();

    switch (action) {
        case 'status':
            const status = {
                conversationHistory: suIntelligence.conversationHistory.size,
                userProfiles: suIntelligence.userProfiles.size,
                contextData: suIntelligence.contextData.size
            };
            
            return api.sendMessage(
                `📊 Trạng thái Su Intelligence System:\n\n` +
                `💬 Lịch sử cuộc trò chuyện: ${status.conversationHistory} cuộc trò chuyện\n` +
                `👤 Hồ sơ người dùng: ${status.userProfiles} người dùng\n` +
                `🧠 Dữ liệu ngữ cảnh: ${status.contextData} ngữ cảnh\n\n` +
                `✅ Hệ thống đang hoạt động bình thường`,
                threadID, messageID
            );

        case 'reset':
            if (!args[1] || args[1] !== 'confirm') {
                return api.sendMessage(
                    `⚠️ Cảnh báo: Lệnh này sẽ xóa TẤT CẢ dữ liệu!\n` +
                    `Để xác nhận, sử dụng: ${global.config.PREFIX}suadmin reset confirm`,
                    threadID, messageID
                );
            }
            
            suIntelligence.conversationHistory.clear();
            suIntelligence.userProfiles.clear();
            suIntelligence.contextData.clear();
            suIntelligence.saveMemory();
            
            return api.sendMessage("✅ Đã reset toàn bộ dữ liệu Su Intelligence!", threadID, messageID);

        case 'cleanup':
            suIntelligence.cleanupOldData();
            suIntelligence.saveMemory();
            return api.sendMessage("🧹 Đã dọn dẹp dữ liệu cũ!", threadID, messageID);

        case 'export':
            try {
                const fs = require('fs');
                const path = require('path');
                const exportFile = `su_intelligence_export_${Date.now()}.json`;
                const exportPath = path.join(__dirname, '..', '..', 'utils', 'data', exportFile);
                
                const exportData = {
                    conversationHistory: Array.from(suIntelligence.conversationHistory.entries()),
                    userProfiles: Array.from(suIntelligence.userProfiles.entries()),
                    contextData: Array.from(suIntelligence.contextData.entries()),
                    exportedAt: new Date().toISOString(),
                    version: "1.0.0"
                };
                
                fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
                
                return api.sendMessage(
                    `📤 Đã xuất dữ liệu thành công!\n📁 File: ${exportFile}\n` +
                    `📊 Dữ liệu: ${exportData.conversationHistory.length} cuộc trò chuyện, ${exportData.userProfiles.length} người dùng`,
                    threadID, messageID
                );
            } catch (error) {
                return api.sendMessage(`❌ Lỗi khi xuất dữ liệu: ${error.message}`, threadID, messageID);
            }

        case 'stats':
            const convStats = Array.from(suIntelligence.conversationHistory.values())
                .reduce((acc, conv) => ({ totalMessages: acc.totalMessages + conv.length }), { totalMessages: 0 });
            
            const userStats = Array.from(suIntelligence.userProfiles.values())
                .reduce((acc, profile) => ({ totalConversations: acc.totalConversations + profile.conversationCount }), { totalConversations: 0 });
            
            const contextStats = Array.from(suIntelligence.contextData.values())
                .reduce((acc, context) => {
                    acc.totalMessages += context.messageCount;
                    acc.moodCounts[context.mood] = (acc.moodCounts[context.mood] || 0) + 1;
                    return acc;
                }, { totalMessages: 0, moodCounts: {} });
            
            return api.sendMessage(
                `📈 Thống kê chi tiết Su Intelligence:\n\n` +
                `💬 Cuộc trò chuyện:\n` +
                `   • Tổng số cuộc trò chuyện: ${suIntelligence.conversationHistory.size}\n` +
                `   • Tổng số tin nhắn: ${convStats.totalMessages}\n\n` +
                `👤 Người dùng:\n` +
                `   • Tổng số người dùng: ${suIntelligence.userProfiles.size}\n` +
                `   • Tổng số cuộc trò chuyện: ${userStats.totalConversations}\n\n` +
                `🧠 Ngữ cảnh:\n` +
                `   • Tổng số ngữ cảnh: ${suIntelligence.contextData.size}\n` +
                `   • Tổng số tin nhắn: ${contextStats.totalMessages}\n` +
                `   • Tâm trạng: ${JSON.stringify(contextStats.moodCounts)}`,
                threadID, messageID
            );

        case 'user':
            if (!args[1]) {
                return api.sendMessage("❌ Vui lòng nhập UID người dùng!\nVí dụ: suadmin user 123456789", threadID, messageID);
            }
            
            const userId = args[1];
            const userProfile = suIntelligence.userProfiles.get(userId);
            
            if (!userProfile) {
                return api.sendMessage(`❌ Không tìm thấy thông tin người dùng với UID: ${userId}`, threadID, messageID);
            }
            
            let userResponse = `👤 Thông tin người dùng: ${userId}\n\n📊 Thống kê:\n` +
                `   • Số cuộc trò chuyện: ${userProfile.conversationCount}\n` +
                `   • Lần cuối hoạt động: ${new Date(userProfile.lastSeen).toLocaleString('vi-VN')}\n` +
                `   • Sở thích: ${userProfile.favoriteTopics.join(', ') || 'Chưa có'}\n\n`;
            
            if (userProfile.moodHistory.length > 0) {
                const recentMoods = userProfile.moodHistory.slice(-5);
                userResponse += `😊 Tâm trạng gần đây:\n` +
                    recentMoods.map((mood, index) => 
                        `   ${index + 1}. ${mood.mood} (${new Date(mood.timestamp).toLocaleString('vi-VN')})`
                    ).join('\n');
            }
            
            return api.sendMessage(userResponse, threadID, messageID);

        default:
            return api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng suadmin để xem hướng dẫn.", threadID, messageID);
    }
};
