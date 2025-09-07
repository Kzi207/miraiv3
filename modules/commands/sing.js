// MAGICA PROJECT - YOUTUBE AUDIO DOWNLOADER

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const yts = require('youtube-search-api');
const { create } = require('youtube-dl-exec');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const CACHE_DIR = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_DIR);

const ytDlpPath = path.join(__dirname, '..', '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const ytDlp = create(ytDlpPath, {
  shell: false,
  ffmpegLocation: ffmpegPath
});

module.exports.config = {
  name: "sing",
  version: "4.3",
  hasPermssion: 0,
  credits: "Doniac",
  description: "Tìm nhạc YouTube theo từ khoá và gửi file m4a",
  commandCategory: "phương tiện",
  usages: "[từ khóa]",
  cooldowns: 0
};

function convertHMS(sec) {
  sec = Number(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function cleanup(filePath) {
  setTimeout(() => fs.unlink(filePath).catch(() => {}), 30000);
}

function parseDuration(durationText) {
  if (!durationText) return 0;
  const parts = durationText.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

async function downloadMusicAndInfo(url) {
  const timestart = Date.now();
  const info = await ytDlp(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    forceIpv4: true
  });

  const outputPath = path.join(CACHE_DIR, `${info.id}.m4a`);
  await ytDlp(url, {
    extractAudio: true,
    audioFormat: 'm4a',
    audioQuality: 0,
    output: outputPath,
    ffmpegLocation: ffmpegPath,
    forceIpv4: true
  });

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 26214400) {
      fs.unlinkSync(outputPath);
      throw new Error(`⚠️ Audio thực tế ${(stats.size/1048576).toFixed(2)}MB, vượt quá 25MB!`);
    }
  }

  return {
    title: info.title,
    dur: info.duration,
    author: info.uploader || 'YouTube Channel',
    viewCount: info.view_count || 0,
    likes: info.like_count || 0,
    thumbnail: info.thumbnail,
    timestart,
    id: info.id,
    filePath: outputPath
  };
}

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const input = args.join(" ");
  if (!input) return api.sendMessage("Cậu cần nhập từ khóa để tôi tìm chứ?", threadID, event.messageID);

  try {
    // Block url youtube từ youtube-search-api
    const urlRegex = /(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/i;
    if (urlRegex.test(input)) return;

    // React search emoji
    api.setMessageReaction("🔎", event.messageID, () => {}, true);

    const res = await yts.GetListByKeyword(input, false, 12);
    let vids = res.items.filter(v => v.type === 'video');
    
    vids = vids.filter(v => {
      if (!v.length || !v.length.simpleText) return true;
      const durationSeconds = parseDuration(v.length.simpleText);
      return durationSeconds <= 1200;
    });

    vids = vids.slice(0, 6);

    if (vids.length === 0) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("Tôi không tìm thấy kết quả nào phù hợp.", threadID, event.messageID);
    }

    const thumbArr = await Promise.all(vids.map(async (v, i) => {
      const url = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
      const imgPath = path.join(CACHE_DIR, `${uid}-thumb-${i + 1}.jpg`);
      const response = await axios.get(url, { responseType: 'stream' });
      const writer = fs.createWriteStream(imgPath);
      await new Promise((res, rej) => {
        response.data.pipe(writer);
        writer.on('finish', res);
        writer.on('error', rej);
      });
      return fs.createReadStream(imgPath);
    }));

    let msg = "";
    vids.forEach((v, i) => {
      msg += `${i + 1}. ${v.title}\n⌛ ${v.length.simpleText || '??'} | 📺 ${v.channelTitle || 'Không rõ'}\n\n`;
    });

    api.sendMessage({
      body: `Tôi tìm thấy vài bài phù hợp:\n\n${msg}↪️ Cậu hãy reply số để chọn nhé.`,
      attachment: thumbArr
    }, threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: uid,
        link: vids.map(v => v.id),
        originalMessageID: event.messageID
      });
    }, event.messageID);
  } catch (e) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return api.sendMessage("Có lỗi khi tìm kiếm. Cậu thử lại sau nhé.", threadID, event.messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const idx = parseInt(event.body) - 1;
  if (isNaN(idx) || idx < 0 || idx >= handleReply.link.length)
    return api.sendMessage("⚠️ Số không hợp lệ, chọn lại nhé!", event.threadID, event.messageID);

  const videoId = handleReply.link[idx];
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const data = await downloadMusicAndInfo(url);
    if (!fs.existsSync(data.filePath)) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ File không tồn tại, tải lỗi!", event.threadID, event.messageID);
    }

    api.unsendMessage(handleReply.messageID);

    for (let i = 1; i <= 6; i++) {
      const searchThumb = path.join(CACHE_DIR, `${event.senderID}-thumb-${i}.jpg`);
      if (fs.existsSync(searchThumb)) {
        try {
          fs.unlinkSync(searchThumb);
        } catch (err) {}
      }
    }

    let attachment = null;
    const thumbPath = path.join(CACHE_DIR, `${data.id}-thumb.jpg`);
    try {
      const res = await axios.get(data.thumbnail, { responseType: 'stream' });
      const writer = fs.createWriteStream(thumbPath);
      await new Promise((resolve, reject) => {
        res.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      attachment = fs.createReadStream(thumbPath);
    } catch (e) {}

    const stats = fs.statSync(data.filePath);
    const fileSizeMB = (stats.size / 1048576).toFixed(2);
    const timeUsed = Math.floor((Date.now() - data.timestart) / 1000);

    api.sendMessage({
      body: `> SING: YouTube Audio

🎵 ${data.title}
📺 Kênh: ${data.author}
⏳ Thời lượng: ${convertHMS(data.dur)}
👁️ View: ${data.viewCount.toLocaleString()}
👍 Like: ${data.likes.toLocaleString()}
📦 Kích thước: ${fileSizeMB} MB
⏱️ Xử lý trong: ${timeUsed} giây`,
      attachment
    }, event.threadID, () => {
      if (fs.existsSync(thumbPath)) {
        try {
          fs.unlinkSync(thumbPath);
        } catch {}
      }
    }, handleReply.originalMessageID);

    setTimeout(() => {
      if (!fs.existsSync(data.filePath)) {
        return api.sendMessage("⚠️ Lỗi: File audio không tồn tại!", event.threadID);
      }

      api.sendMessage({
        attachment: fs.createReadStream(data.filePath)
      }, event.threadID, (err) => {
        if (!err) {
          api.setMessageReaction("✅", event.messageID, () => {}, true);
          cleanup(data.filePath);
        } else {
          setTimeout(() => {
            api.sendMessage({
              attachment: fs.createReadStream(data.filePath)
            }, event.threadID, (retryErr) => {
              if (!retryErr) {
                api.setMessageReaction("✅", event.messageID, () => {}, true);
                cleanup(data.filePath);
              } else {
                api.setMessageReaction("❌", event.messageID, () => {}, true);
                api.sendMessage("⚠️ Không thể gửi file audio. Vui lòng thử lại!", event.threadID, event.messageID);
              }
            });
          }, 2000);
        }
      });
    }, 3000);

  } catch (err) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    
    if (err.message.includes('vượt quá')) {
      api.sendMessage(err.message, event.threadID, event.messageID);
    } else {
      api.sendMessage("⚠️ Có lỗi xảy ra khi tải nhạc!", event.threadID, event.messageID);
    }
  }
};
