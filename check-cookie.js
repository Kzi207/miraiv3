const fs = require('fs-extra');
const path = require('path');

// Hàm kiểm tra cookie
function checkCookie() {
    const cookiePath = path.join(__dirname, 'cookie.txt');
    
    try {
        // Kiểm tra file cookie có tồn tại không
        if (!fs.existsSync(cookiePath)) {
            console.log('❌ File cookie.txt không tồn tại!');
            createCookieTemplate();
            return false;
        }
        
        // Đọc nội dung cookie
        const cookieContent = fs.readFileSync(cookiePath, 'utf8');
        
        if (!cookieContent || cookieContent.trim() === '') {
            console.log('❌ File cookie.txt rỗng!');
            createCookieTemplate();
            return false;
        }
        
        // Kiểm tra các trường cookie quan trọng
        const requiredFields = ['c_user', 'xs', 'fr'];
        const missingFields = requiredFields.filter(field => !cookieContent.includes(field));
        
        if (missingFields.length > 0) {
            console.log(`❌ Cookie thiếu các trường quan trọng: ${missingFields.join(', ')}`);
            console.log('Vui lòng cập nhật cookie từ Facebook!');
            return false;
        }
        
        console.log('✅ Cookie hợp lệ!');
        console.log(`📊 Số lượng cookie: ${cookieContent.split(';').length}`);
        
        // Kiểm tra thời gian hết hạn (nếu có)
        const cookieLines = cookieContent.split(';');
        const expiryInfo = cookieLines.find(line => line.includes('expires') || line.includes('max-age'));
        if (expiryInfo) {
            console.log(`⏰ Thông tin hết hạn: ${expiryInfo.trim()}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra cookie:', error.message);
        return false;
    }
}

// Hàm tạo template cookie
function createCookieTemplate() {
    const template = `# Hướng dẫn lấy cookie Facebook:
# 1. Đăng nhập Facebook trên trình duyệt
# 2. Mở Developer Tools (F12)
# 3. Vào tab Application/Storage > Cookies > https://www.facebook.com
# 4. Copy tất cả cookies và paste vào đây
# 5. Xóa dòng này và các dòng comment khác

# Các trường bắt buộc:
# - c_user: ID người dùng
# - xs: Session token
# - fr: Friend request token
# - datr: Browser fingerprint

# Ví dụ:
# c_user=123456789;xs=abc123;fr=xyz789;datr=def456

`;
    
    try {
        fs.writeFileSync('cookie-template.txt', template);
        console.log('📝 Đã tạo file cookie-template.txt với hướng dẫn');
        console.log('📋 Vui lòng làm theo hướng dẫn để tạo cookie hợp lệ');
    } catch (error) {
        console.error('❌ Lỗi khi tạo template:', error.message);
    }
}

// Hàm chính
function main() {
    console.log('🔍 Kiểm tra cookie Facebook...\n');
    
    const isValid = checkCookie();
    
    if (isValid) {
        console.log('\n🎉 Bot có thể khởi động với cookie hiện tại!');
        console.log('💡 Chạy: npm start');
    } else {
        console.log('\n⚠️  Vui lòng cập nhật cookie trước khi khởi động bot!');
        console.log('📖 Xem file cookie-template.txt để biết cách lấy cookie');
    }
}

// Chạy script
if (require.main === module) {
    main();
}

module.exports = { checkCookie, createCookieTemplate };
