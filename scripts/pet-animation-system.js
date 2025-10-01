// 现代化动画系统 - 使用 Web Animations API
class PetAnimationSystem {
    constructor(element) {
        this.element = element;
        this.sprite = element?.querySelector('.pet-sprite');
        this.animations = new Map();
        this.animationQueue = [];
        this.isProcessingQueue = false;
        
        // 动画配置
        this.animationConfig = {
            // 基础动画
            breathe: {
                keyframes: [
                    { transform: 'scale(1) translateZ(0)', opacity: 1 },
                    { transform: 'scale(1.05) translateZ(0)', opacity: 0.9 },
                    { transform: 'scale(1) translateZ(0)', opacity: 1 }
                ],
                options: {
                    duration: 2000,
                    easing: 'ease-in-out',
                    iterations: Infinity,
                    fill: 'both'
                }
            },
            
            // 兴奋状态动画
            bounce: {
                keyframes: [
                    { transform: 'translateY(0) scale(1)' },
                    { transform: 'translateY(-10px) scale(1.1)' },
                    { transform: 'translateY(0) scale(1)' }
                ],
                options: {
                    duration: 600,
                    easing: 'ease-in-out',
                    iterations: Infinity,
                    fill: 'both'
                }
            },
            
            // 睡眠状态动画
            sleep: {
                keyframes: [
                    { transform: 'scale(0.95) translateZ(0)' },
                    { transform: 'scale(1.0) translateZ(0)' },
                    { transform: 'scale(0.95) translateZ(0)' }
                ],
                options: {
                    duration: 3000,
                    easing: 'ease-in-out',
                    iterations: Infinity,
                    fill: 'both'
                }
            },
            
            // 拖拽动画
            drag: {
                keyframes: [
                    { transform: 'scale(1.1) translateZ(0)', filter: 'brightness(1.2)' }
                ],
                options: {
                    duration: 0,
                    fill: 'both'
                }
            },
            
            // 状态切换动画
            stateTransition: {
                keyframes: [
                    { transform: 'scale(1) translateZ(0)', opacity: 1 },
                    { transform: 'scale(1.2) translateZ(0)', opacity: 0.8 },
                    { transform: 'scale(1) translateZ(0)', opacity: 1 }
                ],
                options: {
                    duration: 500,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    iterations: 1,
                    fill: 'both'
                }
            },
            
            // 能量恢复动画
            energyRecovery: {
                keyframes: [
                    { transform: 'scale(1) translateZ(0)', filter: 'brightness(1)' },
                    { transform: 'scale(1.15) translateZ(0)', filter: 'brightness(1.3) drop-shadow(0 0 20px #4caf50)' },
                    { transform: 'scale(1) translateZ(0)', filter: 'brightness(1)' }
                ],
                options: {
                    duration: 800,
                    easing: 'ease-out',
                    iterations: 1,
                    fill: 'both'
                }
            },
            
            // 低能量动画
            lowEnergy: {
                keyframes: [
                    { transform: 'scale(1) translateZ(0)', opacity: 1, filter: 'grayscale(0)' },
                    { transform: 'scale(0.95) translateZ(0)', opacity: 0.8, filter: 'grayscale(0.2)' },
                    { transform: 'scale(1) translateZ(0)', opacity: 1, filter: 'grayscale(0)' }
                ],
                options: {
                    duration: 2500,
                    easing: 'ease-in-out',
                    iterations: Infinity,
                    fill: 'both'
                }
            },
            
            // 极低能量动画
            veryLowEnergy: {
                keyframes: [
                    { transform: 'scale(1) translateZ(0)', opacity: 1, filter: 'grayscale(0.1)' },
                    { transform: 'scale(0.9) translateZ(0)', opacity: 0.7, filter: 'grayscale(0.3)' },
                    { transform: 'scale(1) translateZ(0)', opacity: 1, filter: 'grayscale(0.1)' }
                ],
                options: {
                    duration: 3000,
                    easing: 'ease-in-out',
                    iterations: Infinity,
                    fill: 'both'
                }
            },
            
            // 移动动画
            move: {
                keyframes: [
                    { transform: 'translateX(0) translateY(0) scale(1)' },
                    { transform: 'translateX(5px) translateY(-3px) scale(1.05)' },
                    { transform: 'translateX(0) translateY(0) scale(1)' }
                ],
                options: {
                    duration: 1000,
                    easing: 'ease-in-out',
                    iterations: 1,
                    fill: 'both'
                }
            }
        };
        
        // 动画事件监听器
        this.animationListeners = new Map();
        
        this.init();
    }
    
    init() {
        if (!this.sprite) {
            console.warn('PetAnimationSystem: 未找到 .pet-sprite 元素');
            return;
        }
        
        // 设置基础样式
        this.sprite.style.willChange = 'transform, opacity, filter';
        this.sprite.style.transform = 'translateZ(0)';
        this.sprite.style.backfaceVisibility = 'hidden';
        
        console.log('PetAnimationSystem: 动画系统初始化完成');
    }
    
    // 播放动画
    playAnimation(animationName, customOptions = {}) {
        if (!this.sprite) return null;
        
        const config = this.animationConfig[animationName];
        if (!config) {
            console.warn(`PetAnimationSystem: 未找到动画配置 "${animationName}"`);
            return null;
        }
        
        // 合并自定义选项
        const options = { ...config.options, ...customOptions };
        
        // 停止同名动画
        this.stopAnimation(animationName);
        
        // 创建并播放动画
        const animation = this.sprite.animate(config.keyframes, options);
        
        // 存储动画引用
        this.animations.set(animationName, animation);
        
        // 设置动画事件监听器
        this.setupAnimationListeners(animation, animationName);
        
        console.log(`PetAnimationSystem: 播放动画 "${animationName}"`);
        return animation;
    }
    
    // 停止动画
    stopAnimation(animationName) {
        const animation = this.animations.get(animationName);
        if (animation) {
            animation.cancel();
            this.animations.delete(animationName);
            console.log(`PetAnimationSystem: 停止动画 "${animationName}"`);
        }
    }
    
    // 停止所有动画
    stopAllAnimations() {
        this.animations.forEach((animation, name) => {
            animation.cancel();
            console.log(`PetAnimationSystem: 停止动画 "${name}"`);
        });
        this.animations.clear();
    }
    
    // 暂停动画
    pauseAnimation(animationName) {
        const animation = this.animations.get(animationName);
        if (animation) {
            animation.pause();
        }
    }
    
    // 恢复动画
    resumeAnimation(animationName) {
        const animation = this.animations.get(animationName);
        if (animation) {
            animation.play();
        }
    }
    
    // 设置动画事件监听器
    setupAnimationListeners(animation, animationName) {
        animation.addEventListener('finish', () => {
            this.animations.delete(animationName);
            this.triggerAnimationEvent('finish', animationName);
        });
        
        animation.addEventListener('cancel', () => {
            this.animations.delete(animationName);
            this.triggerAnimationEvent('cancel', animationName);
        });
    }
    
    // 触发动画事件
    triggerAnimationEvent(eventType, animationName) {
        const listeners = this.animationListeners.get(`${eventType}:${animationName}`);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(animationName);
                } catch (error) {
                    console.error('动画事件监听器错误:', error);
                }
            });
        }
    }
    
    // 添加动画事件监听器
    onAnimationEvent(eventType, animationName, callback) {
        const key = `${eventType}:${animationName}`;
        if (!this.animationListeners.has(key)) {
            this.animationListeners.set(key, []);
        }
        this.animationListeners.get(key).push(callback);
        
        // 返回取消监听函数
        return () => {
            const listeners = this.animationListeners.get(key);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    
    // 动画队列管理
    queueAnimation(animationName, customOptions = {}) {
        this.animationQueue.push({ animationName, customOptions });
        this.processAnimationQueue();
    }
    
    // 处理动画队列
    async processAnimationQueue() {
        if (this.isProcessingQueue || this.animationQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.animationQueue.length > 0) {
            const { animationName, customOptions } = this.animationQueue.shift();
            const animation = this.playAnimation(animationName, customOptions);
            
            if (animation && animation.finished) {
                try {
                    await animation.finished;
                } catch (error) {
                    // 动画被取消，继续处理下一个
                }
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    // 状态动画管理
    setStateAnimation(state) {
        // 停止当前状态动画
        this.stopStateAnimations();
        
        switch (state) {
            case 'idle':
                this.playAnimation('breathe');
                break;
            case 'excited':
                this.playAnimation('bounce');
                break;
            case 'sleeping':
                this.playAnimation('sleep');
                break;
            default:
                this.playAnimation('breathe');
        }
    }
    
    // 停止状态动画
    stopStateAnimations() {
        const stateAnimations = ['breathe', 'bounce', 'sleep'];
        stateAnimations.forEach(name => this.stopAnimation(name));
    }
    
    // 能量状态动画
    setEnergyAnimation(energyLevel) {
        // 停止能量相关动画
        this.stopAnimation('lowEnergy');
        this.stopAnimation('veryLowEnergy');
        
        if (energyLevel <= 15) {
            this.playAnimation('veryLowEnergy');
        } else if (energyLevel <= 30) {
            this.playAnimation('lowEnergy');
        }
    }
    
    // 拖拽动画
    setDragAnimation(isDragging) {
        if (isDragging) {
            this.stopStateAnimations();
            this.playAnimation('drag');
        } else {
            this.stopAnimation('drag');
            // 恢复状态动画
            const currentState = this.element?.classList.contains('excited') ? 'excited' : 
                                this.element?.classList.contains('sleeping') ? 'sleeping' : 'idle';
            this.setStateAnimation(currentState);
        }
    }
    
    // 状态切换动画
    playStateTransition() {
        return this.playAnimation('stateTransition');
    }
    
    // 能量恢复动画
    playEnergyRecovery() {
        return this.playAnimation('energyRecovery');
    }
    
    // 移动动画
    playMoveAnimation() {
        return this.playAnimation('move');
    }
    
    // 获取动画状态
    getAnimationState() {
        return {
            activeAnimations: Array.from(this.animations.keys()),
            queueLength: this.animationQueue.length,
            isProcessingQueue: this.isProcessingQueue
        };
    }
    
    // 清理方法
    destroy() {
        this.stopAllAnimations();
        this.animationQueue = [];
        this.animationListeners.clear();
        this.animations.clear();
        this.element = null;
        this.sprite = null;
    }
}

// 导出动画系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetAnimationSystem;
} else {
    window.PetAnimationSystem = PetAnimationSystem;
}
