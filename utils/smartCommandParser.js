const stringSimilarity = require('string-similarity');
const fs = require('fs');
const path = require('path');

class SmartCommandParser {
    constructor() {
        this.commandAliases = new Map();
        this.contextKeywords = new Map();
        this.commandCategories = new Map();
        this.config = this.loadConfig();
        this.initializeCommandData();
    }

    // Tải cấu hình từ file
    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'data', 'smartCommandConfig.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                return JSON.parse(configData);
            }
        } catch (error) {
            console.log('⚠️ Không thể tải cấu hình Smart Command, sử dụng cấu hình mặc định');
        }
        
        // Cấu hình mặc định
        return {
            enabled: true,
            fuzzyThreshold: 0.4,
            contextThreshold: 0.7,
            aliases: {},
            contextKeywords: {},
            intentPatterns: {}
        };
    }

    // Lưu cấu hình vào file
    saveConfig() {
        try {
            const configPath = path.join(__dirname, 'data', 'smartCommandConfig.json');
            const configDir = path.dirname(configPath);
            
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
            return true;
        } catch (error) {
            console.log('❌ Không thể lưu cấu hình Smart Command:', error);
            return false;
        }
    }

    // Khởi tạo dữ liệu lệnh và alias
    initializeCommandData() {
        // Tải alias từ cấu hình
        if (this.config.aliases) {
            Object.entries(this.config.aliases).forEach(([commandName, aliases]) => {
                this.commandAliases.set(commandName, aliases);
            });
        }

        // Tải từ khóa ngữ cảnh từ cấu hình
        if (this.config.contextKeywords) {
            Object.entries(this.config.contextKeywords).forEach(([category, keywords]) => {
                this.contextKeywords.set(category, keywords);
            });
        }

        // Dữ liệu mặc định nếu không có cấu hình
        const defaultAliases = {
            'help': ['giup', 'trogiup', 'huongdan', 'h'],
            'menu': ['danhsach', 'list', 'ds', 'm'],
            'info': ['thongtin', 'information', 'i'],
            'kick': ['duoi', 'remove', 'k'],
            'ban': ['cam', 'block', 'b'],
            'unban': ['bocam', 'unblock', 'ub'],
            'su': ['chat', 'talk', 'conversation', 's'],
            'music': ['nhac', 'song', 'play', 'm'],
            'weather': ['thoitiet', 'w'],
            'time': ['thoigian', 'clock', 't'],
            'ping': ['latency', 'p'],
            'avatar': ['avt', 'a'],
            'rank': ['xephang', 'level', 'r'],
            'money': ['tien', 'coin', 'cash'],
            'game': ['trochoi', 'g'],
            'admin': ['quanly', 'manage', 'ad'],
            'setting': ['caidat', 'config']
        };

        const defaultContext = {
            'music': ['nhạc', 'bài hát', 'ca khúc', 'music', 'song', 'play', 'phát'],
            'weather': ['thời tiết', 'nắng', 'mưa', 'weather', 'temperature', 'nhiệt độ'],
            'game': ['chơi', 'game', 'trò chơi', 'play', 'gaming'],
            'admin': ['quản lý', 'admin', 'kick', 'ban', 'quản trị'],
            'info': ['thông tin', 'info', 'information', 'chi tiết'],
            'help': ['giúp', 'help', 'hướng dẫn', 'làm sao', 'cách dùng']
        };

        if (this.commandAliases.size === 0) {
            Object.entries(defaultAliases).forEach(([cmd, aliases]) => {
                this.commandAliases.set(cmd, aliases);
            });
        }

        if (this.contextKeywords.size === 0) {
            Object.entries(defaultContext).forEach(([category, keywords]) => {
                this.contextKeywords.set(category, keywords);
            });
        }
    }

    // Phân tích và tìm lệnh phù hợp nhất
    parseCommand(input, availableCommands) {
        const cleanInput = input.toLowerCase().trim();
        
        // 1. Tìm kiếm chính xác
        let exactMatch = this.findExactMatch(cleanInput, availableCommands);
        if (exactMatch) return exactMatch;

        // 2. Tìm kiếm qua alias
        let aliasMatch = this.findAliasMatch(cleanInput, availableCommands);
        if (aliasMatch) return aliasMatch;

        // 3. Tìm kiếm qua ngữ cảnh
        let contextMatch = this.findContextMatch(cleanInput, availableCommands);
        if (contextMatch) return contextMatch;

        // 4. Fuzzy matching với độ chính xác cao
        let fuzzyMatch = this.findFuzzyMatch(cleanInput, availableCommands, this.config.fuzzyThreshold + 0.2);
        if (fuzzyMatch) return fuzzyMatch;

        // 5. Fuzzy matching với độ chính xác thấp hơn
        fuzzyMatch = this.findFuzzyMatch(cleanInput, availableCommands, this.config.fuzzyThreshold);
        if (fuzzyMatch) return fuzzyMatch;

        return null;
    }

    // Tìm kiếm chính xác
    findExactMatch(input, commands) {
        for (const [commandName, command] of commands) {
            if (commandName === input) {
                return {
                    command: command,
                    confidence: 1.0,
                    matchType: 'exact',
                    originalInput: input
                };
            }
        }
        return null;
    }

    // Tìm kiếm qua alias
    findAliasMatch(input, commands) {
        for (const [commandName, aliases] of this.commandAliases) {
            if (aliases.includes(input)) {
                const command = commands.get(commandName);
                if (command) {
                    return {
                        command: command,
                        confidence: 0.9,
                        matchType: 'alias',
                        originalInput: input,
                        matchedAlias: input
                    };
                }
            }
        }
        return null;
    }

    // Tìm kiếm qua ngữ cảnh
    findContextMatch(input, commands) {
        for (const [category, keywords] of this.contextKeywords) {
            for (const keyword of keywords) {
                if (input.includes(keyword)) {
                    const command = commands.get(category);
                    if (command) {
                        return {
                            command: command,
                            confidence: 0.8,
                            matchType: 'context',
                            originalInput: input,
                            matchedKeyword: keyword
                        };
                    }
                }
            }
        }
        return null;
    }

    // Fuzzy matching
    findFuzzyMatch(input, commands, threshold) {
        const commandNames = Array.from(commands.keys());
        const matches = stringSimilarity.findBestMatch(input, commandNames);
        
        if (matches.bestMatch.rating >= threshold) {
            const command = commands.get(matches.bestMatch.target);
            return {
                command: command,
                confidence: matches.bestMatch.rating,
                matchType: 'fuzzy',
                originalInput: input,
                suggestions: matches.ratings
                    .filter(r => r.rating >= threshold - 0.1)
                    .slice(0, 3)
                    .map(r => r.target)
            };
        }
        return null;
    }

    // Gợi ý lệnh dựa trên ngữ cảnh
    suggestCommands(input, availableCommands, limit = 5) {
        const cleanInput = input.toLowerCase().trim();
        const suggestions = [];

        // Tìm kiếm các lệnh có từ khóa liên quan
        for (const [commandName, command] of availableCommands) {
            const description = (command.config?.description || '').toLowerCase();
            const category = (command.config?.commandCategory || '').toLowerCase();
            
            if (description.includes(cleanInput) || category.includes(cleanInput)) {
                suggestions.push({
                    command: command,
                    reason: 'description_match',
                    confidence: 0.7
                });
            }
        }

        // Sắp xếp theo độ tin cậy
        suggestions.sort((a, b) => b.confidence - a.confidence);
        
        return suggestions.slice(0, limit);
    }

    // Phân tích ý định người dùng
    analyzeIntent(input) {
        const cleanInput = input.toLowerCase().trim();
        
        // Sử dụng cấu hình intent patterns nếu có
        if (this.config.intentPatterns) {
            for (const [intent, patterns] of Object.entries(this.config.intentPatterns)) {
                for (const pattern of patterns) {
                    if (cleanInput.includes(pattern)) {
                        return { intent: intent, confidence: this.config.contextThreshold };
                    }
                }
            }
        }
        
        // Fallback về logic cũ
        if (cleanInput.includes('làm sao') || cleanInput.includes('cách') || cleanInput.includes('how')) {
            return { intent: 'help', confidence: 0.9 };
        }
        
        if (cleanInput.includes('thông tin') || cleanInput.includes('info')) {
            return { intent: 'info', confidence: 0.8 };
        }
        
        if (cleanInput.includes('chơi') || cleanInput.includes('game')) {
            return { intent: 'game', confidence: 0.8 };
        }
        
        if (cleanInput.includes('nhạc') || cleanInput.includes('music')) {
            return { intent: 'music', confidence: 0.8 };
        }
        
        if (cleanInput.includes('quản lý') || cleanInput.includes('admin')) {
            return { intent: 'admin', confidence: 0.8 };
        }
        
        return { intent: 'unknown', confidence: 0.0 };
    }

    // Tạo phản hồi thông minh khi không tìm thấy lệnh
    generateSmartResponse(input, availableCommands) {
        const intent = this.analyzeIntent(input);
        const suggestions = this.suggestCommands(input, availableCommands, 3);
        
        let response = `❓ Không tìm thấy lệnh "${input}"\n\n`;
        
        if (intent.confidence > 0.7) {
            response += `💡 Có vẻ bạn đang muốn: ${intent.intent}\n`;
        }
        
        if (suggestions.length > 0) {
            response += `🔍 Các lệnh có thể bạn muốn:\n`;
            suggestions.forEach((suggestion, index) => {
                response += `${index + 1}. ${suggestion.command.config.name} - ${suggestion.command.config.description}\n`;
            });
        }
        
        response += `\n📝 Sử dụng "${global.config.PREFIX}help" để xem danh sách lệnh đầy đủ`;
        
        return response;
    }
}

module.exports = SmartCommandParser;
