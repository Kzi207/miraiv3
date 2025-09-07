module.exports.config = {
    name: "settheme",
    version: "1.2.0",
    hasPermssion: 1,
    credits: "̣lvbang & Claude",
    description: "Đổi chủ đề box chat theo tên",
    commandCategory: "QTV",
    usages: "[tên chủ đề]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const themeMap = {
        'mặc định': '196241301102133',
        'tình yêu': '741311439775765',
        'thả thính' : '611878928211423',
        'cà phê':'1299135724598332',
        'bạn cùng đi lễ hộ':'1079303610711048',
        'hồng may mắn':'1019162843417894',
        'sổ tay':'1485402365695859',
        'quả bơ':'1508524016651271',
        'lofi':'1060619084701625',
        'star line':'762684349791497',
        'The summer':'1754425538544705',
        'xúc cảm mùa hè': '680612308133315',
        'valentine': '625675453790797',
        'trà sửa trân châu': '195296273246380',
        'mắt trố': '1135895321099254',
        'hồng may mắn': '1019162843417894',
        'hope': '1667467154651262',
        'giấy kẻ ô vuông': '1602001344083693',
        'kẹo mút':'292955489929680',
        'thứ tư':'744840604971028'
    };
    const themeName = args.join(' ').toLowerCase();

    if (!themeName) {
        return api.sendMessage("Vui lòng nhập tên chủ đề. Các chủ đề có sẵn: " + Object.keys(themeMap).join(', '), event.threadID);
    }

    if (themeMap.hasOwnProperty(themeName)) {
        const themeID = themeMap[themeName];
        try {
            return api.changeThreadColor(themeID, event.threadID, (err) => {
                if (err) {
                    const detail = (err && err[0]) ? (err[0].description || err[0].message || '') : (err.message || '');
                    const humanMsg = detail ? `Không thể đổi chủ đề: ${detail}` : 'Không thể đổi chủ đề do Facebook từ chối yêu cầu.';
                    return api.sendMessage(humanMsg, event.threadID);
                }
                api.sendMessage(`Đã thay đổi chủ đề thành "${themeName}"`, event.threadID);
            });
        } catch (e) {
            const msg = e?.message ? `Không thể đổi chủ đề: ${e.message}` : 'Không thể đổi chủ đề do lỗi không xác định.';
            return api.sendMessage(msg, event.threadID);
        }
    } else {
        return api.sendMessage(`Chủ đề "${themeName}" không có sẵn. Các chủ đề có sẵn: ` + Object.keys(themeMap).join(', '), event.threadID);
    }
};