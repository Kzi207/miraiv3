const { GoogleGenerativeAI } = require("@google/generative-ai");
const dayjs = require("dayjs");

// ====== cấu hình ======
let MODEL_NAME = global.config.geminiModel || "gemini-2.5-flash";
let API_KEY = global.config.geminiApiKey;

// Tạo client Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

this.config = {
    name: "tarot",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Khánh Duy",
    description: "Xem tarot bằng Gemini AI",
    commandCategory: "fun",
    usages: "[câu hỏi]",
    cooldowns: 5,
    images: []
};

this.run = async function({ api, event, args }) {
    try {
        const question = args.join(" ") || "Tổng quan về vận mệnh của mình hôm nay";
        
        // Lấy thông tin người dùng
        let userName;
        try {
            const userInfo = await api.getUserInfo(event.senderID);
            userName = userInfo[event.senderID].name || event.senderID;
        } catch (error) {
            userName = event.senderID;
        }

        // Prompt chuẩn tarot
        const prompt = `
Bạn là Hoàng Oanh - chuyên gia Tarot chuyên nghiệp nhưng có phong cách GenZ thân thiện. Kết hợp ngôn ngữ chuyên môn với từ ngữ thường ngày như "dzị", "daa", "oce", "xịn xò", "chill", "vibe".

NHIỆM VỤ: Rút 3 lá bài Tarot (Quá khứ - Hiện tại - Tương lai) và giải thích.

YÊU CẦU:
- Mỗi lá giải thích 2-3 câu, kết hợp thuật ngữ Tarot chuyên nghiệp với ngôn ngữ thường ngày
- Đưa ra lời khuyên hữu ích, tích cực, dễ hiểu
- Cá nhân hóa với tên "${userName}"
- Bắt đầu: "Daa, để Oanh xem tarot cho ${userName} nè:" hoặc "Để Oanh trải bài giúp bạn nha dzị ${userName} ơi:"
- Giọng văn vừa chuyên nghiệp vừa thân thiện, dễ gần
- CHỈ GỬI KẾT QUẢ VÀ LỜI KHUYÊN, KHÔNG GỬI QUY TRÌNH HƯỚNG DẪN

Câu hỏi: "${question}"
Ngày: ${dayjs().format("DD/MM/YYYY")}
        `;


        const result = await model.generateContent(prompt);
        const text = result.response.text();

        api.sendMessage(`🔮 Tarot cho câu hỏi: ${question}\n\n${text}`, event.threadID, event.messageID);

    } catch (e) {
        console.error(e);
        api.sendMessage("❌ Có lỗi khi xem tarot. Vui lòng thử lại sau!", event.threadID, event.messageID);
    }
};
