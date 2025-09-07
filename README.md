# 🤖 Mirai Bot V3 - AI Chatbot Thông Minh

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/your-repo/mirai-bot-v3)
[![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

Mirai Bot V3 là một chatbot Facebook Messenger thông minh với khả năng AI tiên tiến, hệ thống phân biệt lệnh thông minh và nhiều tính năng giải trí đa dạng.

## ✨ Tính Năng Nổi Bật

### 🧠 Su AI - Trợ Lý Ảo Thông Minh
- **Trí tuệ nhân tạo**: Sử dụng Gemini AI để trò chuyện tự nhiên
- **Hệ thống ghi nhớ**: Nhớ ngữ cảnh, sở thích và lịch sử người dùng
- **Phân tích tâm trạng**: Nhận biết và phản hồi phù hợp với tâm trạng
- **Phản hồi cá nhân hóa**: Tạo phản hồi dựa trên hồ sơ người dùng

### 🎯 Smart Command System
- **Fuzzy Matching**: Tìm kiếm lệnh gần giống với độ chính xác cao
- **Alias System**: Hỗ trợ nhiều tên gọi khác nhau cho cùng một lệnh
- **Context Awareness**: Hiểu ngữ cảnh và ý định người dùng
- **Smart Suggestions**: Gợi ý lệnh phù hợp khi không tìm thấy

### 🎮 Tính Năng Giải Trí
- **Game Ma Sói**: Game nhập vai với nhiều vai trò đa dạng
- **Game Tài Xỉu**: Cờ bạc ảo với hệ thống tiền tệ
- **Game Điện Tử**: Trò chơi đố vui thông minh
- **Game 2048**: Game puzzle kinh điển
- **Kéo Búa Bao**: Game đơn giản vui nhộn

### 🎵 Tính Năng Media
- **Phát nhạc**: Tải và phát nhạc từ YouTube
- **Video Cosplay**: Xem video cosplay và gái xinh
- **Tạo ảnh**: Tạo ảnh với AI
- **Tarot**: Xem bói bài tarot

### 🛠️ Tính Năng Quản Lý
- **Quản lý nhóm**: Kick, ban, unban thành viên
- **Chống spam**: Hệ thống chống spam thông minh
- **Lịch hẹn**: Tạo và quản lý lịch hẹn
- **Thống kê**: Thống kê chi tiết về bot và người dùng

## 🚀 Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js 16.0 trở lên
- NPM hoặc Yarn
- Facebook App ID và App Secret
- Gemini API Key (cho Su AI)

### Bước 1: Clone Repository
```bash
git clone https://github.com/kzi207/mirai-bot-v3.git
cd mirai-bot-v3
```

### Bước 2: Cài Đặt Dependencies
```bash
npm install
```

### Bước 3: Cấu Hình
Tạo file `config.json`:
```json
{
  "PREFIX": "!",
  "BOTNAME": "Mirai Bot V3",
  "ADMINBOT": ["your-facebook-id"],
  "NDH": ["your-facebook-id"],
  "geminiApiKey": "your-gemini-api-key",
  "geminiModel": "gemini-2.5-flash",
  "FACEBOOK_ADMIN": "https://facebook.com/your-profile"
}
```

### Bước 4: Chạy Bot
```bash
npm start
```

## 📖 Hướng Dẫn Sử Dụng

### Lệnh Cơ Bản
```bash
!help          # Xem danh sách lệnh
!menu          # Menu tương tác
!info          # Thông tin bot
!ping          # Kiểm tra ping
```

### Lệnh Su AI
```bash
su [nội dung]  # Trò chuyện với Su AI
suadmin        # Quản lý hệ thống Su AI
```

### Lệnh Game
```bash
!masoi         # Chơi game ma sói
!taixiu        # Chơi tài xỉu
!dientu        # Chơi điện tử
!keobuabao     # Chơi kéo búa bao
```

### Lệnh Media
```bash
!music [tên bài]    # Phát nhạc
!cos               # Xem video cosplay
!tarot             # Xem bói tarot
```

### Lệnh Quản Lý
```bash
!kick [@user]      # Kick thành viên
!ban [@user]       # Ban thành viên
!unban [@user]     # Unban thành viên
!antispam on/off   # Bật/tắt chống spam
```

## 🧠 Su Intelligence System

### Tính Năng Thông Minh
- **Phân tích ngữ cảnh**: Hiểu chủ đề và tâm trạng cuộc trò chuyện
- **Ghi nhớ người dùng**: Lưu trữ sở thích và lịch sử tương tác
- **Phản hồi cá nhân hóa**: Tạo phản hồi phù hợp với từng người dùng
- **Học tập liên tục**: Cải thiện theo thời gian

### Quản Lý Hệ Thống
```bash
!suadmin status    # Xem trạng thái hệ thống
!suadmin stats     # Thống kê chi tiết
!suadmin cleanup   # Dọn dẹp dữ liệu cũ
!suadmin export    # Xuất dữ liệu
!suadmin user [id] # Xem thông tin người dùng
```

## 🎯 Smart Command System

### Tính Năng
- **Fuzzy Matching**: Tìm kiếm lệnh gần giống
- **Alias System**: Hỗ trợ nhiều tên gọi
- **Context Awareness**: Hiểu ngữ cảnh
- **Smart Suggestions**: Gợi ý thông minh

### Quản Lý
```bash
!smartcmd status           # Xem trạng thái
!smartcmd on/off          # Bật/tắt hệ thống
!smartcmd test [lệnh]     # Test phân tích lệnh
!smartcmd addalias [cmd] [alias]  # Thêm alias
!smartcmd list            # Xem danh sách alias
```

## 📁 Cấu Trúc Project

```
Mirai-Bot-V3/
├── modules/commands/          # Các lệnh bot
│   ├── su.js                 # Lệnh Su AI chính
│   ├── suadmin.js            # Quản lý Su AI
│   ├── smartcmd.js           # Quản lý Smart Command
│   ├── masoi.js              # Game ma sói
│   ├── taixiu.js             # Game tài xỉu
│   └── ...
├── utils/                    # Tiện ích
│   ├── suIntelligence.js     # Hệ thống thông minh Su
│   ├── smartCommandParser.js # Parser lệnh thông minh
│   └── data/                 # Dữ liệu
├── includes/                 # Core system
│   ├── handle/               # Xử lý sự kiện
│   └── database/             # Database
├── languages/                # Ngôn ngữ
├── config.json              # Cấu hình chính
└── package.json             # Dependencies
```

## 🔧 Cấu Hình Nâng Cao

### Cấu Hình Su AI
```json
{
  "geminiApiKey": "your-api-key",
  "geminiModel": "gemini-2.5-flash",
  "smartCommandSystem": true,
  "suIntelligence": {
    "enabled": true,
    "memoryLimit": 50,
    "cleanupInterval": 604800000
  }
}
```

### Cấu Hình Smart Command
```json
{
  "smartCommandSystem": {
    "enabled": true,
    "fuzzyThreshold": 0.4,
    "contextThreshold": 0.7,
    "aliases": {
      "help": ["giup", "trogiup", "huongdan"],
      "music": ["nhac", "song", "play"]
    }
  }
}
```

## 🎮 Game Features

### Game Ma Sói
- **Vai trò đa dạng**: Sói, Dân làng, Tiên tri, Bác sĩ, v.v.
- **Hệ thống kỹ năng**: Mỗi vai trò có kỹ năng đặc biệt
- **Giao diện đẹp**: Card game với hình ảnh chất lượng cao
- **Lưu trữ**: Lưu trữ lịch sử game và thống kê

### Game Tài Xỉu
- **Hệ thống tiền tệ**: Quản lý tiền ảo
- **Jackpot**: Hệ thống jackpot hấp dẫn
- **Lịch sử**: Xem lịch sử các phiên
- **Thống kê**: Thống kê chi tiết

## 📊 Thống Kê & Analytics

### Thống Kê Bot
- Số lượng tin nhắn xử lý
- Số lượng người dùng hoạt động
- Tỷ lệ sử dụng các tính năng
- Hiệu suất hệ thống

### Thống Kê Game
- Số lượng game đã chơi
- Tỷ lệ thắng/thua
- Thống kê theo người dùng
- Leaderboard

## 🛡️ Bảo Mật

### Tính Năng Bảo Mật
- **Chống spam**: Hệ thống chống spam thông minh
- **Kiểm soát quyền**: Phân quyền rõ ràng
- **Bảo vệ dữ liệu**: Mã hóa dữ liệu nhạy cảm
- **Rate limiting**: Giới hạn tần suất sử dụng

### Quyền Hạn
- **0**: Thành viên thường
- **1**: Quản trị viên nhóm
- **2**: Admin bot
- **3**: Người hỗ trợ

## 🐛 Xử Lý Lỗi

### Logging System
- Ghi log chi tiết các hoạt động
- Phân loại log theo mức độ
- Tự động dọn dẹp log cũ
- Export log để debug

### Error Handling
- Xử lý lỗi graceful
- Fallback mechanisms
- Auto-recovery
- User-friendly error messages

## 📈 Performance

### Tối Ưu Hóa
- **Code optimization**: Giảm 33% dung lượng code
- **Memory management**: Quản lý bộ nhớ hiệu quả
- **Caching system**: Hệ thống cache thông minh
- **Database optimization**: Tối ưu hóa database

### Metrics
- Response time < 2s
- Memory usage < 500MB
- CPU usage < 30%
- Uptime > 99%

## 🤝 Đóng Góp

### Cách Đóng Góp
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

### Guidelines
- Tuân thủ coding standards
- Viết test cases
- Cập nhật documentation
- Không break existing features

## 📄 License

Dự án này được phân phối dưới giấy phép MIT. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👥 Tác Giả

- **Khánh Duy** - Tác giả chính
- **Vtuan** - Developer & Optimizer

## 🙏 Lời Cảm Ơn

- Cảm ơn tất cả contributors
- Cảm ơn cộng đồng Facebook Bot
- Cảm ơn Google Gemini AI
- Cảm ơn tất cả người dùng

## 📞 Liên Hệ

- **Facebook**: [Your Facebook Profile](https://facebook.com/your-profile)
- **GitHub**: [Your GitHub Profile](https://github.com/your-profile)
- **Email**: your-email@example.com

## 🔄 Changelog

### v3.0.0 (Latest)
- ✨ Thêm Su Intelligence System
- ✨ Thêm Smart Command System
- ✨ Tối ưu hóa code (giảm 33% dung lượng)
- 🐛 Sửa lỗi và cải thiện hiệu suất
- 📚 Cập nhật documentation

### v2.0.0
- ✨ Thêm game ma sói
- ✨ Thêm hệ thống tài xỉu
- ✨ Cải thiện giao diện

### v1.0.0
- 🎉 Phiên bản đầu tiên
- ✨ Các tính năng cơ bản

---

**⭐ Nếu bạn thích dự án này, hãy cho chúng tôi một star!**
