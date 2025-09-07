module.exports.config = {
    name: "stk",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kzi",
    description: "Donate",
    commandCategory: "Box",
    usages: "stk",
    cooldowns: 5,
    dependencies: {
      "request":"",
      "fs-extra":"",
      "axios":""
    }
  };
  
  module.exports.run = async({api,event,args,client,Users,Threads,__GLOBAL,Currencies}) => {
  const axios = global.nodemodule["axios"];
  const request = global.nodemodule["request"];
  const fs = global.nodemodule["fs-extra"];
    var link = [
  "https://i.imgur.com/CygJIqC.gif",
  "https://i.imgur.com/ij2RQ0j.gif",
    ];
        var callback = () => api.sendMessage({body:`==== 💙 [ 𝐃𝐎𝐍𝐀𝐓𝐄 ] 💙 ====\n──────────────────\n💕💕 𝐌𝐁𝐁𝐀𝐍𝐊 𝐯𝐬 𝐌𝐎𝐌𝐎 💕💕\n→ Tên: LE KHANH DUY\n→ 𝐒𝐓𝐊: 0939042183`, attachment: fs.createReadStream(__dirname + "/cache/5.gif")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/5.gif")); 
        return request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(__dirname+"/cache/5.gif")).on("close",() => callback());
     };