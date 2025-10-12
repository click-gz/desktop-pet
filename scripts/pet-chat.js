// 聊天功能脚本
class PetChat {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        
        // 后端 API 配置
        this.apiBaseUrl = 'http://localhost:3000';
        this.conversationHistory = []; // 当前会话的对话历史
        
        // 会话管理
        this.currentSessionId = this.createNewSession();
        this.currentSessionMessages = []; // 当前会话的消息列表
        
        // 🎯 启动聊天会话追踪
        if (window.behaviorTracker) {
            window.behaviorTracker.startChatSession();
            console.log('💬 聊天会话追踪已启动');
        }
        
        this.setupEventListeners();
        // 不再自动加载历史记录，每次打开都是新会话
        // this.loadChatHistory(); // 注释掉
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
        // 生成或获取用户唯一标识
        this.userId = this.getOrCreateUserId();
    }
    getOrCreateUserId() {
        // 从本地存储获取
        let userId = localStorage.getItem('petUserId');
        
        if (!userId) {
            // 生成新的用户ID（可以使用多种方式）
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('petUserId', userId);
        }
        
        return userId;
    }
    
    // 创建新会话
    createNewSession() {
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const session = {
            id: sessionId,
            startTime: new Date().toISOString(),
            messages: []
        };
        
        console.log('📝 创建新会话:', sessionId);
        return sessionId;
    }
    
    // 保存当前会话到历史
    saveCurrentSessionToHistory() {
        if (this.currentSessionMessages.length === 0) {
            return; // 没有消息，不保存
        }
        
        const session = {
            id: this.currentSessionId,
            startTime: new Date().toISOString(),
            messages: this.currentSessionMessages,
            messageCount: this.currentSessionMessages.length
        };
        
        // 获取现有历史
        let history = this.getChatHistory();
        
        // 添加当前会话
        history.unshift(session); // 新会话放在最前面
        
        // 只保留最近30个会话
        history = history.slice(0, 30);
        
        // 保存到 localStorage
        localStorage.setItem('petChatSessionHistory', JSON.stringify(history));
        
        console.log('💾 会话已保存到历史:', session.id, '消息数:', session.messageCount);
    }
    
    // 获取聊天历史（所有会话）
    getChatHistory() {
        try {
            const history = localStorage.getItem('petChatSessionHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('读取历史记录失败:', e);
            return [];
        }
    }
    
    // 加载指定会话的消息到界面
    loadSessionMessages(sessionId) {
        const history = this.getChatHistory();
        const session = history.find(s => s.id === sessionId);
        
        if (!session) {
            console.warn('会话不存在:', sessionId);
            return;
        }
        
        // 清空当前界面
        this.messagesContainer.innerHTML = '';
        
        // 重新添加会话消息
        session.messages.forEach(msg => {
            this.addMessageWithTime(msg.text, msg.sender, msg.time);
        });
        
        console.log('📂 已加载会话:', sessionId);
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
            // 🎯 结束聊天会话追踪
            if (window.behaviorTracker) {
                window.behaviorTracker.endChatSession();
                console.log('💬 聊天会话追踪已结束');
            }
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
        
        // 🎯 追踪用户消息
        if (window.behaviorTracker) {
            window.behaviorTracker.trackChatMessage('user');
        }
        
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
            
            // 🎯 追踪AI回复
            if (window.behaviorTracker) {
                window.behaviorTracker.trackChatMessage('assistant');
            }
            
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
                    user_id: this.userId,
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
        const time = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
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
        
        // 保存到当前会话
        this.currentSessionMessages.push({
            text: text,
            sender: sender,
            time: time,
            timestamp: new Date().toISOString()
        });
        
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
        // 保存当前会话到历史
        this.saveCurrentSessionToHistory();
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
    
    // 渲染历史记录列表
    renderHistoryList() {
        const history = this.getChatHistory();
        const historyContent = document.getElementById('history-content');
        
        if (history.length === 0) {
            historyContent.innerHTML = '<div class="history-empty">暂无历史记录</div>';
            return;
        }
        
        let html = '<div class="history-list">';
        
        history.forEach(session => {
            const date = new Date(session.startTime);
            const dateStr = this.formatDate(date);
            const timeStr = date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // 获取会话预览（第一条用户消息）
            const firstUserMsg = session.messages.find(m => m.sender === 'user');
            const preview = firstUserMsg ? firstUserMsg.text : '无消息';
            const previewShort = preview.length > 30 ? preview.substring(0, 30) + '...' : preview;
            
            html += `
                <div class="history-item" onclick="viewHistorySession('${session.id}')">
                    <div class="history-item-header">
                        <span class="history-date">${dateStr} ${timeStr}</span>
                        <button class="history-delete-btn" onclick="deleteHistorySession('${session.id}', event)" title="删除">
                            🗑️
                        </button>
                    </div>
                    <div class="history-preview">${previewShort}</div>
                    <div class="history-meta">
                        <span class="history-message-count">💬 ${session.messageCount} 条消息</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        historyContent.innerHTML = html;
    }
    
    // 格式化日期
    formatDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (targetDate.getTime() === today.getTime()) {
            return '今天';
        } else if (targetDate.getTime() === yesterday.getTime()) {
            return '昨天';
        } else if (now - date < 7 * 24 * 60 * 60 * 1000) {
            const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            return days[date.getDay()];
        } else {
            return date.toLocaleDateString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit' 
            });
        }
    }
    
    // 查看历史会话详情
    viewHistorySessionDetail(sessionId) {
        const history = this.getChatHistory();
        const session = history.find(s => s.id === sessionId);
        
        if (!session) {
            console.warn('会话不存在:', sessionId);
            return;
        }
        
        // 创建详情视图
        const detailView = document.createElement('div');
        detailView.id = 'session-detail-view';
        detailView.className = 'session-detail-view';
        
        const date = new Date(session.startTime);
        const dateStr = date.toLocaleDateString('zh-CN', { 
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let messagesHtml = '';
        session.messages.forEach(msg => {
            const senderClass = msg.sender === 'user' ? 'user-message' : 'bot-message';
            const avatar = msg.sender === 'bot' ? '🐱' : '👤';
            messagesHtml += `
                <div class="message ${senderClass}">
                    <div class="message-avatar">${avatar}</div>
                    <div class="message-content">
                        <div class="message-text">${msg.text}</div>
                        <div class="message-time">${msg.time}</div>
                    </div>
                </div>
            `;
        });
        
        detailView.innerHTML = `
            <div class="session-detail-header">
                <div>
                    <h3>会话详情</h3>
                    <p class="session-detail-date">${dateStr} · ${session.messageCount} 条消息</p>
                </div>
                <button class="close-detail-btn" onclick="closeSessionDetail()">✕</button>
            </div>
            <div class="session-detail-messages">
                ${messagesHtml}
            </div>
        `;
        
        document.body.appendChild(detailView);
    }
    
    // 删除会话
    deleteSession(sessionId) {
        let history = this.getChatHistory();
        history = history.filter(s => s.id !== sessionId);
        
        localStorage.setItem('petChatSessionHistory', JSON.stringify(history));
        
        console.log('🗑️ 会话已删除:', sessionId);
        
        // 刷新历史列表
        this.renderHistoryList();
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
    // 在关闭前保存当前会话
    if (window.petChat) {
        window.petChat.saveChatHistory();
    }
    
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        // 通知主窗口退出聊天状态
        ipcRenderer.send('set-pet-state', 'idle');
        ipcRenderer.send('close-chat-window');
    } else {
        window.close();
    }
}

// 切换历史记录侧边栏
function toggleHistory() {
    const sidebar = document.getElementById('history-sidebar');
    const overlay = document.getElementById('history-overlay');
    
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        // 加载历史记录
        if (window.petChat) {
            window.petChat.renderHistoryList();
        }
    }
}

// 查看某个历史会话
function viewHistorySession(sessionId) {
    if (window.petChat) {
        window.petChat.viewHistorySessionDetail(sessionId);
    }
}

// 删除历史会话
function deleteHistorySession(sessionId, event) {
    event.stopPropagation(); // 阻止事件冒泡
    
    if (confirm('确定要删除这个会话记录吗？')) {
        if (window.petChat) {
            window.petChat.deleteSession(sessionId);
        }
    }
}

// 关闭会话详情
function closeSessionDetail() {
    const detailView = document.getElementById('session-detail-view');
    if (detailView) {
        detailView.remove();
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

