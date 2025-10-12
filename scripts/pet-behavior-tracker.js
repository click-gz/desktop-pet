// 用户行为追踪系统 - 记录用户与宠物的所有交互行为
class BehaviorTracker {
    constructor() {
        this.API_BASE = 'http://localhost:3000';
        this.sessionStart = Date.now();
        this.sessionId = this.generateSessionId();
        
        // 行为缓存队列（批量发送以提高性能）
        this.behaviorQueue = [];
        this.maxQueueSize = 5;
        this.flushInterval = 10000; // 10秒自动发送一次
        
        // 统计数据
        this.stats = {
            clickCount: 0,
            dragCount: 0,
            stateChangeCount: 0,
            chatCount: 0,
            totalInteractions: 0
        };
        
        // 会话数据
        this.currentChatSession = null;
        this.lastInteractionTime = Date.now();
        
        this.startAutoFlush();
        console.log('🎯 行为追踪系统已启动');
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // ==================== 核心追踪方法 ====================
    
    /**
     * 记录点击宠物行为
     */
    trackClick(metadata = {}) {
        this.stats.clickCount++;
        this.stats.totalInteractions++;
        
        this.recordBehavior('pet_click', {
            click_count: this.stats.clickCount,
            position: metadata.position || null,
            pet_state: metadata.petState || 'unknown',
            ...metadata
        });
        
        console.log(`🖱️ 点击追踪: 第${this.stats.clickCount}次点击`);
    }
    
    /**
     * 记录拖拽行为
     */
    trackDrag(startPos, endPos, duration) {
        this.stats.dragCount++;
        this.stats.totalInteractions++;
        
        const distance = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + 
            Math.pow(endPos.y - startPos.y, 2)
        );
        
        this.recordBehavior('pet_drag', {
            drag_count: this.stats.dragCount,
            start_position: startPos,
            end_position: endPos,
            distance: Math.round(distance),
            duration: duration,
            speed: Math.round(distance / duration * 1000) // px/s
        });
        
        console.log(`🎯 拖拽追踪: 距离${Math.round(distance)}px, 耗时${duration}ms`);
    }
    
    /**
     * 记录状态切换
     */
    trackStateChange(fromState, toState, trigger = 'manual') {
        this.stats.stateChangeCount++;
        this.stats.totalInteractions++;
        
        this.recordBehavior('state_change', {
            from_state: fromState,
            to_state: toState,
            trigger: trigger, // manual, auto, timeout
            state_change_count: this.stats.stateChangeCount
        });
        
        console.log(`🔄 状态切换追踪: ${fromState} → ${toState} (${trigger})`);
    }
    
    /**
     * 开始聊天会话追踪
     */
    startChatSession() {
        if (this.currentChatSession) {
            console.warn('⚠️ 已有活跃的聊天会话');
            return;
        }
        
        this.currentChatSession = {
            startTime: Date.now(),
            messageCount: 0,
            userMessages: 0,
            aiMessages: 0
        };
        
        console.log('💬 聊天会话开始追踪');
    }
    
    /**
     * 记录聊天消息
     */
    trackChatMessage(role) {
        if (!this.currentChatSession) {
            this.startChatSession();
        }
        
        this.currentChatSession.messageCount++;
        if (role === 'user') {
            this.currentChatSession.userMessages++;
        } else if (role === 'assistant') {
            this.currentChatSession.aiMessages++;
        }
    }
    
    /**
     * 结束聊天会话追踪
     */
    endChatSession() {
        if (!this.currentChatSession) {
            console.warn('⚠️ 没有活跃的聊天会话');
            return;
        }
        
        const duration = Date.now() - this.currentChatSession.startTime;
        this.stats.chatCount++;
        
        this.recordBehavior('chat_session', {
            duration: duration,
            message_count: this.currentChatSession.messageCount,
            user_messages: this.currentChatSession.userMessages,
            ai_messages: this.currentChatSession.aiMessages,
            avg_response_time: Math.round(duration / Math.max(this.currentChatSession.messageCount, 1)),
            chat_session_count: this.stats.chatCount
        });
        
        console.log(`💬 聊天会话结束: ${duration}ms, ${this.currentChatSession.messageCount}条消息`);
        this.currentChatSession = null;
    }
    
    /**
     * 记录右键菜单使用
     */
    trackContextMenu(action) {
        this.stats.totalInteractions++;
        
        this.recordBehavior('context_menu', {
            action: action,
            timestamp: Date.now()
        });
        
        console.log(`📋 菜单操作追踪: ${action}`);
    }
    
    /**
     * 记录双击行为
     */
    trackDoubleClick(metadata = {}) {
        this.stats.totalInteractions++;
        
        this.recordBehavior('double_click', {
            pet_state: metadata.petState || 'unknown',
            ...metadata
        });
        
        console.log(`🖱️ 双击追踪`);
    }
    
    /**
     * 记录悬停行为
     */
    trackHover(duration) {
        if (duration < 1000) return; // 悬停时间少于1秒不记录
        
        this.recordBehavior('hover', {
            duration: duration
        });
    }
    
    /**
     * 记录活跃时段
     */
    trackActiveSession() {
        const now = Date.now();
        const sessionDuration = now - this.sessionStart;
        const inactiveDuration = now - this.lastInteractionTime;
        
        this.recordBehavior('active_session', {
            session_duration: sessionDuration,
            inactive_duration: inactiveDuration,
            total_interactions: this.stats.totalInteractions,
            clicks: this.stats.clickCount,
            drags: this.stats.dragCount,
            chats: this.stats.chatCount,
            hour: new Date().getHours(),
            day_of_week: new Date().getDay()
        });
        
        console.log(`📊 活跃会话: 总时长${Math.round(sessionDuration/1000)}s, ${this.stats.totalInteractions}次交互`);
    }
    
    // ==================== 数据发送 ====================
    
    /**
     * 记录行为到队列
     */
    recordBehavior(type, metadata) {
        const behavior = {
            user_id: 'default', // 后续可从存储中获取真实用户ID
            behavior_type: type,
            metadata: {
                ...metadata,
                session_id: this.sessionId,
                timestamp: new Date().toISOString()
            }
        };
        
        this.behaviorQueue.push(behavior);
        this.lastInteractionTime = Date.now();
        
        // 队列满了就发送
        if (this.behaviorQueue.length >= this.maxQueueSize) {
            this.flushBehaviors();
        }
    }
    
    /**
     * 批量发送行为数据
     */
    async flushBehaviors() {
        if (this.behaviorQueue.length === 0) return;
        
        const behaviors = [...this.behaviorQueue];
        this.behaviorQueue = [];
        
        try {
            const response = await fetch(`${this.API_BASE}/api/behaviors/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    behaviors: behaviors
                })
            });
            
            if (response.ok) {
                console.log(`✅ 已发送${behaviors.length}条行为数据`);
            } else {
                console.warn(`⚠️ 行为数据发送失败: ${response.status}`);
                // 发送失败，放回队列
                this.behaviorQueue.unshift(...behaviors);
            }
        } catch (error) {
            console.error('❌ 行为数据发送错误:', error);
            // 发送失败，放回队列
            this.behaviorQueue.unshift(...behaviors);
        }
    }
    
    /**
     * 启动自动发送定时器
     */
    startAutoFlush() {
        setInterval(() => {
            if (this.behaviorQueue.length > 0) {
                this.flushBehaviors();
            }
        }, this.flushInterval);
        
        // 每5分钟记录一次活跃会话
        setInterval(() => {
            if (this.stats.totalInteractions > 0) {
                this.trackActiveSession();
            }
        }, 5 * 60 * 1000);
    }
    
    /**
     * 手动触发发送
     */
    async flush() {
        await this.flushBehaviors();
    }
    
    // ==================== 统计信息 ====================
    
    /**
     * 获取当前会话统计
     */
    getStats() {
        return {
            ...this.stats,
            sessionDuration: Date.now() - this.sessionStart,
            sessionId: this.sessionId
        };
    }
    
    /**
     * 重置统计数据
     */
    resetStats() {
        this.stats = {
            clickCount: 0,
            dragCount: 0,
            stateChangeCount: 0,
            chatCount: 0,
            totalInteractions: 0
        };
        this.sessionStart = Date.now();
        console.log('🔄 统计数据已重置');
    }
}

// 全局单例
window.behaviorTracker = new BehaviorTracker();

// 页面关闭前发送剩余数据
window.addEventListener('beforeunload', () => {
    if (window.behaviorTracker) {
        window.behaviorTracker.flush();
    }
});

console.log('✅ 行为追踪器已加载');

