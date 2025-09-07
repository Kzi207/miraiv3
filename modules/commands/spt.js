const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const yts = require('youtube-search-api');
const { create } = require('youtube-dl-exec');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Endpoints cấu hình
const endpoints = {
  spotify: {
    token: 'https://accounts.spotify.com/api/token',
    search: 'https://api.spotify.com/v1/search',
    track: 'https://api.spotify.com/v1/tracks'
  }
};
const configPath = path.join(__dirname, 'spotify', 'spotify.json');
let spotifyConfig;

try {
  spotifyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Lỗi khi đọc file cấu hình Spotify:', error);
  spotifyConfig = { clientId: '', clientSecret: '' };
}

module.exports.config = {
  name: "spt",
  version: "1.0.6",
  hasPermssion: 0,
  credits: "Satoru",
  description: "Tìm kiếm, hiển thị thông tin và phát nhạc từ Spotify",
  commandCategory: "Nhạc",
  usages: "[tên bài hát]",
  cooldowns: 5,
};

let streamURL = (url, ext = 'jpg') => axios.get(url, {
    responseType: 'stream',
}).then(res => (res.data.path = `tmp.${ext}`, res.data)).catch(e => null);

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (senderID != handleReply.author) return;
  
  const choice = parseInt(body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.tracks.length) {
    return api.sendMessage("Lựa chọn không hợp lệ. Vui lòng chọn một số từ danh sách.", threadID, messageID);
  }
  const selectedTrack = handleReply.tracks[choice - 1];
  
  try {
    const downloadData = await getSpotifyTrackDownloadLink(selectedTrack.id);
    let audioStream = null;
    let filePathToSend = null;
    if (downloadData.filePath) {
      filePathToSend = downloadData.filePath;
    } else if (downloadData.link) {
      audioStream = await streamURL(downloadData.link, 'mp3');
    }

    if (filePathToSend || audioStream) {
      api.unsendMessage(handleReply.messageID);
      
      let msg = `🎵 ====[ MUSIC PLAY ]==== 🎵\n`;
      msg += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱\n`;
      msg += `📌 Tên: ${downloadData.metadata.title}\n`;
      msg += `🎤 Nghệ sĩ: ${downloadData.metadata.artists}\n`;
      msg += `💽 Album: ${downloadData.metadata.album}\n`;
      msg += `📅 Ngày phát hành: ${formatDate(downloadData.metadata.releaseDate)}\n`;
      msg += `⇆ㅤㅤㅤ◁ㅤㅤ❚❚ㅤㅤ▷ㅤㅤㅤ↻\n`;
      msg += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱`

      if (filePathToSend) {
        api.sendMessage({ body: msg }, threadID, () => {
          api.sendMessage({ attachment: fs.createReadStream(filePathToSend) }, threadID, (err) => {
            try { if (fs.existsSync(filePathToSend)) fs.unlinkSync(filePathToSend); } catch {}
            if (err) {
              console.error(err);
              api.sendMessage("❌ Có lỗi xảy ra khi gửi bài hát. Vui lòng thử lại sau.", threadID, messageID);
            }
          });
        });
      } else {
        api.sendMessage(
          {
            body: msg,
            attachment: audioStream,
          },
          threadID,
          (error, info) => {
            if (error) {
              console.error(error);
              api.sendMessage("❌ Có lỗi xảy ra khi gửi bài hát. Vui lòng thử lại sau.", threadID, messageID);
            }
          }
        );
      }
    } else {
      api.sendMessage("❌ Có lỗi xảy ra khi tải bài hát. Vui lòng thử lại sau.", threadID, messageID);
    }
  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.", threadID, messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  if (args.length === 0) {
    return api.sendMessage("⚠️ Vui lòng nhập tên bài hát bạn muốn tìm kiếm.", threadID, messageID);
  }

  const searchQuery = args.join(" ");
  
  try {
    const searchResults = await spotifySearch(searchQuery, 6);
    
    if (searchResults.length === 0) {
      return api.sendMessage("❌ Không tìm thấy bài hát nào phù hợp.", threadID, messageID);
    }

    let msg = "🎵 Đây là kết quả tìm kiếm cho bài hát của bạn:\n\n";
    searchResults.forEach((track, index) => {
      msg += `${index + 1}. ${track.name}\n🎙️ Ca sĩ: ${track.artists.map(a => a.name).join(", ")}\n-----------------\n`;
    });
    msg += "👉 Reply với số thứ tự để chọn bài hát bạn muốn nghe.";

    api.sendMessage(msg, threadID, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          tracks: searchResults
        });
      }
    }, messageID);
  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Đã xảy ra lỗi khi xử lý yêu cầu của bạn.", threadID, messageID);
  }
};

async function spotifySearch(keywords, limit = 5) {
  const tokenPath = path.join(__dirname, 'spotify', 'token.json');

  async function getAccessToken() {
    try {
      const response = await axios.post(endpoints.spotify.token, 
        'grant_type=client_credentials', 
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(spotifyConfig.clientId + ':' + spotifyConfig.clientSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error.message);
      throw error;
    }
  }

  async function refreshAccessToken() {
    const token = await getAccessToken();
    fs.writeFileSync(tokenPath, JSON.stringify({ token, timestamp: Date.now() }, null, 2));
    return token;
  }

  async function getValidToken() {
    if (!fs.existsSync(tokenPath)) {
      return await refreshAccessToken();
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const tokenAge = (Date.now() - tokenData.timestamp) / 1000 / 60; // age in minutes

    if (tokenAge > 50) {
      return await refreshAccessToken();
    }

    return tokenData.token;
  }

  try {
    const token = await getValidToken();
    const response = await axios.get(endpoints.spotify.search, {
      params: {
        q: keywords,
        type: 'track',
        limit: limit
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.data || !response.data.tracks || !response.data.tracks.items) {
      throw new Error('Invalid API response structure');
    }

    return response.data.tracks.items;
  } catch (error) {
    console.error('Error during Spotify search:', error.message);
    if (error.response && error.response.status === 401) {
      await refreshAccessToken();
      return spotifySearch(keywords, limit);
    }
    throw error;
  }
}

async function getSpotifyTrackDownloadLink(trackId) {
  try {
    const response = await axios.get(`https://api.spotifydown.com/download/${trackId}`, {
      timeout: 8000,
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
        'Origin': 'https://spotifydown.com',
        'Referer': 'https://spotifydown.com/',
        'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Chromium";v="124"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    });

    if (response.data && response.data.success && response.data.link) {
      return response.data;
    }
    throw new Error('Failed to fetch track download link');
  } catch (error) {
    console.error('Error fetching Spotify track download link:', error?.code || error?.message || error);
    // Fallback: dùng preview_url của Spotify nếu có
    try {
      const tokenPath = path.join(__dirname, 'spotify', 'token.json');
      async function getAccessTokenFallback() {
        const resp = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(spotifyConfig.clientId + ':' + spotifyConfig.clientSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return resp.data.access_token;
      }
      async function getValidTokenFallback() {
        try {
          if (!fs.existsSync(tokenPath)) {
            const tk = await getAccessTokenFallback();
            fs.writeFileSync(tokenPath, JSON.stringify({ token: tk, timestamp: Date.now() }, null, 2));
            return tk;
          }
          const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          const tokenAge = (Date.now() - tokenData.timestamp) / 1000 / 60;
          if (tokenAge > 50) {
            const tk = await getAccessTokenFallback();
            fs.writeFileSync(tokenPath, JSON.stringify({ token: tk, timestamp: Date.now() }, null, 2));
            return tk;
          }
          return tokenData.token;
        } catch {
          const tk = await getAccessTokenFallback();
          fs.writeFileSync(tokenPath, JSON.stringify({ token: tk, timestamp: Date.now() }, null, 2));
          return tk;
        }
      }

      const token = await getValidTokenFallback();
      const trackResp = await axios.get(`${endpoints.spotify.track}/${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000
      });
      const track = trackResp.data;
      if (track && track.preview_url) {
        return {
          success: true,
          link: track.preview_url,
          metadata: {
            title: track.name,
            artists: (track.artists || []).map(a => a.name).join(', '),
            album: track.album?.name || '',
            releaseDate: track.album?.release_date || ''
          },
          isPreview: true
        };
      }
      // Fallback cuối: tải từ YouTube theo title + artist
      try {
        const query = `${track.name} ${((track.artists || []).map(a => a.name).join(' '))}`.trim();
        const vid = await youtubeDownloadByQuery(query);
        if (vid && vid.filePath) {
          return {
            success: true,
            filePath: vid.filePath,
            metadata: {
              title: track.name,
              artists: (track.artists || []).map(a => a.name).join(', '),
              album: track.album?.name || '',
              releaseDate: track.album?.release_date || ''
            },
            isYouTube: true
          };
        }
      } catch (yerr) {
        console.error('YouTube fallback failed:', yerr?.message || yerr);
      }
      throw new Error('No preview available and external downloader failed');
    } catch (fbErr) {
      console.error('Fallback (preview_url) failed:', fbErr?.message || fbErr);
      throw error;
    }
  }
}

// YouTube fallback helpers
const CACHE_DIR_SPT = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_DIR_SPT);
const ytDlpPath = path.join(__dirname, '..', '..', 'node_modules', 'youtube-dl-exec', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const ytDlp = create(ytDlpPath, { shell: false, ffmpegLocation: ffmpegPath });

async function youtubeDownloadByQuery(query) {
  const res = await yts.GetListByKeyword(query, false, 6);
  const vids = (res.items || []).filter(v => v.type === 'video');
  if (!vids.length) throw new Error('No YouTube results');
  const videoId = vids[0].id;
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = path.join(CACHE_DIR_SPT, `${videoId}.m4a`);
  await ytDlp(url, {
    extractAudio: true,
    audioFormat: 'm4a',
    audioQuality: 0,
    output: outputPath,
    ffmpegLocation: ffmpegPath,
    forceIpv4: true
  });
  if (!fs.existsSync(outputPath)) throw new Error('Download failed');
  const stats = fs.statSync(outputPath);
  if (stats.size > 25 * 1024 * 1024) {
    fs.unlinkSync(outputPath);
    throw new Error('YouTube audio exceeds 25MB');
  }
  return { filePath: outputPath };
}