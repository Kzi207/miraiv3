module.exports.config = {
    name: "kick",
    version: "1.0.0",
    hasPermssion: 1,
    Rent: 1,
    credits: "Niio-team (Vtuan)",
    description: "Quản Lí Box",
    commandCategory: "Quản Trị Viên",
    usages: "No",
    cooldowns: 0
};

module.exports.run = async ({ api, event, args, Threads }) => {
    const { threadID, messageID, mentions, type, messageReply } = event;
    const threadInfo = (await Threads.getData(event.threadID)).threadInfo;

    let uids = [];
    if (type === "message_reply" && messageReply) {
        uids.push(messageReply.senderID);
    } else if (mentions && Object.keys(mentions).length > 0) {
        uids = Object.keys(mentions);
    } else if (args[0] === "all") {
        uids = event.participantIDs;
    }

    if (uids.length === 0) {
        return api.sendMessage("Reply hoặc tag người muốn kick", threadID, messageID);
    }

    const botID = api.getCurrentUserID();
    const botIsAdmin = threadInfo.adminIDs.some(admin => admin.id === botID);

    if (!botIsAdmin) {
        return api.sendMessage("Bot cần quyền quản trị viên để thực hiện lệnh này.", threadID, messageID);
    }

    const { ADMINBOT } = global.config 

    if (ADMINBOT.includes(uids) || botID.includes(uids)) return api.sendMessage("Bố kick mày bây giờ ? Biết ai không mà kick?", threadID, messageID);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const uid of uids) {
        if (uid == botID) continue;
        api.removeUserFromGroup(uid, threadID, (err) => {
            if (err) {
                return api.sendMessage(`Không thể kick người dùng ${uid}: ${err}`, threadID, messageID);
            } else {
                api.sendMessage(`Đã kick người dùng ${uid} khỏi nhóm.`, threadID, messageID);
            }
        });
        await delay(500);
    }
}
