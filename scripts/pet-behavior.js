// 宠物行为系统
class DesktopPet {
    constructor() {
        this.pet = document.getElementById('pet');
        this.container = document.getElementById('pet-container');
        this.statusText = document.getElementById('status-text');
        this.moodFill = document.getElementById('mood-fill');
        this.speechBubble = document.getElementById('speech-bubble');
        this.speechText = document.getElementById('speech-text');
        
        this.state = 'idle'; // idle, walking, excited, sleeping
        this.mood = 80; // 0-100
        this.energy = 100; // 0-100
        this.position = { x: 100, y: 100 };
        this.targetPosition = null;
        this.isMoving = false;
        this.isDragging = false;
        
        this.behaviors = {
            idle: { duration: 3000, next: ['excited'], name: '💭 待机' },
            excited: { duration: 2500, next: ['idle', 'sleeping'], name: '🎉 兴奋' },
            sleeping: { duration: 6000, next: ['idle'], name: '😴 睡觉' }
        };
        
        this.messages = {
            idle: ['在想什么呢...', '今天天气不错~', '主人在忙什么？', '无聊ing...'],
            excited: ['好开心！', '耶！', '太棒了！', '٩(◕‿◕)۶'],
            sleeping: ['ZZZ...', '好困...', '做了个好梦', '呼呼...'],
            greeting: ['你好！', '主人回来了！', '想我了吗？', '欢迎回来~']
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // 禁用自动行为循环
        // this.startBehaviorLoop();
        this.updateMoodDisplay();
        
        // 显示欢迎消息
        setTimeout(() => {
            this.showMessage('greeting');
        }, 1000);
    }
    
    setupEventListeners() {
        // 点击交互
        this.pet.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.isDragging) {
                this.interact();
            }
        });
        
        // 手动实现拖拽功能
        let dragStart = null;
        let isDraggingWindow = false;
        let lastWindowPosition = { x: 0, y: 0 };
        let animationFrameId = null;
        let pendingMove = null;
        
        this.pet.addEventListener('mousedown', (e) => {
            // 只处理左键按下
            if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                
                dragStart = { x: e.clientX, y: e.clientY };
                // 记录当前窗口位置
                lastWindowPosition = {
                    x: window.screenX || 0,
                    y: window.screenY || 0
                };
                this.isDragging = false;
                isDraggingWindow = false;
                
                // 立即禁用所有过渡动画和动画效果
                this.pet.style.transition = 'none';
                this.pet.style.animation = 'none';
                this.pet.querySelector('.pet-sprite').style.animation = 'none';
                
                // 设置拖拽样式
                this.pet.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
            }
        });
        
        // 优化的mousemove处理
        const handleMouseMove = (e) => {
            if (!dragStart || !(e.buttons & 1)) return; // 检查左键是否仍然按下
            
            const distance = Math.sqrt(
                Math.pow(e.clientX - dragStart.x, 2) + 
                Math.pow(e.clientY - dragStart.y, 2)
            );
            
            if (distance > 2) { // 更低的触发阈值
                this.isDragging = true;
                isDraggingWindow = true;
                
                // 计算新位置
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                const newX = lastWindowPosition.x + deltaX;
                const newY = lastWindowPosition.y + deltaY;
                
                // 存储待处理的移动
                pendingMove = { x: newX, y: newY };
                
                // 如果没有正在进行的动画帧，则开始新的
                if (!animationFrameId) {
                    const performMove = () => {
                        if (pendingMove && typeof require !== 'undefined') {
                            const { ipcRenderer } = require('electron');
                            ipcRenderer.send('move-window', pendingMove.x, pendingMove.y);
                            pendingMove = null;
                        }
                        animationFrameId = null;
                        
                        // 如果还有待处理的移动，继续下一帧
                        if (pendingMove) {
                            animationFrameId = requestAnimationFrame(performMove);
                        }
                    };
                    animationFrameId = requestAnimationFrame(performMove);
                }
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // 左键释放
                dragStart = null;
                isDraggingWindow = false;
                
                // 取消任何待处理的动画帧
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                pendingMove = null;
                
                // 恢复样式和动画
                this.pet.style.cursor = 'move';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // 立即标记拖拽结束，防止颤动
                this.isDragging = false;
                
                // 延迟恢复动画，确保拖拽完全停止
                setTimeout(() => {
                    if (!this.isDragging && !isDraggingWindow) {
                        // 先恢复transform，再恢复动画
                        this.pet.style.transition = 'none';
                        // 强制重绘
                        this.pet.offsetHeight;
                        
                        // 然后添加平滑的过渡
                        this.pet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                        
                        // 最后恢复动画
                        setTimeout(() => {
                            if (!this.isDragging) {
                                this.pet.style.animation = '';
                                this.pet.querySelector('.pet-sprite').style.animation = 'breathe 2s ease-in-out infinite';
                            }
                        }, 100);
                    }
                }, 50);
            }
        });
        
        // 处理鼠标离开窗口的情况
        document.addEventListener('mouseleave', () => {
            if (isDraggingWindow) {
                // 模拟mouseup事件
                dragStart = null;
                isDraggingWindow = false;
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                pendingMove = null;
                
                // 立即标记拖拽结束
                this.isDragging = false;
                
                // 恢复样式
                this.pet.style.cursor = 'move';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // 稳定地恢复动画
                setTimeout(() => {
                    this.pet.style.transition = 'none';
                    this.pet.offsetHeight; // 强制重绘
                    this.pet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    this.pet.style.animation = '';
                    this.pet.querySelector('.pet-sprite').style.animation = 'breathe 2s ease-in-out infinite';
                }, 100);
            }
        });
        
        // 悬停显示状态
        this.pet.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                this.updateStatusDisplay();
            }
        });
        
        // 移除所有自动行为功能
    }
    
    setState(newState) {
        if (this.state !== newState) {
            // 显示状态切换提示
            this.showStateChangeNotification(this.state, newState);
            
            this.pet.className = `pet ${newState}`;
            this.state = newState;
            this.updateStatusDisplay();
            console.log(`宠物状态改变: ${this.state} -> ${newState}`);
            
            // 显示对应状态的消息
            setTimeout(() => {
                this.showMessage(newState);
            }, 500);
        }
    }
    
    startBehaviorLoop() {
        const runBehavior = () => {
            const currentBehavior = this.behaviors[this.state];
            
            // 根据状态执行相应行为
            switch(this.state) {
                case 'walking':
                    // 只有在散步状态下才会移动
                    this.randomWalk();
                    break;
                case 'excited':
                    this.showMessage('excited');
                    break;
                case 'sleeping':
                    this.energy = Math.min(100, this.energy + 20);
                    break;
                case 'idle':
                    // 待机状态下不移动，只是偶尔显示消息
                    if (Math.random() < 0.3) {
                        this.showMessage('idle');
                    }
                    break;
            }
            
            // 计划下一个状态
            setTimeout(() => {
                if (!this.isDragging && !this.isMoving) {
                    const possibleNext = currentBehavior.next;
                    const nextState = this.chooseNextState(possibleNext);
                    this.setState(nextState);
                }
                runBehavior();
            }, currentBehavior.duration + Math.random() * 2000);
        };
        
        runBehavior();
    }
    
    chooseNextState(possibleStates) {
        // 根据心情和能量选择下一个状态
        if (this.energy < 30) {
            return 'sleeping';
        }
        
        if (this.mood > 80 && Math.random() < 0.3) {
            return 'excited';
        }
        
        // 随机选择
        return possibleStates[Math.floor(Math.random() * possibleStates.length)];
    }
    
    showStateChangeNotification(oldState, newState) {
        const oldName = this.behaviors[oldState]?.name || oldState;
        const newName = this.behaviors[newState]?.name || newState;
        
        if (oldState && oldState !== newState) {
            // 创建状态切换提示元素
            const notification = document.createElement('div');
            notification.className = 'state-change-notification';
            notification.innerHTML = `${oldName} → ${newName}`;
            notification.style.cssText = `
                position: absolute;
                top: -80px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                z-index: 1001;
                opacity: 0;
                transition: all 0.3s ease;
                pointer-events: none;
                box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.3);
            `;
            
            this.container.appendChild(notification);
            
            // 显示动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(-50%) translateY(-5px)';
            });
            
            // 3秒后渐隐并删除
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-15px)';
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }
    
    randomWalk() {
        
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const petSize = 100;
        
        // 随机目标位置（保持在屏幕边界内）
        const targetX = Math.random() * (screenWidth - petSize);
        const targetY = Math.random() * (screenHeight - petSize);
        
        this.moveToPosition(targetX, targetY);
    }
    
    moveToPosition(x, y) {
        if (this.isMoving) return;
        
        this.isMoving = true;
        this.setState('walking');
        
        // 使用 Electron 的 IPC 来移动窗口
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            
            const startX = this.position.x;
            const startY = this.position.y;
            const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            const duration = Math.min(3000, Math.max(1000, distance * 2));
            const steps = 30;
            const stepDelay = duration / steps;
            
            let currentStep = 0;
            
            const moveStep = () => {
                currentStep++;
                const progress = currentStep / steps;
                const easeProgress = this.easeInOutQuad(progress);
                
                const currentX = startX + (x - startX) * easeProgress;
                const currentY = startY + (y - startY) * easeProgress;
                
                ipcRenderer.send('move-window', Math.round(currentX), Math.round(currentY));
                this.position.x = currentX;
                this.position.y = currentY;
                
                if (currentStep < steps) {
                    setTimeout(moveStep, stepDelay);
                } else {
                    this.isMoving = false;
                    this.setState('idle');
                }
            };
            
            moveStep();
        }
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    interact() {
        this.mood = Math.min(100, this.mood + 10);
        this.energy = Math.max(0, this.energy - 5);
        
        this.setState('excited');
        this.showMessage('greeting');
        this.updateMoodDisplay();
        
        // 2秒后回到待机状态
        setTimeout(() => {
            if (this.state === 'excited') {
                this.setState('idle');
            }
        }, 2000);
    }
    
    // 已移除喂食和玩耍功能
    
    sleep() {
        this.setState('sleeping');
        this.showMessage('sleeping');
        
        // 恢复能量
        const restoreEnergy = setInterval(() => {
            if (this.state === 'sleeping') {
                this.energy = Math.min(100, this.energy + 5);
                this.updateMoodDisplay();
            } else {
                clearInterval(restoreEnergy);
            }
        }, 1000);
    }
    
    // 已移除随机交互和updateStats功能
    
    showMessage(type) {
        const messages = this.messages[type] || this.messages.idle;
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        this.speechText.textContent = message;
        this.speechBubble.style.display = 'block';
        
        // 3秒后隐藏消息
        setTimeout(() => {
            this.speechBubble.style.display = 'none';
        }, 3000);
    }
    
    updateStatusDisplay() {
        const stateNames = {
            idle: '💭 待机中',
            excited: '🎉 兴奋中',
            sleeping: '😴 睡觉中'
        };
        
        const currentStateName = stateNames[this.state] || this.state;
        this.statusText.textContent = `${currentStateName} | 心情: ${Math.round(this.mood)}% | 能量: ${Math.round(this.energy)}%`;
    }
    
    updateMoodDisplay() {
        this.moodFill.style.width = `${this.mood}%`;
        
        // 根据心情改变颜色
        if (this.mood > 70) {
            this.moodFill.style.background = 'linear-gradient(90deg, #48dbfb, #0abde3)';
        } else if (this.mood > 40) {
            this.moodFill.style.background = 'linear-gradient(90deg, #feca57, #ff9ff3)';
        } else {
            this.moodFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a24)';
        }
    }
    
    // 已移除updateStats功能
}

// 全局宠物实例
let desktopPet;

// 当页面加载完成时初始化宠物
document.addEventListener('DOMContentLoaded', () => {
    desktopPet = new DesktopPet();
    // 全局暴露宠物实例
    window.desktopPet = desktopPet;
});

// 导出函数供HTML调用（保留sleep方法）
window.petSleep = () => desktopPet?.sleep();

// 导出函数供HTML调用（保留sleep方法）
window.petSleep = () => desktopPet?.sleep();