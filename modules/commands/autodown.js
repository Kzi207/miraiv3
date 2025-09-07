const axios = require('axios');
const BASE_URL = 'https://niio-team.onrender.com/downr?url=';

module.exports.config = {
  name: "autodown",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "DongDev", //Thay credit làm 🐶 
  description: "Autodown Facebook, Tiktok, YouTube, Instagram, Bilibili, Douyin, Capcut, Threads",
  commandCategory: "Tiện ích",
  usages: "[]",
  cooldowns: 5,
  prefix: true
};
module.exports.handleEvent = async function ({ api, event, args }) {
  if (event.senderID == api.getCurrentUserID()) return;
  const bodyText = event.body || '';
  const urlsInBody = bodyText.match(/https?:\/\/\S+/g) || [];
  const inputs = Array.isArray(args) && args.length ? args : urlsInBody;
  if (!inputs.length) return;
  const normalizeUrl = (raw) => (raw || '').replace(/[)\]\s.,!?]+$/g, '');
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  };
  const buildHeaders = (u) => {
    try {
      const h = new URL(u).hostname;
      if (/(tiktok|musical\.ly)/i.test(h)) {
        return {
          ...defaultHeaders,
          Referer: 'https://www.tiktok.com/',
          Origin: 'https://www.tiktok.com'
        };
      }
    } catch {}
    return defaultHeaders;
  };
  let stream = (url, ext = 'jpg') => require('axios').get(normalizeUrl(url), { responseType: 'stream', headers: buildHeaders(url) }).then(res => (res.data.path = `tmp.${ext}`, res.data)).catch(e => null);
  const unwrapFacebookRedirect = (u) => {
    try {
      const parsed = new URL(u);
      if (parsed.hostname.includes('l.facebook.com') && parsed.pathname === '/l.php') {
        const orig = parsed.searchParams.get('u');
        if (orig) return decodeURIComponent(orig);
      }
    } catch {}
    return u;
  };
  const resolveShortTikTok = async (u) => {
    if (!/(https?:\/\/)(vt|vm)\.tiktok\.com\//.test(u)) return u;
    try {
      const resp = await axios.get(u, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400, headers: defaultHeaders });
      return resp.headers?.location || u;
    } catch (e) {
      return e?.response?.headers?.location || u;
    }
  };
  const send = (msg) => api.sendMessage(msg, event.threadID, event.messageID);
  const head = app => `[ AUTODOWN - ${app} ]\n────────────────`;
  for (const raw of inputs) {
    const pre = normalizeUrl(raw);
    const unwrapped = unwrapFacebookRedirect(pre);
    const shortResolved = await resolveShortTikTok(unwrapped);
    const url = normalizeUrl(shortResolved);
    if ((/^https:\/\//).test(url) === false) continue;
    if (/(^https:\/\/)(\w+\.|m\.)?(facebook|fb)\.(com|watch)\//.test(url)) {
      const res = (await axios.get(`${BASE_URL}${encodeURIComponent(url)}`)).data;
      if (res.attachments && res.attachments.length > 0) {
        let attachment = [];
        if (res.queryStorieID) {
            const match = res.attachments.find(item => item.id == res.queryStorieID);
            if (match && match.type === 'Video') {
                const videoUrl = match.url.hd || match.url.sd || match.url?.url;
                attachment.push(await stream(videoUrl, 'mp4'));
            } else if (match && match.type === 'Photo') {
                const photoUrl = typeof match.url === 'string' ? match.url : match.url?.url;
                attachment.push(await stream(photoUrl, 'jpg'));
            }
        } else {
            for (const attachmentItem of res.attachments) {
                if (attachmentItem.type === 'Video') {
                    const videoUrl = attachmentItem.url?.hd || attachmentItem.url?.sd || attachmentItem.url?.url || attachmentItem.url;
                    attachment.push(await stream(videoUrl, 'mp4'));
                } else if (attachmentItem.type === 'Photo') {
                    const photoUrl = typeof attachmentItem.url === 'string' ? attachmentItem.url : attachmentItem.url?.url;
                    attachment.push(await stream(photoUrl, 'jpg'));
                }
            }
        }
        attachment = attachment.filter(Boolean);
        if (attachment.length === 0) return;
        send({ body: `${head('FACEBOOK')}\n⩺ Tiêu đề: ${res.message || "Không có tiêu đề"}\n${res.like ? `⩺ Lượt thích: ${res.like}\n` : ''}${res.comment ? `⩺ Bình luận: ${res.comment}\n` : ''}${res.share ? `⩺ Chia sẻ: ${res.share}\n` : ''}⩺ Tác giả: ${res.author || "unknown"}`.trim(), attachment });
      }
    } else if (/^(https:\/\/)(www\.|vt\.|vm\.|m\.|web\.|v\.|mobile\.)?(tiktok\.com|t\.co|twitter\.com|x\.com|youtube\.com|youtu\.be|instagram\.com|bilibili\.com|douyin\.com|capcut\.com|threads\.net)\//.test(url)) {
      const platform = /tiktok\.com/.test(url) ? 'TIKTOK' : /(twitter\.com|x\.com)/.test(url) ? 'TWITTER' : /(youtube\.com|youtu\.be)/.test(url) ? 'YOUTUBE' : /instagram\.com/.test(url) ? 'INSTAGRAM' : /bilibili\.com/.test(url) ? 'BILIBILI' : /douyin\.com/.test(url) ? 'DOUYIN' : /threads\.net/.test(url) ? 'THREADS' : /capcut\.com/.test(url) ? 'CAPCUT' : 'UNKNOWN';
      const res = (await axios.get(`${BASE_URL}${encodeURIComponent(url)}`)).data;
      let attachments = [];
      if (Array.isArray(res.attachments) && res.attachments.length > 0) {
          for (const at of res.attachments) {
             if (at.type === 'Video') {
                  const src = typeof at.url === 'string' ? at.url : (at.url?.hd || at.url?.sd || at.url?.url);
                  attachments.push(await stream(src, 'mp4'));
             } else if (at.type === 'Photo') {
                  const src = typeof at.url === 'string' ? at.url : (at.url?.url);
                  attachments.push(await stream(src, 'jpg'));
             } else if (at.type === 'Audio') {
                  const src = typeof at.url === 'string' ? at.url : (at.url?.url);
                  attachments.push(await stream(src, 'mp3'));
                }
           }
      }
      if ((!attachments.length) && Array.isArray(res.medias) && res.medias.length > 0) {
          for (const m of res.medias) {
              const t = String(m.type || '').toLowerCase();
              if (t.includes('video')) attachments.push(await stream(m.url, 'mp4'));
              else if (t.includes('audio')) attachments.push(await stream(m.url, 'mp3'));
              else if (t.includes('photo') || t.includes('image')) attachments.push(await stream(m.url, 'jpg'));
          }
      }
      attachments = attachments.filter(Boolean);
      if (attachments.length === 0) return send({ body: `${head(platform)}\n⩺ Không tìm thấy media phù hợp từ liên kết.` });
      send({ body: `${head(platform)}\n⩺ Tiêu đề: ${res.title || res.message || "Không có tiêu đề"}`, attachment: attachments });
    } else if (/^https?:\/\//.test(url)) {
      try {
        const res = (await axios.get(`${BASE_URL}${encodeURIComponent(url)}`)).data;
        if (res.attachments && res.attachments.length > 0) {
          const attachments = [];
          for (const at of res.attachments) {
            if (at.type === 'Video') {
              const src = typeof at.url === 'string' ? at.url : (at.url?.hd || at.url?.sd || at.url?.url);
              attachments.push(await stream(src, 'mp4'));
            } else if (at.type === 'Photo') {
              const src = typeof at.url === 'string' ? at.url : (at.url?.url);
              attachments.push(await stream(src, 'jpg'));
            } else if (at.type === 'Audio') {
              const src = typeof at.url === 'string' ? at.url : (at.url?.url);
              attachments.push(await stream(src, 'mp3'));
            }
          }
          const filtered = attachments.filter(Boolean);
          if (filtered.length) send({ body: `${head('UNKNOWN')}\n⩺ Tiêu đề: ${res.title || res.message || "Không có tiêu đề"}`, attachment: filtered });
          else if (Array.isArray(res.medias) && res.medias.length > 0) {
            const attachments2 = [];
            for (const m of res.medias) {
              const t = String(m.type || '').toLowerCase();
              if (t.includes('video')) attachments2.push(await stream(m.url, 'mp4'));
              else if (t.includes('audio')) attachments2.push(await stream(m.url, 'mp3'));
              else if (t.includes('photo') || t.includes('image')) attachments2.push(await stream(m.url, 'jpg'));
            }
            const filtered2 = attachments2.filter(Boolean);
            if (filtered2.length) send({ body: `${head('UNKNOWN')}\n⩺ Tiêu đề: ${res.title || res.message || "Không có tiêu đề"}`, attachment: filtered2 });
          }
        }
      } catch {}
    }
  }
};

module.exports.run = async function () {};