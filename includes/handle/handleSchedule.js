const cron = require('node-cron');
const fs = require('fs');
const moment = require('moment-timezone');
const path = require('path');
const logger = require('../../utils/log');

module.exports = function ({ api, Threads }) {
  console.log('🚀 handleSchedule.js đang được khởi tạo...');
  
  // Đảm bảo thư mục và file lưu lịch tồn tại
  const schedulePath = path.join(__dirname, '..', '..', 'modules', 'commands', 'data', 'schedule.json');
  const ensureScheduleFile = () => {
    const dir = path.dirname(schedulePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('📁 Đã tạo thư mục data');
    }
    if (!fs.existsSync(schedulePath)) {
      fs.writeFileSync(schedulePath, '[]', 'utf-8');
      console.log('📄 Đã tạo file schedule.json');
    }
    console.log('✅ File schedule.json đã sẵn sàng:', schedulePath);
  };
  ensureScheduleFile();

  // Gửi tin nhắn ưu tiên inbox người tạo; nếu lỗi mới gửi vào nhóm
  function sendWithPriority(message, item) {
    return new Promise((resolve) => {
      api.sendMessage(message, item.creatorId, (err) => {
        if (err) {
          return api.sendMessage(message, item.threadId, () => resolve());
        }
        return resolve();
      });
    });
  }

  // Cron: 10 phút/lần đồng bộ Threads cũ (giữ nguyên logic cũ)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const cc = path.join(__dirname, '..', '..', 'utils', 'data', 'check_data.json');
      const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
      let lastRunTime = null;
      if (fs.existsSync(cc)) {
        const { datetime } = JSON.parse(fs.readFileSync(cc, 'utf-8'));
        lastRunTime = datetime;
      }
      if (!lastRunTime || moment(currentTime).diff(moment(lastRunTime), 'minutes') >= 10) {
        const groupList = (await api.getThreadList(100, null, ['INBOX'])).filter(group => group.isSubscribed && group.isGroup);
        let dataChanged = false;
        for (const { threadID } of groupList) {
          const newThreadInfo = await api.getThreadInfo(threadID);
          const oldThreadInfo = await Threads.getData(threadID);
          if (JSON.stringify(newThreadInfo) !== JSON.stringify(oldThreadInfo.threadInfo)) {
            await Threads.setData(threadID, { threadInfo: newThreadInfo });
            dataChanged = true;
          }
        }
        if (dataChanged) {
          fs.writeFileSync(cc, JSON.stringify({ datetime: currentTime }));
          logger(`Tự động cập nhật data của ${groupList.length} box`, '[ DATA ] >');
        }
      }
    } catch (err) {
      logger(`Scheduler sync threads lỗi: ${err?.message || err}`, 'error');
    }
  });

  // Cron: Mỗi phút kiểm tra lịch hẹn để gửi nhắc
  cron.schedule('* * * * *', async () => {
    try {
      console.log('🕐 Cron job đang chạy - kiểm tra lịch hẹn...');
      ensureScheduleFile();
      const data = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
      if (!Array.isArray(data) || data.length === 0) {
        console.log('📅 Không có lịch hẹn nào để kiểm tra');
        return;
      }
      console.log(`📅 Đang kiểm tra ${data.length} lịch hẹn...`);
      const now = moment().tz('Asia/Ho_Chi_Minh');
      let changed = false;
      for (const item of data) {
        if (item?.status !== 'pending') {
          console.log(`⏭️ Bỏ qua item ${item.id} - status: ${item.status}`);
          continue;
        }
        const scheduleTime = moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh');
        if (!scheduleTime.isValid()) {
          console.log(`❌ Item ${item.id} có thời gian không hợp lệ: ${item.scheduleTime}`);
          continue;
        }

        // Nhắc trước 20 phút nếu chưa nhắc
        const twentyBefore = moment(scheduleTime).subtract(20, 'minutes');
        if (!item.notified20m && now.isSameOrAfter(twentyBefore)) {
          console.log(`⏰ Nhắc trước 20 phút cho item ${item.id}: ${item.title}`);
          const msg = `⏰ **NHẮC LỊCH HẸN** ⏰\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${scheduleTime.format('HH:mm DD/MM/YYYY')}\n• 👤 Người tạo: <@${item.creatorId}>\n\n❓ **Bạn có mặt chứ?**\n\n💡 **Cách xác nhận:**\n1️⃣ **Thả tim ❤️** vào tin nhắn này để dừng nhắc nhở ngay lập tức\n2️⃣ **Reply "ok"** hoặc bất kỳ tin nhắn nào để dừng nhắc nhở\n3️⃣ Bot sẽ nhắc lại mỗi 5 phút nếu chưa phản hồi\n\n🔄 **Trạng thái:** Chờ xác nhận...`;
          
          // Gửi tin nhắn nhắc nhở và lưu messageID để xử lý cảm xúc
          try {
            const sentMsg = await api.sendMessage(msg, item.threadId);
            if (sentMsg && sentMsg.messageID) {
              item.reminderMessageID = sentMsg.messageID;
              console.log(`✅ Đã gửi nhắc nhở với messageID: ${sentMsg.messageID}`);
            }
          } catch (err) {
            console.log(`❌ Lỗi khi gửi nhắc nhở:`, err);
            // Thử gửi vào inbox người tạo
            try {
              const sentMsg = await api.sendMessage(msg, item.creatorId);
              if (sentMsg && sentMsg.messageID) {
                item.reminderMessageID = sentMsg.messageID;
                console.log(`✅ Đã gửi nhắc nhở vào inbox với messageID: ${sentMsg.messageID}`);
              }
            } catch (inboxErr) {
              console.log(`❌ Không thể gửi nhắc nhở vào inbox:`, inboxErr);
            }
          }
          
          item.notified20m = true;
          item.lastReminderAt = now.toISOString();
          changed = true;
          console.log(`✅ Đã nhắc trước 20 phút cho item ${item.id}`);
          continue;
        }

        // Sau khi đã nhắc, nếu chưa có phản hồi thì nhắc lại mỗi 5 phút
        if (item.notified20m && !item.responded) {
          const lastReminder = item.lastReminderAt ? moment(item.lastReminderAt) : null;
          if (!lastReminder || now.diff(lastReminder, 'minutes') >= 5) {
            console.log(`🔔 Nhắc lại cho item ${item.id}: ${item.title}`);
            const msg = `🔔 **NHẮC LẠI LỊCH HẸN** 🔔\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${scheduleTime.format('HH:mm DD/MM/YYYY')}\n• 👤 Người tạo: <@${item.creatorId}>\n\n⚠️ **Vẫn chưa thấy phản hồi!**\n\n💡 **Cách xác nhận:**\n1️⃣ **Thả tim ❤️** vào tin nhắn này để dừng nhắc nhở ngay lập tức\n2️⃣ **Reply "ok"** hoặc bất kỳ tin nhắn nào để dừng nhắc nhở\n3️⃣ Bot sẽ tiếp tục nhắc lại mỗi 5 phút\n\n🔄 **Trạng thái:** Chờ xác nhận...`;
            
            // Gửi tin nhắn nhắc lại và cập nhật messageID
            try {
              const sentMsg = await api.sendMessage(msg, item.threadId);
              if (sentMsg && sentMsg.messageID) {
                item.reminderMessageID = sentMsg.messageID;
                console.log(`✅ Đã gửi nhắc lại với messageID: ${sentMsg.messageID}`);
              }
            } catch (err) {
              console.log(`❌ Lỗi khi gửi nhắc lại:`, err);
              // Thử gửi vào inbox người tạo
              try {
                const sentMsg = await api.sendMessage(msg, item.creatorId);
                if (sentMsg && sentMsg.messageID) {
                  item.reminderMessageID = sentMsg.messageID;
                  console.log(`✅ Đã gửi nhắc lại vào inbox với messageID: ${sentMsg.messageID}`);
                }
              } catch (inboxErr) {
                console.log(`❌ Không thể gửi nhắc lại vào inbox:`, inboxErr);
              }
            }
            
            item.lastReminderAt = now.toISOString();
            changed = true;
            console.log(`✅ Đã nhắc lại cho item ${item.id}`);
          } else {
            const minutesSinceLastReminder = now.diff(lastReminder, 'minutes');
            console.log(`⏳ Item ${item.id} chưa đến lúc nhắc lại (${minutesSinceLastReminder}/5 phút)`);
          }
        }

        // Tự động chuyển trạng thái khi qua thời điểm hẹn 30 phút
        if (now.isAfter(moment(scheduleTime).add(30, 'minutes')) && item.status === 'pending') {
          console.log(`⏰ Chuyển trạng thái expired cho item ${item.id}: ${item.title}`);
          item.status = 'expired';
          changed = true;
          console.log(`✅ Đã chuyển item ${item.id} sang trạng thái expired`);
        }
      }
      if (changed) {
        console.log('💾 Lưu thay đổi vào file schedule.json');
        fs.writeFileSync(schedulePath, JSON.stringify(data, null, 2), 'utf-8');
      } else {
        console.log('📝 Không có thay đổi nào');
      }
    } catch (err) {
      logger(`Scheduler check lịch lỗi: ${err?.message || err}`, 'error');
      console.error('❌ Lỗi trong cron job:', err);
    }
  });
  
  console.log('✅ Cron job đã được đăng ký - chạy mỗi phút');
  
  // Handler: ghi nhận phản hồi của người tạo lịch trong box hoặc inbox riêng
  return async function({ event }) {
    try {
      if (!event) return;
      console.log(`🎯 handleSchedule nhận event: ${event.type}`);
      ensureScheduleFile();
      const data = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
      if (!Array.isArray(data) || data.length === 0) {
        console.log('📝 Không có lịch hẹn nào để xử lý');
        return;
      }
      const now = moment().toISOString();
      let changed = false;
      
      // Chống spam: kiểm tra xem event này đã được xử lý chưa
      const eventKey = `${event.type}_${event.senderID}_${event.threadID}_${now}`;
      if (global.processedEvents && global.processedEvents.has(eventKey)) {
        console.log(`🚫 Event đã được xử lý, bỏ qua để tránh spam: ${eventKey}`);
        return;
      }
      
      // Đánh dấu event đã được xử lý
      if (!global.processedEvents) global.processedEvents = new Set();
      global.processedEvents.add(eventKey);
      
      // Xóa event cũ sau 1 phút để tránh memory leak
      setTimeout(() => {
        if (global.processedEvents) {
          global.processedEvents.delete(eventKey);
        }
      }, 60000);
      
      // Xử lý message_reaction event (thả cảm xúc)
      if (event.type === 'message_reaction') {
        console.log(`🎭 Xử lý sự kiện cảm xúc từ user ${event.senderID}`);
        for (const item of data) {
          if (item.status !== 'pending') {
            console.log(`⏭️ Bỏ qua item ${item.id} - status: ${item.status}`);
            continue;
          }
          
          // Kiểm tra xem có phải người tạo lịch không
          if (String(event.senderID) !== String(item.creatorId)) {
            console.log(`⏭️ Bỏ qua item ${item.id} - senderID: ${event.senderID}, creatorId: ${item.creatorId}`);
            continue;
          }
          
          // Xử lý cảm xúc tim để dừng nhắc nhở ngay lập tức
          if (event.reaction === '❤️' || event.reaction === '❤' || event.reaction === 'heart') {
            console.log(`💖 User ${event.senderID} đã thả cảm xúc tim cho item ${item.id}`);
            
            // Cập nhật trạng thái lịch hẹn ngay lập tức
            item.responded = true;
            item.respondedAt = now;
            item.status = 'completed';
            item.completionMethod = 'heart_reaction';
            changed = true;
            
            // Gửi thông báo hoàn thành duy nhất vào nhóm gốc
            const completionMsg = `🎉 **HOÀN THÀNH LỊCH HẸN!** 🎉\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• ✅ Đã xác nhận lúc: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• 💖 Phương thức: Thả tim ❤️\n• 🚫 Bot đã dừng nhắc nhở cho lịch này\n\n💡 Cảm ơn bạn đã sử dụng hệ thống nhắc nhở!`;
            
            try {
              await api.sendMessage(completionMsg, item.threadId);
              console.log(`✅ Đã gửi thông báo hoàn thành vào nhóm cho item ${item.id}`);
            } catch (err) {
              logger(`Không thể gửi thông báo hoàn thành vào nhóm: ${err?.message || err}`, 'error');
            }
            
            continue;
          }
          
          // Xử lý các cảm xúc khác (chỉ khi đã nhắc nhở và chưa phản hồi)
          if (!item.notified20m || item.responded) {
            console.log(`⏭️ Bỏ qua item ${item.id} - notified20m: ${item.notified20m}, responded: ${item.responded}`);
            continue;
          }
          
          // Đánh dấu đã phản hồi khi người tạo thả cảm xúc
          console.log(`✅ User ${event.senderID} đã thả cảm xúc cho item ${item.id}`);
          
          // Cập nhật trạng thái lịch hẹn
          item.responded = true;
          item.respondedAt = now;
          item.completionMethod = 'other_reaction';
          changed = true;
          
          // Gửi thông báo hoàn thành duy nhất vào nhóm gốc
          const completionMsg = `🎉 **HOÀN THÀNH LỊCH HẸN!** 🎉\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• ✅ Đã xác nhận lúc: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• 🎭 Phương thức: Thả cảm xúc\n• 🚫 Bot đã dừng nhắc nhở cho lịch này\n\n💡 Cảm ơn bạn đã sử dụng hệ thống nhắc nhở!`;
          
          try {
            await api.sendMessage(completionMsg, item.threadId);
            console.log(`✅ Đã gửi thông báo hoàn thành vào nhóm cho item ${item.id}`);
          } catch (err) {
            logger(`Không thể gửi thông báo hoàn thành vào nhóm: ${err?.message || err}`, 'error');
          }
        }
      }
      
      // Xử lý message event (gửi tin nhắn hoặc reply)
      if (event.type === 'message' && event.body) {
        console.log(`💬 Xử lý sự kiện tin nhắn từ user ${event.senderID} trong thread ${event.threadID}`);
        for (const item of data) {
          if (item.status !== 'pending') {
            console.log(`⏭️ Bỏ qua item ${item.id} - status: ${item.status}`);
            continue;
          }
          
          // Kiểm tra xem có phải người tạo lịch không
          if (String(event.senderID) !== String(item.creatorId)) {
            console.log(`⏭️ Bỏ qua item ${item.id} - senderID: ${event.senderID}, creatorId: ${item.creatorId}`);
            continue;
          }
          
          const isInThread = String(event.threadID) === String(item.threadId);
          const isInInbox = String(event.threadID) === String(item.creatorId);
          if (!(isInThread || isInInbox)) {
            console.log(`⏭️ Bỏ qua item ${item.id} - không trong thread hoặc inbox`);
            continue;
          }
          
          // Kiểm tra xem có phải reply vào tin nhắn nhắc nhở không
          let isReply = false;
          if (event.messageReply && event.messageReply.messageID) {
            // Kiểm tra xem có phải reply vào tin nhắn nhắc nhở không
            if (item.reminderMessageID && String(event.messageReply.messageID) === String(item.reminderMessageID)) {
              isReply = true;
              console.log(`🔄 User đã reply vào tin nhắn nhắc nhở`);
            }
          }
          
          // Xử lý reply "ok" hoặc bất kỳ tin nhắn nào để dừng nhắc nhở
          const messageBody = (event.body || '').toLowerCase().trim();
          const isOkMessage = messageBody === 'ok' || messageBody === 'okay' || messageBody === 'được' || messageBody === 'xong' || messageBody === 'done';
          
          // Nếu là reply vào tin nhắn nhắc nhở hoặc gửi tin nhắn "ok", dừng nhắc nhở ngay lập tức
          if (isReply || isOkMessage) {
            console.log(`✅ User ${event.senderID} đã reply hoặc gửi tin nhắn "ok" cho item ${item.id}`);
            
            // Cập nhật trạng thái lịch hẹn
            item.responded = true;
            item.respondedAt = now;
            item.status = 'completed';
            item.completionMethod = isReply ? 'reply_to_reminder' : 'ok_message';
            changed = true;
            
            // Gửi thông báo hoàn thành duy nhất vào nhóm gốc
            const completionMsg = `🎉 **HOÀN THÀNH LỊCH HẸN!** 🎉\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• ✅ Đã xác nhận lúc: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• 💬 Phương thức: ${isReply ? 'Reply tin nhắn nhắc nhở' : 'Gửi tin nhắn "ok"'}\n• 🚫 Bot đã dừng nhắc nhở cho lịch này\n\n💡 Cảm ơn bạn đã sử dụng hệ thống nhắc nhở!`;
            
            try {
              await api.sendMessage(completionMsg, item.threadId);
              console.log(`✅ Đã gửi thông báo hoàn thành vào nhóm cho item ${item.id}`);
            } catch (err) {
              logger(`Không thể gửi thông báo hoàn thành vào nhóm: ${err?.message || err}`, 'error');
            }
            
            continue;
          }
          
          // Xử lý các tin nhắn khác (chỉ khi đã nhắc nhở và chưa phản hồi)
          if (!item.notified20m || item.responded) {
            console.log(`⏭️ Bỏ qua item ${item.id} - notified20m: ${item.notified20m}, responded: ${item.responded}`);
            continue;
          }
          
          // Đánh dấu đã phản hồi khi người tạo gửi bất kỳ tin nhắn nào sau khi đã nhắc
          console.log(`✅ User ${event.senderID} đã gửi tin nhắn cho item ${item.id}`);
          
          // Cập nhật trạng thái lịch hẹn
          item.responded = true;
          item.respondedAt = now;
          item.completionMethod = 'any_message';
          changed = true;
          
          // Gửi thông báo hoàn thành duy nhất vào nhóm gốc
          const completionMsg = `🎉 **HOÀN THÀNH LỊCH HẸN!** 🎉\n\n📅 **${item.title}**\n• ⏰ Thời gian: ${moment(item.scheduleTime).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• ✅ Đã xác nhận lúc: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY')}\n• 💬 Phương thức: Gửi tin nhắn\n• 🚫 Bot đã dừng nhắc nhở cho lịch này\n\n💡 Cảm ơn bạn đã sử dụng hệ thống nhắc nhở!`;
          
          try {
            await api.sendMessage(completionMsg, item.threadId);
            console.log(`✅ Đã gửi thông báo hoàn thành vào nhóm cho item ${item.id}`);
          } catch (err) {
            logger(`Không thể gửi thông báo hoàn thành vào nhóm: ${err?.message || err}`, 'error');
          }
        }
      }
      
      if (changed) {
        console.log('💾 Lưu thay đổi vào file schedule.json (handler)');
        fs.writeFileSync(schedulePath, JSON.stringify(data, null, 2), 'utf-8');
      } else {
        console.log('📝 Không có thay đổi nào (handler)');
      }
    } catch (err) {
      logger(`Scheduler handle event lỗi: ${err?.message || err}`, 'error');
      console.error('❌ Lỗi trong handler:', err);
    }
  };
  
  console.log('✅ handleSchedule.js đã được khởi tạo thành công!');
}