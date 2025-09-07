
//còn khá nhiều bug:))
module.exports.config = {
    name: 'lich',
    version: '1.0.1',
    hasPermssion: 0,
    credits: 'Khánh Duy',//Cấm thay cre dưới mọi hành thức
    description: 'Tạo và quản lý lịch hẹn,',
    commandCategory: 'Tiện ích',
    usages: 'lich add <HH:mm DD/MM/YYYY> | <tiêu đề>\nlich list\nlich del <id>\nlich test <id>',
    cooldowns: 3
};

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

function getStorePath() {
    return path.join(__dirname, 'data', 'schedule.json');// đường dẫn lưu data
}

function ensureStore() {
    const file = getStorePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
    return file;
}

function loadAll() {
    const file = ensureStore();
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')) || []; } catch { return []; }
}

function saveAll(data) {
    const file = ensureStore();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID, messageID } = event;
    const sub = (args[0] || '').toLowerCase();
    const all = loadAll();
    
    if (!sub || sub === 'help') {
        return api.sendMessage(
            '📅 **HƯỚNG DẪN SỬ DỤNG LỆNH LỊCH HẸN** 📅\n\n' +
            '🔹 **Tạo lịch hẹn:**\n' +
            '• `lich add <HH:mm DD/MM/YYYY> | <tiêu đề>`\n' +
            '• Ví dụ: `lich add 10:00 23/08/2025 | Đi cafe`\n\n' +
            '🔹 **Xem danh sách:**\n' +
            '• `lich list`\n\n' +
            '🔹 **Xóa lịch hẹn:**\n' +
            '• `lich del <id>`\n\n' +
            '🔹 **Test nhắc nhở:**\n' +
            '• `lich test <id>` (test nhắc nhở ngay lập tức)\n\n' +
            '💡 **Lưu ý:** Bot sẽ tag bạn bằng UID khi gửi nhắc nhở!',
            threadID, messageID
        );
    }

    if (sub === 'add') {
        const body = args.slice(1).join(' ');
        const [timeRaw, titleRaw] = body.split('|').map(s => (s || '').trim());
        
        if (!timeRaw || !titleRaw) {
            return api.sendMessage(
                '❌ **Sai định dạng!** ❌\n\n' +
                '📝 **Cú pháp đúng:**\n' +
                '`lich add <HH:mm DD/MM/YYYY> | <tiêu đề>`\n\n' +
                '💡 **Ví dụ:**\n' +
                '`lich add 10:00 23/08/2025 | Đi cafe`\n' +
                '`lich add 08:30 25/12/2025 | Họp dự án`',
                threadID, messageID
            );
        }
        
        const time = moment.tz(timeRaw, 'HH:mm DD/MM/YYYY', 'Asia/Ho_Chi_Minh');
        if (!time.isValid()) {
            return api.sendMessage(
                '❌ **Thời gian không hợp lệ!** ❌\n\n' +
                '📅 **Định dạng đúng:** `HH:mm DD/MM/YYYY`\n\n' +
                '💡 **Ví dụ:**\n' +
                '• `10:00 23/08/2025`\n' +
                '• `08:30 25/12/2025`\n' +
                '• `15:00 30/08/2025`',
                threadID, messageID
            );
        }
        
        // Kiểm tra thời gian không được trong quá khứ
        const now = moment().tz('Asia/Ho_Chi_Minh');
        if (time.isBefore(now)) {
            return api.sendMessage(
                '❌ **Không thể tạo lịch hẹn trong quá khứ!** ❌\n\n' +
                '⏰ Thời gian bạn nhập: `' + time.format('HH:mm DD/MM/YYYY') + '`\n' +
                '🕐 Thời gian hiện tại: `' + now.format('HH:mm DD/MM/YYYY') + '`\n\n' +
                '💡 Hãy chọn thời gian trong tương lai!',
                threadID, messageID
            );
        }
        
        const item = {
            id: `${Date.now()}_${Math.floor(Math.random()*1000)}`,
            title: titleRaw,
            scheduleTime: time.toISOString(),
            createdAt: moment().toISOString(),
            creatorId: String(senderID),
            threadId: String(threadID),
            status: 'pending',
            notified20m: false,
            responded: false,
            lastReminderAt: null
        };
        
        all.push(item);
        saveAll(all);
        
        return api.sendMessage(
            `✅ **Đã tạo lịch hẹn thành công!** ✅\n\n` +
            `📅 **${item.title}**\n` +
            `• 🆔 ID: \`${item.id}\`\n` +
            `• ⏰ Thời gian: \`${time.tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\`\n` +
            `• 👤 Người tạo: <@${senderID}>\n\n` +
            `🔔 **Hệ thống nhắc nhở:**\n` +
            `• Sẽ nhắc trước 20 phút\n` +
            `• Nhắc lại mỗi 5 phút nếu chưa phản hồi\n` +
            `• Bot sẽ tag bạn bằng UID khi gửi nhắc nhở\n\n` +
            `💡 **Cách xác nhận:**\n` +
            `1️⃣ **Thả tim ❤️** → Dừng nhắc nhở ngay lập tức\n` +
            `2️⃣ **Reply "ok"** → Dừng nhắc nhở ngay lập tức\n` +
            `3️⃣ **Gửi tin nhắn bất kỳ** → Dừng nhắc nhở`,
            threadID, messageID
        );
    }

    if (sub === 'list') {
        const list = all
            .filter(x => String(x.threadId) === String(threadID))
            .sort((a,b) => new Date(a.scheduleTime) - new Date(b.scheduleTime));
            
        if (list.length === 0) {
            return api.sendMessage(
                '📝 **Chưa có lịch hẹn nào trong nhóm này.**\n\n' +
                '💡 Sử dụng lệnh `lich add` để tạo lịch hẹn đầu tiên!',
                threadID, messageID
            );
        }
        
        const lines = list.map((x, i) => {
            const t = moment(x.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY');
            const status = x.status === 'pending' ? '⏳ Chờ xử lý' : 
                          x.status === 'completed' ? '✅ Hoàn thành' : 
                          x.status === 'expired' ? '❌ Hết hạn' : '❓ Không xác định';
            return `${i+1}. [\`${x.id}\`] **${x.title}**\n   ⏰ ${t} | 📊 ${status}`;
        });
        
        const totalSchedules = list.length;
        const pendingSchedules = list.filter(x => x.status === 'pending').length;
        const completedSchedules = list.filter(x => x.status === 'completed').length;
        
        let infoText = `📋 **DANH SÁCH LỊCH HẸN CỦA NHÓM** 📋\n\n`;
        infoText += `📊 **Thống kê:**\n`;
        infoText += `• Tổng số lịch: ${totalSchedules}\n`;
        infoText += `• Đang chờ: ${pendingSchedules}\n`;
        infoText += `• Đã hoàn thành: ${completedSchedules}\n\n`;
        infoText += `📅 **Chi tiết lịch hẹn:**\n`;
        infoText += lines.join('\n\n');
        
        if (pendingSchedules > 0) {
            infoText += `\n\n💡 **HƯỚNG DẪN XÁC NHẬN:**\n\n1️⃣ **Thả tim ❤️** vào tin nhắn nhắc nhở → Dừng nhắc nhở ngay lập tức\n2️⃣ **Reply "ok"** vào tin nhắn nhắc nhở → Dừng nhắc nhở ngay lập tức\n3️⃣ **Gửi tin nhắn bất kỳ** sau khi nhận nhắc nhở → Dừng nhắc nhở\n\n🔄 Bot sẽ nhắc lại mỗi 5 phút nếu chưa có phản hồi!`;
        }
        
        return api.sendMessage(infoText, threadID, messageID);
    }

    if (sub === 'del') {
        const id = args[1];
        if (!id) {
            return api.sendMessage(
                '❌ **Thiếu tham số!** ❌\n\n' +
                '📝 **Cú pháp:** `lich del <id>`\n\n' +
                '💡 Sử dụng `lich list` để xem danh sách và lấy ID!',
                threadID, messageID
            );
        }
        
        const idx = all.findIndex(x => x.id === id && String(x.threadId) === String(threadID));
        if (idx === -1) {
            return api.sendMessage(
                '❌ **Không tìm thấy lịch hẹn với ID đã cho!** ❌\n\n' +
                '💡 Sử dụng `lich list` để xem danh sách và kiểm tra ID!',
                threadID, messageID
            );
        }
        
        const removed = all.splice(idx, 1)[0];
        saveAll(all);
        
        return api.sendMessage(
            `✅ **Đã xóa lịch hẹn thành công!** ✅\n\n` +
            `📅 **${removed.title}**\n` +
            `• 🆔 ID: \`${removed.id}\`\n` +
            `• ⏰ Thời gian: \`${moment(removed.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\`\n` +
            `• 📊 Trạng thái: \`${removed.status}\``,
            threadID, messageID
        );
    }

    if (sub === 'test') {
        const id = args[1];
        if (!id) {
            return api.sendMessage(
                '❌ **Thiếu tham số!** ❌\n\n' +
                '📝 **Cú pháp:** `lich test <id>`\n\n' +
                '💡 Sử dụng `lich list` để xem danh sách và lấy ID!',
                threadID, messageID
            );
        }
        
        const item = all.find(x => x.id === id && String(x.threadId) === String(threadID));
        if (!item) {
            return api.sendMessage(
                '❌ **Không tìm thấy lịch hẹn với ID đã cho!** ❌\n\n' +
                '💡 Sử dụng `lich list` để xem danh sách và kiểm tra ID!',
                threadID, messageID
            );
        }
        
        if (item.status !== 'pending') {
            return api.sendMessage(
                '❌ **Không thể test lịch hẹn này!** ❌\n\n' +
                `📊 **Trạng thái hiện tại:** \`${item.status}\`\n\n` +
                '💡 Chỉ có thể test lịch hẹn đang ở trạng thái "pending"!',
                threadID, messageID
            );
        }
        
        // Test nhắc nhở ngay lập tức với tag UID
        const msg = `⏰ **TEST - NHẮC LỊCH HẸN** ⏰\n\n` +
                   `📅 **${item.title}**\n` +
                   `• ⏰ Thời gian: \`${moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\`\n` +
                   `• 👤 Người tạo: <@${item.creatorId}>\n\n` +
                   `❓ **Đây là test nhắc nhở**\n\n` +
                   `💡 **Cách xác nhận:**\n` +
                   `1️⃣ **Thả tim ❤️** vào tin nhắn này để dừng nhắc nhở ngay lập tức\n` +
                   `2️⃣ **Reply "ok"** hoặc bất kỳ tin nhắn nào để dừng nhắc nhở\n\n` +
                   `🔄 **Trạng thái:** Test nhắc nhở...`;
        
        return api.sendMessage(msg, threadID, messageID);
    }

    return api.sendMessage(
        '❌ **Tham số không hợp lệ!** ❌\n\n' +
        '💡 **Gõ:** `lich help` để xem hướng dẫn sử dụng\n\n' +
        '📝 **Các lệnh có sẵn:**\n' +
        '• `lich add` - Tạo lịch hẹn mới\n' +
        '• `lich list` - Xem danh sách lịch hẹn\n' +
        '• `lich del` - Xóa lịch hẹn\n' +
        '• `lich test` - Test nhắc nhở',
        threadID, messageID
    );
};
