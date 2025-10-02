// 聊天功能脚本
class PetChat {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        
        // 后端 API 配置
        this.apiBaseUrl = 'http://localhost:3000';
        this.conversationHistory = []; // 对话历史
        
        this.setupEventListeners();
        this.loadChatHistory();
        this.notifyPetChatting(); // 通知主窗口进入聊天状态
        this.checkBackendHealth(); // 检查后端连接
        
        // 预定义的离线回复（当后端不可用时使用）
        this.offlineResponses = {
            greetings: [
                "你好呀！很高兴见到你！😊",
                "嗨！今天过得怎么样？",
                "你好！有什么我可以帮助你的吗？",
                "Hi～欢迎回来！"
            ],
            mood: [
                "我现在感觉很好！谢谢关心～ 😊",
                "精力充沛！准备好陪你聊天了！",
                "心情不错哦！你呢？",
                "开心得很！和你聊天总是很愉快～"
            ],
            jokes: [
                "为什么程序员喜欢黑暗？因为光会吸引bug！😄",
                "问：什么动物最容易被贴在墙上？答：海豹（报）！🤣",
                "为什么企鹅的肚子是白色的？因为手太短，洗不到背！🐧",
                "桌面宠物的梦想是什么？成为屏幕保护程序！💭",
                "我告诉计算机一个笑话，但它没笑。可能是我的幽默感需要更新了！😅"
            ],
            help: [
                "我可以陪你聊天、讲笑话，还可以在桌面上陪伴你工作哦！",
                "你可以右键点击我切换状态，或者在这里和我聊天！",
                "试试双击我，看看会发生什么？😉",
                "我会根据能量状态改变行为，记得让我休息哦！"
            ],
            energy: [
                "我的能量系统会随时间消耗，需要睡觉来恢复哦！",
                "点击我可以恢复一些能量，但不要太频繁啦～",
                "当我能量耗尽时会自动进入睡眠状态呢！",
                "在聊天模式下能量消耗很慢，可以慢慢聊～"
            ],
            thanks: [
                "不客气！随时为你服务～ 😊",
                "能帮到你我很开心！",
                "这是我应该做的！有需要随时找我哦～",
                "别客气！我们是好朋友嘛！"
            ],
            bye: [
                "再见！记得常来找我玩哦！👋",
                "拜拜～祝你有美好的一天！",
                "下次见！我会一直在桌面等你的！",
                "慢走不送～随时欢迎回来！"
            ],
            praise: [
                "谢谢夸奖！你也很棒哦！😊",
                "哈哈，你真会说话～我会更加努力的！",
                "开心！能得到你的认可真好！",
                "嘿嘿，过奖了～你也超棒的！"
            ],
            unknown: [
                "嗯嗯，我明白了～ 🤔",
                "有意思！继续说说看？",
                "这个问题有点难倒我了，但我会学习的！",
                "让我想想...你能换个方式说吗？",
                "我还在学习中，可能理解得不够好～"
            ],
            time: [
                "现在是 " + new Date().toLocaleTimeString('zh-CN') + " 哦！⏰",
                "时间过得真快呀！现在已经 " + new Date().toLocaleTimeString('zh-CN') + " 了！",
                "当前时间：" + new Date().toLocaleTimeString('zh-CN')
            ],
            date: [
                "今天是 " + new Date().toLocaleDateString('zh-CN') + "！📅",
                "现在是 " + new Date().toLocaleDateString('zh-CN') + "，" + ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][new Date().getDay()]
            ]
        };
        
        // 关键词匹配规则（离线模式使用）
        this.offlineKeywords = {
            greetings: ['你好', 'hi', 'hello', '嗨', '您好', '早上好', '晚上好', '下午好'],
            mood: ['感觉', '心情', '怎么样', '状态', '还好吗'],
            jokes: ['笑话', '搞笑', '好笑', '幽默', '讲个', '说个'],
            help: ['帮助', '怎么用', '功能', '干什么', '做什么', '用途'],
            energy: ['能量', '精力', '累', '疲劳', '睡觉', '休息'],
            thanks: ['谢谢', '感谢', '多谢', 'thanks', 'thank'],
            bye: ['再见', '拜拜', '走了', 'bye', '下次见'],
            praise: ['可爱', '棒', '厉害', '聪明', '喜欢', '爱你', '真好', '不错'],
            time: ['时间', '几点', '现在'],
            date: ['日期', '今天', '星期', '几号']
        };
        
        this.backendAvailable = false; // 后端是否可用
        this.heartbeatInterval = null; // 心跳定时器
        this.connectionStatusElement = null;
        this.statusDotElement = null;
        this.statusTextElement = null;
    }
    
    // 检查后端服务健康状态
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`${this.apiBaseUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.backendAvailable = true;
                this.updateConnectionStatus('online', 'AI 在线');
                console.log('✅ 后端服务连接成功:', data);
                return true;
            } else {
                this.backendAvailable = false;
                this.updateConnectionStatus('offline', '离线模式');
                console.warn('⚠️ 后端服务响应异常，将使用离线模式');
                return false;
            }
        } catch (error) {
            this.backendAvailable = false;
            if (error.name === 'AbortError') {
                this.updateConnectionStatus('error', '连接超时');
                console.warn('⚠️ 后端连接超时');
            } else {
                this.updateConnectionStatus('offline', '离线模式');
                console.warn('⚠️ 无法连接到后端服务:', error.message);
            }
            return false;
        }
    }
    
    // 更新连接状态显示
    updateConnectionStatus(status, text) {
        if (!this.statusDotElement) {
            this.statusDotElement = document.querySelector('.status-dot');
            this.statusTextElement = document.querySelector('.status-text');
        }
        
        if (this.statusDotElement && this.statusTextElement) {
            // 移除所有状态类
            this.statusDotElement.classList.remove('online', 'offline', 'error');
            // 添加新状态
            this.statusDotElement.classList.add(status);
            this.statusTextElement.textContent = text;
        }
    }
    
    // 启动心跳检测
    startHeartbeat() {
        // 清除已有的心跳
        this.stopHeartbeat();
        
        // 立即检查一次
        this.checkBackendHealth();
        
        // 每5秒检查一次
        this.heartbeatInterval = setInterval(async () => {
            const wasAvailable = this.backendAvailable;
            const isAvailable = await this.checkBackendHealth();
            
            // 如果状态发生变化，显示通知
            if (wasAvailable !== isAvailable) {
                if (isAvailable) {
                    this.showNotification('✅ 后端服务已恢复连接！');
                } else {
                    this.showNotification('⚠️ 后端服务断开，切换到离线模式');
                }
            }
        }, 5000); // 5秒心跳
        
        console.log('💓 心跳检测已启动（每5秒）');
    }
    
    // 停止心跳检测
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💔 心跳检测已停止');
        }
    }
    
    // 显示通知消息
    showNotification(message) {
        // 创建简单的通知提示
        const notification = document.createElement('div');
        notification.className = 'connection-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    setupEventListeners() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // 输入框回车事件
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // 输入框焦点
        this.inputField.focus();
        
        // 启动心跳检测
        this.startHeartbeat();
        
        // 窗口关闭时停止心跳
        window.addEventListener('beforeunload', () => {
            this.stopHeartbeat();
        });
    }
    
    // 通知主窗口进入聊天状态
    notifyPetChatting() {
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-pet-state', 'chatting');
            } catch (e) {
                console.log('无法通知主窗口:', e);
            }
        }
    }
    
    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;
        
        // 添加用户消息
        this.addMessage(message, 'user');
        
        // 添加到对话历史
        this.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // 清空输入框
        this.inputField.value = '';
        
        // 显示输入指示器
        this.showTypingIndicator();
        
        try {
            let reply;
            
            // 如果后端可用，调用 AI API
            if (this.backendAvailable) {
                reply = await this.getAIReply(message);
            } else {
                // 后端不可用，使用离线回复
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                reply = this.generateOfflineReply(message);
            }
            
            this.hideTypingIndicator();
            this.addMessage(reply, 'bot');
            
            // 添加AI回复到历史
            this.conversationHistory.push({
                role: 'assistant',
                content: reply
            });
            
            // 限制历史长度（保留最近20条）
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
            this.saveChatHistory();
            
        } catch (error) {
            console.error('发送消息失败:', error);
            this.hideTypingIndicator();
            
            // 显示错误消息
            const errorReply = '抱歉，我现在有点累了，稍后再聊吧～ 😅';
            this.addMessage(errorReply, 'bot');
            this.saveChatHistory();
        }
    }
    
    // 调用后端 AI API 获取回复
    async getAIReply(message) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: this.conversationHistory.slice(0, -1) // 不包含刚添加的用户消息
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.reply) {
                return data.reply;
            } else {
                throw new Error('无效的响应格式');
            }
            
        } catch (error) {
            console.error('AI API 调用失败:', error);
            // 回退到离线模式
            this.backendAvailable = false;
            throw error;
        }
    }
    
    // 离线模式：使用预定义回复
    generateOfflineReply(message) {
        const lowerMessage = message.toLowerCase();
        
        // 遍历关键词匹配
        for (const [category, keywords] of Object.entries(this.offlineKeywords)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    const responses = this.offlineResponses[category];
                    return responses[Math.floor(Math.random() * responses.length)];
                }
            }
        }
        
        // 没有匹配到关键词，返回默认回复
        const unknownResponses = this.offlineResponses.unknown;
        return unknownResponses[Math.floor(Math.random() * unknownResponses.length)];
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'bot' ? '🐱' : '👤';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        
        this.messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'message bot-message';
        indicatorDiv.id = 'typing-indicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🐱';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        contentDiv.appendChild(typingDiv);
        indicatorDiv.appendChild(avatar);
        indicatorDiv.appendChild(contentDiv);
        
        this.messagesContainer.appendChild(indicatorDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    saveChatHistory() {
        const messages = Array.from(this.messagesContainer.children)
            .filter(msg => !msg.id || msg.id !== 'typing-indicator')
            .map(msg => ({
                text: msg.querySelector('.message-text')?.textContent || '',
                sender: msg.classList.contains('user-message') ? 'user' : 'bot',
                time: msg.querySelector('.message-time')?.textContent || ''
            }));
        
        localStorage.setItem('petChatHistory', JSON.stringify(messages.slice(-50))); // 只保存最近50条
    }
    
    loadChatHistory() {
        const history = localStorage.getItem('petChatHistory');
        if (!history) return;
        
        try {
            const messages = JSON.parse(history);
            // 清空现有消息（除了欢迎消息）
            this.messagesContainer.innerHTML = '';
            
            // 重新添加历史消息
            messages.forEach(msg => {
                this.addMessageWithTime(msg.text, msg.sender, msg.time);
            });
            
            // 恢复对话历史到内存
            this.conversationHistory = messages
                .filter(msg => msg.sender === 'user' || msg.sender === 'bot')
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                }))
                .slice(-20); // 只保留最近20条
                
        } catch (e) {
            console.error('加载聊天历史失败:', e);
        }
    }
    
    addMessageWithTime(text, sender, time) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'bot' ? '🐱' : '👤';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = time;
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        
        this.messagesContainer.appendChild(messageDiv);
    }
}

// 全局函数
function sendMessage() {
    if (window.petChat) {
        window.petChat.sendMessage();
    }
}

function sendQuickMessage(message) {
    const inputField = document.getElementById('chat-input');
    if (inputField) {
        inputField.value = message;
        sendMessage();
    }
}

function closeChat() {
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        // 通知主窗口退出聊天状态
        ipcRenderer.send('set-pet-state', 'idle');
        ipcRenderer.send('close-chat-window');
    } else {
        window.close();
    }
}

// 初始化聊天
document.addEventListener('DOMContentLoaded', () => {
    window.petChat = new PetChat();
    
    // 焦点到输入框
    setTimeout(() => {
        document.getElementById('chat-input')?.focus();
    }, 100);
});

