const fs = require('fs-extra');
const path = require('path');

module.exports = function({ api, models, Users, Threads, Currencies }) {
  
  // Hàm kiểm tra tin nhắn có chứa từ "su" không
  function containsSu(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Chuẩn hóa văn bản
    const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Các pattern để nhận diện từ "su"
    const suPatterns = [
      /\bsu\b/i,                    // từ "su" độc lập
      /\bsu\s+/i,                   // "su" + khoảng trắng
      /\s+su\b/i,                   // khoảng trắng + "su"
      /\bsu\?/i,                    // "su?"
      /\bsu!/i,                     // "su!"
      /\bsu~/i,                     // "su~"
      /\bsu,/i,                     // "su,"
      /\bsu\./i,                    // "su."
      /\bsu:/i,                     // "su:"
      /\bsu;/,                      // "su;"
      /\bsu\s*[a-zA-Z]/i,          // "su" + chữ cái
      /[a-zA-Z]\s*su\b/i,          // chữ cái + "su"
      /\bsu\s*[0-9]/i,             // "su" + số
      /[0-9]\s*su\b/i,             // số + "su"
      /\bsu\s*[^\w\s]/i,           // "su" + ký tự đặc biệt
      /[^\w\s]\s*su\b/i            // ký tự đặc biệt + "su"
    ];
    
    // Kiểm tra các pattern
    for (const pattern of suPatterns) {
      if (pattern.test(normalizedText)) {
        return true;
      }
    }
    
    // Kiểm tra các biến thể khác
    const suVariants = [
      'su', 'Su', 'SU', 'sU', 'Su',
      'su!', 'su?', 'su~', 'su,', 'su.',
      'su:', 'su;', 'su...', 'su...',
      'suuu', 'suuuu', 'suuuuu',"Oanh","oanh","bé","Bé","bé Oanh","Bé oanh"
    ];
    
    for (const variant of suVariants) {
      if (normalizedText.includes(variant.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  // Hàm kiểm tra tin nhắn có phải là lệnh không
  function isCommand(text) {
    if (!text || typeof text !== 'string') return false;
    
    const trimmedText = text.trim().toLowerCase();
    
    // Kiểm tra prefix lệnh
    const prefix = global.config.PREFIX || '.';
    if (trimmedText.startsWith(prefix)) {
      // Nếu là lệnh .su thì coi như là lệnh (không xử lý ở đây)
      if (trimmedText.startsWith(prefix + 'su')) {
        return true;
      }
      return true;
    }
    
    // Kiểm tra các từ khóa lệnh
    const commandKeywords = [
      'help', 'info', 'kick', 'ban', 'unban',
      'admin', 'mod', 'mute', 'unmute', 'warn',
      'clear', 'delete', 'edit', 'pin', 'unpin'
    ];
    
    for (const keyword of commandKeywords) {
      if (trimmedText.toLowerCase().includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  // Hàm kiểm tra tin nhắn có phải là mention bot không
  function isBotMention(text, botName) {
    if (!text || typeof text !== 'string') return false;
    
    const normalizedText = text.toLowerCase();
    const normalizedBotName = botName.toLowerCase();
    
    // Kiểm tra mention trực tiếp
    if (normalizedText.includes(`@${normalizedBotName}`)) {
      return true;
    }
    
    // Kiểm tra gọi tên bot
    const botNamePatterns = [
      new RegExp(`\\b${normalizedBotName}\\b`, 'i'),
      new RegExp(`\\b${normalizedBotName}\\?`, 'i'),
      new RegExp(`\\b${normalizedBotName}!`, 'i'),
      new RegExp(`\\b${normalizedBotName}~`, 'i'),
      new RegExp(`\\b${normalizedBotName},`, 'i'),
      new RegExp(`\\b${normalizedBotName}\\.`, 'i')
    ];
    
    for (const pattern of botNamePatterns) {
      if (pattern.test(normalizedText)) {
        return true;
      }
    }
    
    return false;
  }

  // Hàm xử lý tin nhắn và chạy lệnh su.js
  async function handleSuMessage({ api, event }) {
    try {
      const { threadID, messageID, senderID, body, type } = event;
      
      // Chỉ xử lý tin nhắn text
      if (type !== 'message' || !body || typeof body !== 'string') {
        return;
      }
      
      const trimmedBody = body.trim();
      
      // Bỏ qua tin nhắn rỗng
      if (!trimmedBody) {
        return;
      }
      
      // Bỏ qua tin nhắn từ bot
      if (senderID === api.getCurrentUserID()) {
        return;
      }
      
      // Kiểm tra tin nhắn có chứa từ "su" không
      if (!containsSu(trimmedBody)) {
        return;
      }
      
      // Bỏ qua nếu là lệnh (để tránh conflict)
      if (isCommand(trimmedBody)) {
        return;
      }
      
      // Kiểm tra bot name trong config
      const botName = global.config.BOTNAME || 'Mirai-V3-Unofficial';
      const isBotMentioned = isBotMention(trimmedBody, botName);
      
      // Nếu không phải mention bot và không có từ "su" rõ ràng, bỏ qua
      if (!isBotMentioned && !trimmedBody.toLowerCase().includes('su')) {
        return;
      }
      
      console.log(`🔍 Phát hiện tin nhắn có từ "su" từ ${senderID} trong nhóm ${threadID}`);
      
      // Gọi lệnh su.js thông qua global.client.commands
      try {
        const suCommand = global.client.commands.get('su');
        if (suCommand) {
          // Tạo event giả để chạy lệnh su.js
          const fakeEvent = {
            threadID: threadID,
            messageID: messageID,
            senderID: senderID,
            body: trimmedBody,
            type: 'message',
            mentions: event.mentions || []
          };
          
          console.log(`🚀 Đang chuyển hướng đến lệnh su.js cho tin nhắn: "${trimmedBody}"`);
          await suCommand.run({ api, event: fakeEvent, args: [] });
        } else {
          console.log('❌ Không tìm thấy module su.js');
        }
      } catch (error) {
        console.error('❌ Lỗi khi chuyển hướng đến su.js:', error);
      }
      
      console.log(`✅ Đã xử lý thành công tin nhắn có từ "su"`);
      
    } catch (error) {
      console.error('❌ Lỗi khi xử lý tin nhắn có từ "su":', error);
    }
  }

  // Hàm xử lý event chính
  async function handleEvent({ api, event }) {
    try {
      // Xử lý tin nhắn có từ "su"
      await handleSuMessage({ api, event });
    } catch (error) {
      console.error('❌ Lỗi trong HandSu handler:', error);
    }
  }

  // Return các hàm cần thiết
  return {
    handleEvent
  };
};
