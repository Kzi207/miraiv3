module.exports = function({
  api,
  models
}) {
  const fs = require('fs');
  const path = require('path');
  const Users = require("./controllers/users")({
    models,
    api
  });
  const Threads = require("./controllers/threads")({
    models,
    api
  });
  const Currencies = require("./controllers/currencies")({
    models
  });
  const logger = require("../utils/log.js");
  (async () => {
    try {
      logger.loader("Tiến hành tải dữ liệu người dùng và nhóm");
      const [threads, users, currencies] = await Promise.all([
        Threads.getAll(),
        Users.getAll(['userID', 'name', 'data']),
        Currencies.getAll(['userID'])
      ]);
      for (let i = 0; i < threads.length; i++) {
        const data = threads[i];
        const idThread = String(data.threadID);
        global.data.allThreadID.push(idThread);
        global.data.threadData.set(idThread, data.data || {});
        global.data.threadInfo.set(idThread, data.threadInfo || {});
        if (data.data?.banned) {
          global.data.threadBanned.set(idThread, {
            reason: data.data.reason || '',
            dateAdded: data.data.dateAdded || ''
          });
        }
        if (data.data?.commandBanned?.length) {
          global.data.commandBanned.set(idThread, data.data.commandBanned);
        }
        if (data.data?.NSFW) {
          global.data.threadAllowNSFW.push(idThread);
        }
      }
      for (let i = 0; i < users.length; i++) {
        const dataU = users[i];
        const idUsers = String(dataU.userID);
        global.data.allUserID.push(idUsers);
        if (dataU.name?.length) {
          global.data.userName.set(idUsers, dataU.name);
        }
        if (dataU.data?.banned) {
          global.data.userBanned.set(idUsers, {
            reason: dataU.data.reason || '',
            dateAdded: dataU.data.dateAdded || ''
          });
        }
        if (dataU.data?.commandBanned?.length) {
          global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
        }
      }
      for (let i = 0; i < currencies.length; i++) {
        const dataC = currencies[i];
        global.data.allCurrenciesID.push(String(dataC.userID));
      }
      logger.loader(`Tải thành công dữ liệu của ${global.data.allThreadID.length} nhóm`);
      logger.loader(`Tải thành công dữ liệu của ${global.data.allUserID.length} người dùng`);
    } catch (error) {
      logger(`Tải môi trường thất bại: ${error}`, 'error');
    }
  })();
  require('./handle/handleSchedule.js')({
    api,
    Threads,
    Users,
    models
  });
  
  // Khởi tạo HandSu handler
  try {
    console.log('🚀 HandSu handler sẽ được load tự động');
  } catch (error) {
    logger(`Không thể load HandSu handler: ${error}`, 'error');
  }
  
  logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "This bot was made by CatalizCS and SpermLord" : global.config.BOTNAME}`, "[ BOT INFO ] >");
  const handlers = fs.readdirSync(path.join(__dirname, './handle')).reduce((acc, file) => {
    return {
      ...acc,
      [path.basename(file, '.js')]: require(`./handle/${file}`)({
        api,
        models,
        Users,
        Threads,
        Currencies
      })
    };
  }, {});
  return async function(event) {
    // Bỏ qua sự kiện rỗng hoặc không có threadID để tránh lỗi truy cập thuộc tính
    if (!event || !event.threadID) return;
    const a = path.join(__dirname, '/../utils/data/approvedThreads.json');
    const b = path.join(__dirname, '/../utils/data/pendingThreads.json');
    if (!fs.existsSync(a)) {
      fs.writeFileSync(a, JSON.stringify([]), 'utf-8');
    }
    if (!fs.existsSync(b)) {
      fs.writeFileSync(b, JSON.stringify([]), 'utf-8');
    }
    const c = JSON.parse(fs.readFileSync(a, 'utf-8'));
    const d = global.config.ADMINBOT;
    const e = global.config.NDH;
    const f = global.config.BOXADMIN;
    let g = await api.getThreadInfo(event.threadID);
    let h = g.threadName;
    if (!c.includes(event.threadID) && !d.includes(event.senderID) && !e.includes(event.senderID)) {
      const i = (await Threads.getData(String(event.threadID))).data || {};
      const j = i.hasOwnProperty('PREFIX') ? i.PREFIX : global.config.PREFIX;
      const k = global.config.BOTNAME;
      if (event.body && event.body.toLowerCase() === 'duyetbox') {
        api.sendMessage(`[ Thông Báo ]\n\n📜 Yêu cầu duyệt từ box ID: ${event.threadID}`, f);
        return api.sendMessage(`✅ Đã gửi yêu cầu duyệt đến nhóm admin!`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
          let l = JSON.parse(fs.readFileSync(b, 'utf-8'));
          if (!l.includes(event.threadID)) {
            l.push(event.threadID);
            fs.writeFileSync(b, JSON.stringify(l, null, 2), 'utf-8');
          }
        });
      }
      if (event.body && event.body.startsWith(j)) {
        return api.sendMessage(`❎ Nhóm của bạn chưa được Admin duyệt, hãy chat "duyetbox" để yêu cầu được duyệt`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
        });
      }
    }
    await handlers['handleCreateDatabase']({
      event
    });
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        // Xử lý handleCommand trước
        await handlers['handleCommand']({
          event
        });
        
        // Chỉ xử lý handleReply nếu handleCommand không xử lý
        const prefix = global.config.PREFIX || '.';
        const trimmedBody = event.body ? event.body.trim() : '';
        const isCommand = trimmedBody.startsWith(prefix);
        
        // Nếu không phải lệnh, mới xử lý handleReply
        if (!isCommand) {
          await handlers['handleReply']({
            event
          });
        }
        
        // Xử lý handleCommandEvent
        await handlers['handleCommandEvent']({
          event
        });
        
        // Xử lý handleSchedule cho lịch hẹn (tin nhắn)
        if (handlers['handleSchedule']) {
          await handlers['handleSchedule']({
            event
          });
        }
        
        // TẠM THỜI TẮT HANDSU ĐỂ TEST
        // Chỉ chạy handsu khi hoàn toàn không phải lệnh  
        // if (!isCommand && trimmedBody && handlers['handsu'] && handlers['handsu'].handleEvent) {
        //   console.log(`🔍 HandSu: Phát hiện tin nhắn không phải lệnh: "${trimmedBody}"`);
        //   await handlers['handsu'].handleEvent({
        //     api,
        //     event
        //   });
        // }
        break;
      case "event":
        await Promise.all([ handlers['handleEvent']({
          event
        }),
        handlers['handleRefresh']({ event }),
        ]);
        break;
      case "message_reaction":
        // Xử lý handleReaction cho các lệnh
        await handlers['handleReaction']({
          event
        });
        
        // Xử lý handleSchedule cho lịch hẹn
        if (handlers['handleSchedule']) {
          await handlers['handleSchedule']({
            event
          });
        }
        break;
      default:
        break;
    }
  };
};