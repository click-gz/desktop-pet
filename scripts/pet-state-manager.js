// 宠物状态管理系统 - 更规范的状态管理模式
class PetStateManager {
    constructor() {
        // 初始状态
        this.state = {
            // 基础状态
            currentState: 'idle', // idle, excited, sleeping, chatting
            mood: 80,
            energy: 100,
            position: { x: 100, y: 100 },
            
            // 交互状态
            isMoving: false,
            isDragging: false,
            lastInteractionTime: Date.now(),
            
            // 能量系统状态
            isEnergySystemActive: true,
            lastEnergyUpdateTime: Date.now(),
            lastInteractionForEnergy: Date.now(),
            
            // 移动相关状态
            targetPosition: null,
            mousePosition: { x: 0, y: 0 },
            
            // 动画状态
            animationState: {
                isAnimating: false,
                currentAnimation: null,
                animationQueue: []
            }
        };
        
        // 状态变更监听器
        this.listeners = new Map();
        
        // 状态历史（用于调试和回滚）
        this.stateHistory = [];
        this.maxHistorySize = 50;
        
        // 能量系统配置
        this.energyConfig = {
            decayRates: {
                idle: 100 / (60 * 60 * 1000),      // 待机：1小时耗尽
                excited: 100 / (40 * 60 * 1000),   // 兴奋：40分钟耗尽
                sleeping: 0,                        // 睡眠：不消耗
                chatting: 100 / (120 * 60 * 1000)  // 聊天：2小时耗尽（消耗很小）
            },
            recoveryAmount: 1, // 每次点击恢复1%能量
            minInteractionInterval: 2000, // 防止过度点击的最小间隔
            moveEnergyCost: 2, // 基础移动能量消耗
            maxMoveEnergyCost: 5 // 最大移动能量消耗
        };
        
        // 行为配置
        this.behaviorConfig = {
            idle: { duration: 3000, next: ['excited'], name: '💭 待机' },
            excited: { duration: 2500, next: ['idle', 'sleeping'], name: '🎉 兴奋' },
            sleeping: { duration: 6000, next: ['idle'], name: '😴 睡觉' },
            chatting: { duration: 0, next: ['idle'], name: '💬 聊天中' }
        };
        
        // 消息配置
        this.messageConfig = {
            idle: ['在想什么呢...', '今天天气不错~', '主人在忙什么？', '无聊ing...', '需要做点什么吗？'],
            excited: ['好开心！', '耶！', '太棒了！', '٩(◕‿◕)۶', '好精神！', '感觉充满了力量！'],
            sleeping: ['ZZZ...', '好困...', '做了个好梦', '呼呼...', '在恢复能量...'],
            chatting: ['有什么想聊的吗？', '我在听~', '继续说吧！', '我在这里呢~', '和你聊天真开心！'],
            greeting: ['你好！', '主人回来了！', '想我了吗？', '欢迎回来~', '很高兴见到你！'],
            tired: ['好累啊...', '需要休息一下', '能量不足...', '感觉要睡着了', '没力气了...'],
            energyLow: ['能量不够了...', '好累啊', '需要休息', '感觉要睡着了', '太累了...', '能量即将耗尽'],
            energyRecovered: ['精神了很多！', '谢谢主人！', '又有能量了！', '感觉好多了！', '谢谢你的关心！', '现在好多了！']
        };
    }
    
    // 状态更新方法
    updateState(updates) {
        const oldState = { ...this.state };
        
        // 深度合并状态
        this.state = this.deepMerge(this.state, updates);
        
        // 保存状态历史
        this.saveStateHistory(oldState, this.state);
        
        // 触发监听器
        this.notifyListeners(oldState, this.state);
        
        return this.state;
    }
    
    // 获取状态
    getState() {
        return { ...this.state };
    }
    
    // 获取特定状态
    getStateValue(key) {
        return this.getNestedValue(this.state, key);
    }
    
    // 设置特定状态
    setStateValue(key, value) {
        const updates = {};
        this.setNestedValue(updates, key, value);
        return this.updateState(updates);
    }
    
    // 状态监听器管理
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // 返回取消订阅函数
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    // 通知监听器
    notifyListeners(oldState, newState) {
        this.listeners.forEach((callbacks, key) => {
            const oldValue = this.getNestedValue(oldState, key);
            const newValue = this.getNestedValue(newState, key);
            
            if (oldValue !== newValue) {
                callbacks.forEach(callback => {
                    try {
                        callback(newValue, oldValue, newState);
                    } catch (error) {
                        console.error('状态监听器错误:', error);
                    }
                });
            }
        });
    }
    
    // 状态历史管理
    saveStateHistory(oldState, newState) {
        this.stateHistory.push({
            timestamp: Date.now(),
            oldState,
            newState,
            changes: this.getStateChanges(oldState, newState)
        });
        
        // 限制历史大小
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }
    
    // 获取状态变更
    getStateChanges(oldState, newState) {
        const changes = [];
        this.compareStates(oldState, newState, '', changes);
        return changes;
    }
    
    // 比较状态
    compareStates(oldObj, newObj, path, changes) {
        for (const key in newObj) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof newObj[key] === 'object' && newObj[key] !== null && !Array.isArray(newObj[key])) {
                this.compareStates(oldObj[key] || {}, newObj[key], currentPath, changes);
            } else if (oldObj[key] !== newObj[key]) {
                changes.push({
                    path: currentPath,
                    oldValue: oldObj[key],
                    newValue: newObj[key]
                });
            }
        }
    }
    
    // 工具方法：深度合并
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    // 工具方法：获取嵌套值
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    // 工具方法：设置嵌套值
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    
    // 状态验证
    validateState(state) {
        const errors = [];
        
        // 验证基础状态
        if (!['idle', 'excited', 'sleeping', 'chatting'].includes(state.currentState)) {
            errors.push(`无效的状态: ${state.currentState}`);
        }
        
        if (state.mood < 0 || state.mood > 100) {
            errors.push(`心情值超出范围: ${state.mood}`);
        }
        
        if (state.energy < 0 || state.energy > 100) {
            errors.push(`能量值超出范围: ${state.energy}`);
        }
        
        return errors;
    }
    
    // 状态重置
    resetState() {
        const initialState = {
            currentState: 'idle',
            mood: 80,
            energy: 100,
            position: { x: 100, y: 100 },
            isMoving: false,
            isDragging: false,
            lastInteractionTime: Date.now(),
            isEnergySystemActive: true,
            lastEnergyUpdateTime: Date.now(),
            lastInteractionForEnergy: Date.now(),
            targetPosition: null,
            mousePosition: { x: 0, y: 0 },
            animationState: {
                isAnimating: false,
                currentAnimation: null,
                animationQueue: []
            }
        };
        
        return this.updateState(initialState);
    }
    
    // 获取状态统计
    getStateStats() {
        return {
            totalChanges: this.stateHistory.length,
            currentState: this.state.currentState,
            energyLevel: this.state.energy,
            moodLevel: this.state.mood,
            isActive: this.state.isEnergySystemActive,
            lastUpdate: this.state.lastEnergyUpdateTime
        };
    }
    
    // 清理方法
    destroy() {
        this.listeners.clear();
        this.stateHistory = [];
        this.state = null;
    }
}

// 导出状态管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetStateManager;
} else {
    window.PetStateManager = PetStateManager;
}
