module.exports.config = {
  name: "test",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "kzi",
  description: "test",
  commandCategory: "Admin",
  cooldowns: 5
};

module.exports.run = async({api,event,args,client,Users,Threads,__GLOBAL,Currencies}) => {
    
  let name = "";
  let uid = "";

  api.sendMessage(
    {
      body: ` [do gemini trả về ]${name} nè!`,
      mentions: [
        {
          tag: name,  // dùng biến, không phải "name"
          id: uid     // dùng biến, không phải "uid"
        }
      ]
    },
    event.threadID,
    event.messageID
  );
}
