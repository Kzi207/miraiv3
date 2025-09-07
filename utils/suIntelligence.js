const fs = require('fs');
const path = require('path');

class SuIntelligence {
    constructor() {
        this.conversationHistory = new Map();
        this.userProfiles = new Map();
        this.contextData = new Map();
        this.memoryFile = path.join(__dirname, 'data', 'suMemory.json');
        
        this.topicKeywords = {
            'music': ['nhạc', 'bài hát', 'ca khúc', 'music', 'song', 'play', 'phát', 'nghe'],
            'game': ['chơi', 'game', 'trò chơi', 'gaming', 'play', 'thắng', 'thua'],
            'food': ['ăn', 'uống', 'đói', 'thức ăn', 'món', 'ngon', 'restaurant', 'cafe'],
            'weather': ['thời tiết', 'nắng', 'mưa', 'lạnh', 'nóng', 'weather'],
            'study': ['học', 'bài tập', 'thi', 'điểm', 'trường', 'study', 'exam'],
            'work': ['làm việc', 'công việc', 'sếp', 'đồng nghiệp', 'work', 'job'],
            'love': ['yêu', 'thích', 'crush', 'người yêu', 'tình yêu', 'love', 'dating'],
            'travel': ['đi chơi', 'du lịch', 'travel', 'trip', 'nghỉ', 'vacation'],
            'technology': ['máy tính', 'điện thoại', 'app', 'tech', 'internet', 'wifi'],
            'health': ['sức khỏe', 'bệnh', 'đau', 'khám', 'health', 'sick', 'medicine']
        };
        
        this.intentPatterns = {
            'greeting': ['chào', 'hello', 'hi', 'xin chào', 'hey'],
            'question': ['gì', 'sao', 'tại sao', 'như thế nào', '?', 'what', 'how', 'why'],
            'request': ['giúp', 'làm', 'tạo', 'gửi', 'tìm', 'help', 'can you'],
            'compliment': ['đẹp', 'xinh', 'tuyệt', 'giỏi', 'amazing', 'beautiful'],
            'complaint': ['tệ', 'xấu', 'ghét', 'không thích', 'bad', 'hate'],
            'goodbye': ['tạm biệt', 'bye', 'goodbye', 'chào tạm biệt']
        };
        
        this.responses = {
            greeting: ['Chào cưng! Su đây nè~ 😊', 'Xin chào! Su rất vui được gặp cưng! 💖', 'Chào cưng! Hôm nay thế nào? ✨'],
            question: ['Cưng hỏi gì vậy? Su sẵn sàng trả lời nè! 🤔💭'],
            request: ['Su sẽ cố gắng giúp cưng nhé! Cưng cần gì cứ nói Su nghe! 💪✨'],
            compliment: ['Cưng khen Su à? Su ngại quá! 😳💕', 'Cưng tốt bụng quá! Su cảm ơn cưng nè! 🥺💖'],
            complaint: ['Cưng có vẻ không vui nhỉ? Su ở đây với cưng nè! 🥺💕'],
            goodbye: ['Tạm biệt cưng! Su sẽ nhớ cưng lắm! 😢💕', 'Bye cưng! Hẹn gặp lại nha! 👋✨'],
            general: ['Su hiểu rồi! Cưng nói gì Su cũng nghe nè! 😊', 'Ừm, Su nghe cưng nói đây! 💭']
        };
        
        this.loadMemory();
    }

    loadMemory() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
                this.conversationHistory = new Map(data.conversationHistory || []);
                this.userProfiles = new Map(data.userProfiles || []);
                this.contextData = new Map(data.contextData || []);
            }
        } catch (error) {
            console.log('⚠️ Su Intelligence: Không thể tải dữ liệu:', error.message);
        }
    }

    saveMemory() {
        try {
            const data = {
                conversationHistory: Array.from(this.conversationHistory.entries()),
                userProfiles: Array.from(this.userProfiles.entries()),
                contextData: Array.from(this.contextData.entries()),
                lastUpdated: new Date().toISOString()
            };
            
            const dir = path.dirname(this.memoryFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('❌ Su Intelligence: Không thể lưu dữ liệu:', error.message);
        }
    }

    analyzeContext(threadId, userId, message) {
        const contextKey = `${threadId}_${userId}`;
        const now = Date.now();
        
        let context = this.contextData.get(contextKey) || {
            threadId, userId, lastMessage: '', messageCount: 0, topics: [],
            mood: 'neutral', lastActivity: now, conversationFlow: []
        };

        context.lastMessage = message;
        context.messageCount++;
        context.lastActivity = now;
        context.topics = [...new Set([...context.topics, ...this.extractTopics(message)])].slice(-10);
        context.mood = this.analyzeMood(message, context.mood);
        
        context.conversationFlow.push({ message, timestamp: now, topics: this.extractTopics(message), mood: context.mood });
        if (context.conversationFlow.length > 20) context.conversationFlow = context.conversationFlow.slice(-20);

        this.contextData.set(contextKey, context);
        return context;
    }

    extractTopics(message) {
        const lowerMessage = message.toLowerCase();
        return Object.keys(this.topicKeywords).filter(topic => 
            this.topicKeywords[topic].some(keyword => lowerMessage.includes(keyword))
        );
    }

    analyzeMood(message, currentMood) {
        const lowerMessage = message.toLowerCase();
        const positive = ['vui', 'hạnh phúc', 'tuyệt', 'đỉnh', 'xịn', 'phê', 'chill', 'xõa', 'cưng', 'yêu'];
        const negative = ['buồn', 'tệ', 'xấu', 'ghét', 'chán', 'mệt', 'stress', 'lo', 'sợ', 'tức'];
        
        const posCount = positive.filter(k => lowerMessage.includes(k)).length;
        const negCount = negative.filter(k => lowerMessage.includes(k)).length;
        
        if (posCount > negCount) return 'positive';
        if (negCount > posCount) return 'negative';
        return currentMood;
    }

    analyzeIntent(message, context) {
        const lowerMessage = message.toLowerCase();
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            if (patterns.some(pattern => lowerMessage.includes(pattern))) {
                return { intent, confidence: 0.8, context };
            }
        }
        return { intent: 'general', confidence: 0.5, context };
    }

    updateUserProfile(userId, threadId, message, context) {
        let profile = this.userProfiles.get(userId) || {
            userId, name: '', preferences: [], conversationCount: 0,
            lastSeen: Date.now(), favoriteTopics: [], moodHistory: []
        };

        profile.conversationCount++;
        profile.lastSeen = Date.now();
        profile.favoriteTopics = [...new Set([...profile.favoriteTopics, ...this.extractTopics(message)])];
        profile.moodHistory.push({ mood: context.mood, timestamp: Date.now() });
        if (profile.moodHistory.length > 50) profile.moodHistory = profile.moodHistory.slice(-50);

        this.userProfiles.set(userId, profile);
        return profile;
    }

    generateContextualResponse(message, context, userProfile) {
        const responses = [];
        
        if (context.mood === 'positive') responses.push('😊 Cưng vui quá nhỉ! Su cũng vui theo luôn~');
        if (context.mood === 'negative') responses.push('🥺 Cưng có vẻ buồn đó, Su ở đây với cưng nè~');
        
        if (context.topics.includes('music')) responses.push('🎵 Cưng thích nhạc à? Su cũng mê nhạc lắm đó!');
        if (context.topics.includes('game')) responses.push('🎮 Chơi game vui không cưng? Su cũng thích game nè!');
        if (context.topics.includes('food')) responses.push('🍕 Đói bụng rồi hả? Su cũng thèm ăn quá!');
        
        if (context.messageCount > 10) responses.push('💬 Cưng nói chuyện nhiều với Su quá, vui ghê!');
        
        return responses;
    }

    getContextualSuggestions(context, userProfile) {
        const suggestions = [];
        
        if (context.topics.includes('music')) suggestions.push('🎵 Muốn nghe nhạc gì không cưng?');
        if (context.topics.includes('game')) suggestions.push('🎮 Chơi game gì vui nhất nhỉ?');
        if (context.topics.includes('food')) suggestions.push('🍕 Ăn gì ngon nhất hả cưng?');
        if (context.mood === 'negative') suggestions.push('💖 Su có thể giúp gì cho cưng không?');
        
        if (userProfile?.favoriteTopics.length > 0) {
            const randomTopic = userProfile.favoriteTopics[Math.floor(Math.random() * userProfile.favoriteTopics.length)];
            suggestions.push(`💭 Cưng có muốn nói về ${randomTopic} không?`);
        }
        
        return suggestions;
    }

    generatePersonalizedResponse(message, context, userProfile, intent) {
        const responses = this.responses[intent.intent] || this.responses.general;
        let response = responses[Math.floor(Math.random() * responses.length)];
        
        if (userProfile?.conversationCount > 5) {
            response += ' Cưng nói chuyện với Su nhiều quá, vui ghê! 💕';
        }
        
        return response;
    }

    saveConversation(threadId, userId, message, response) {
        const conversationKey = `${threadId}_${userId}`;
        let conversation = this.conversationHistory.get(conversationKey) || [];
        
        conversation.push({ userMessage: message, botResponse: response, timestamp: Date.now() });
        if (conversation.length > 50) conversation = conversation.slice(-50);
        
        this.conversationHistory.set(conversationKey, conversation);
    }

    getConversationHistory(threadId, userId, limit = 10) {
        const conversationKey = `${threadId}_${userId}`;
        const conversation = this.conversationHistory.get(conversationKey) || [];
        return conversation.slice(-limit);
    }

    cleanupOldData() {
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        for (const [key, context] of this.contextData.entries()) {
            if (now - context.lastActivity > oneWeek) this.contextData.delete(key);
        }

        for (const [key, conversation] of this.conversationHistory.entries()) {
            const filtered = conversation.filter(msg => now - msg.timestamp < oneWeek);
            if (filtered.length === 0) this.conversationHistory.delete(key);
            else this.conversationHistory.set(key, filtered);
        }
    }
}

module.exports = SuIntelligence;