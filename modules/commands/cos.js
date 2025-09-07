const axios = require('axios');
const fs = require('fs');
const path = require('path');
module.exports.config = {
    name: "cos",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "DC-Nam",
    description: "gái ",
    commandCategory: "Tiện ích",
    usages: "",
    cooldowns: 0,
    usePrefix: false
  
};
global.a = [];
async function streamUrl(url) {
    return axios({ url, responseType: 'stream' }).then(_ => _.data);
}

async function upload(o, url) {
    const form = { upload_1024: await streamUrl(url) };
    return o.api.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', form)
        .then(res => Object.entries(JSON.parse(res.body.replace('for (;;);', '')).payload?.metadata?.[0] || {})[0]);
}

module.exports.onLoad = async function (o) {
        let status = false;
        let urls = require('./../../includes/datajson/cos.json');
    if (!global.jjjja) global.jjjja = setInterval(async _ => {
            if (status == true || global.a.length > 50) return;
            status = true;
            try {
                const res = await Promise.all([...Array(5)].map(() => upload(o, urls[Math.floor(Math.random()*urls.length)])));
                global.a.push(...res);
            } catch {}
            status = false;
    },1000 * 5);
};

const CACHE_DIR = path.join(__dirname, 'cache');
if (!global.gaiCache) global.gaiCache = [];
if (!global.gaiDownloading) global.gaiDownloading = 0;

function ensureDir(dir) {
        try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
}

function getExtFromUrl(url) {
        try {
                const clean = url.split('?')[0];
                const ext = clean.substring(clean.lastIndexOf('.') + 1).toLowerCase();
                if (['mp4', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return ext;
        } catch {}
        return 'mp4';
}

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const AXIOS_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

async function getContentLength(url) {
        try {
                const res = await axios.head(url, { timeout: 15000, headers: AXIOS_HEADERS, maxRedirects: 5 });
                const cl = res.headers['content-length'] || res.headers['Content-Length'];
                return cl ? parseInt(cl) : undefined;
        } catch (e) { return undefined; }
}

async function downloadToFile(url) {
        return new Promise(async (resolve, reject) => {
                try {
                        const ext = getExtFromUrl(url);
                        const filePath = path.join(CACHE_DIR, `gai_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
                        // Skip quá lớn
                        const contentLength = await getContentLength(url);
                        if (contentLength && contentLength > MAX_SIZE_BYTES) {
                                return reject(new Error(`File too large: ${Math.round(contentLength/1024/1024)}MB`));
                        }
                        const response = await axios.get(url, { responseType: 'stream', timeout: 60000, headers: AXIOS_HEADERS, maxRedirects: 5, maxBodyLength: Infinity, maxContentLength: Infinity });
                        const writer = fs.createWriteStream(filePath);
                        response.data.on('error', err => {
                                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
                                reject(err);
                        });
                        writer.on('finish', () => resolve(filePath));
                        writer.on('error', err => {
                                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
                                reject(err);
                        });
                        response.data.pipe(writer);
                } catch (e) { reject(e); }
        });
}

async function prefetchOne(validUrls) {
        if (global.gaiDownloading >= 3) return;
        const url = validUrls[Math.floor(Math.random() * validUrls.length)];
        global.gaiDownloading++;
        try {
                const file = await downloadToFile(url);
                global.gaiCache.push(file);
        } catch {}
        finally { global.gaiDownloading--; }
}

module.exports.onLoad = async function (o) {
        ensureDir(CACHE_DIR);
        const rawUrls = require('../../includes/datajson/vdgai.json');
        const validUrls = rawUrls.filter(u => {
                if (typeof u !== 'string' || !u.startsWith('http') || u === 'undefined') return false;
                const ext = getExtFromUrl(u);
                return ['jpg','jpeg','png','gif','webp'].includes(ext);
        });
        if (!validUrls.length) return;
        if (!global.gaiPrefill) {
                global.gaiPrefill = setInterval(() => {
                        try {
                                if (global.gaiCache.length >= 5) return;
                                prefetchOne(validUrls);
                        } catch {}
                }, 2000);
        }
};

module.exports.run = async function (o) {
        const name = await o.Users.getNameUser(o.event.senderID);
        const sendBodyOnly = () => o.api.sendMessage(`Mê gái vừa thôi ${name}.`, o.event.threadID, undefined, o.event.messageID);
        try {
                ensureDir(CACHE_DIR);
                // Nếu cache có sẵn ảnh, ưu tiên gửi ngay cho nhanh
                if (global.gaiCache.length > 0) {
                        const filePath = global.gaiCache.shift();
                        return o.api.sendMessage({
                                body: `Mê gái vừa thôi ${name}.`,
                                attachment: fs.createReadStream(filePath)
                        }, o.event.threadID, () => {
                                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
                        }, o.event.messageID);
                }
                // Nếu chưa có sẵn cache, chọn URL hợp lệ (ảnh hoặc video)
                let urls = require('../../includes/datajson/vdgai.json').filter(u => typeof u === 'string' && u.startsWith('http') && u !== 'undefined');
                // Ưu tiên url mp4 có dung lượng nhỏ (không biết trước) → thử tối đa 3 url
                const tryOrder = [];
                const videos = urls.filter(u => getExtFromUrl(u) === 'mp4');
                const images = urls.filter(u => getExtFromUrl(u) !== 'mp4');
                if (videos.length) tryOrder.push(...videos.sort(() => 0.5 - Math.random()).slice(0, 3));
                if (images.length) tryOrder.push(...images.sort(() => 0.5 - Math.random()).slice(0, 3));
                urls = tryOrder.length ? tryOrder : urls;
                if (!urls.length) return sendBodyOnly();
                let lastErr;
                for (const chosen of urls) {
                        try {
                                const ext = getExtFromUrl(chosen);
                                const filePath = await downloadToFile(chosen);
                                const res = await o.api.sendMessage({
                                        body: `Mê gái vừa thôi ${name}.`,
                                        attachment: fs.createReadStream(filePath)
                                }, o.event.threadID, () => {
                                        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
                                }, o.event.messageID);
                                if (res) return res;
                        } catch (err) {
                                lastErr = err;
                                continue;
                        }
                }
                return sendBodyOnly();
        } catch (e) {
                return sendBodyOnly();
        }
}
