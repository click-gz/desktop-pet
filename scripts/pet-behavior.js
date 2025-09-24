// 宠物行为系统
class DesktopPet {
    constructor() {
        this.pet = document.getElementById('pet');
        this.container = document.getElementById('pet-container');
        this.statusText = document.getElementById('status-text');
        this.moodFill = document.getElementById('mood-fill');
        this.energyFill = document.getElementById('energy-fill');
        this.speechBubble = document.getElementById('speech-bubble');
        this.speechText = document.getElementById('speech-text');
        this.sleepIndicator = document.getElementById('sleep-indicator');
        
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
        
        // 移动相关属性
        this.lastInteractionTime = Date.now();
        this.excitedMoveTimer = null;
        this.mousePosition = { x: 0, y: 0 };
        
        // 能量系统属性
        this.energyDecayTimer = null;
        this.sleepRecoveryTimer = null;
        this.isEnergySystemActive = true;
        this.lastEnergyUpdateTime = Date.now();
        
        // 差异化能量消耗率（每毫秒消耗的能量百分比）
        this.energyDecayRates = {
            idle: 100 / (60 * 60 * 1000),      // 待机：1小时耗尽
            excited: 100 / (40 * 60 * 1000),   // 兴奋：40分钟耗尽
            sleeping: 0                         // 睡眠：不消耗
        };
        
        this.lastInteractionForEnergy = Date.now();
        this.energyRecoveryAmount = 1; // 每次点击恢复1%能量
        this.minInteractionInterval = 2000; // 防止过度点击的最小间隔(2秒)
        
        // 移动能量消耗相关
        this.moveEnergyCost = 2; // 基础移动能量消耗
        this.maxMoveEnergyCost = 5; // 最大移动能量消耗
        
        this.messages = {
            idle: ['在想什么呢...', '今天天气不错~', '主人在忙什么？', '无聊ing...', '需要做点什么吗？'],
            excited: ['好开心！', '耶！', '太棒了！', '٩(◕‿◕)۶', '好精神！', '感觉充满了力量！'],
            sleeping: ['ZZZ...', '好困...', '做了个好梦', '呼呼...', '在恢复能量...'],
            greeting: ['你好！', '主人回来了！', '想我了吗？', '欢迎回来~', '很高兴见到你！'],
            tired: ['好累啊...', '需要休息一下', '能量不足...', '感觉要睡着了', '没力气了...'],
            energyLow: ['能量不够了...', '好累啊', '需要休息', '感觉要睡着了', '太累了...', '能量即将耗尽'],
            energyRecovered: ['精神了很多！', '谢谢主人！', '又有能量了！', '感觉好多了！', '谢谢你的关心！', '现在好多了！']
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMouseTracking();
        this.initializePosition();
        // 禁用自动行为循环
        // this.startBehaviorLoop();
        this.updateMoodDisplay();
        this.startEnergySystem(); // 启动能量系统
        
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
                // 更新最后交互时间
                this.lastInteractionTime = Date.now();
                this.interact();
            }
        });
        
        // 使用 Pointer Events + rAF 实现丝滑拖拽
        this.initPointerDragSystem();
        
        // 悬停显示状态
        this.pet.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                this.updateStatusDisplay();
            }
        });
        
        // 移除所有自动行为功能
    }
    
    // 使用 Pointer Events + requestAnimationFrame 实现丝滑拖拽
    initPointerDragSystem() {
        const self = this;
        const petEl = this.pet;
        let ipcRenderer = null;
        try {
            if (typeof require !== 'undefined') {
                ipcRenderer = require('electron').ipcRenderer;
            }
        } catch (e) {
            ipcRenderer = null;
        }
        
        let dragFrame = null;
        let dragging = false;
        let startCursor = { x: 0, y: 0 };
        let startWindow = { x: 0, y: 0 };
        let pendingPos = { x: 0, y: 0 };
        const windowSize = { w: 250, h: 250 }; // 与主窗口一致
        
        function onPointerDown(e) {
            // 仅左键或触摸
            if (e.button !== undefined && e.button !== 0) return;
            dragging = true;
            self.isDragging = true;
            self.lastInteractionTime = Date.now();
            
            // 禁用选择和动画，设置样式
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            petEl.classList.add('dragging');
            const sprite = petEl.querySelector('.pet-sprite');
            if (sprite) sprite.style.animation = 'none';
            petEl.style.transition = 'none';
            
            // 捕获指针
            try { petEl.setPointerCapture(e.pointerId); } catch (_) {}
            
            // 记录起始数据
            const screenX = (window.screenX || window.screenLeft || 0) + e.clientX;
            const screenY = (window.screenY || window.screenTop || 0) + e.clientY;
            startCursor.x = screenX;
            startCursor.y = screenY;
            
            if (ipcRenderer) {
                const pos = self.position;
                startWindow.x = pos.x || 0;
                startWindow.y = pos.y || 0;
            } else {
                startWindow.x = 0;
                startWindow.y = 0;
            }
            
            pendingPos.x = startWindow.x;
            pendingPos.y = startWindow.y;
            
            // 启动rAF循环
            if (!dragFrame) {
                const loop = () => {
                    if (!dragging) { dragFrame = null; return; }
                    if (ipcRenderer) {
                        ipcRenderer.send('move-window', pendingPos.x, pendingPos.y);
                        // 本地记录，减少抖动
                        self.position.x = pendingPos.x;
                        self.position.y = pendingPos.y;
                    }
                    dragFrame = requestAnimationFrame(loop);
                };
                dragFrame = requestAnimationFrame(loop);
            }
        }
        
        function onPointerMove(e) {
            if (!dragging) return;
            const screenX = (window.screenX || window.screenLeft || 0) + e.clientX;
            const screenY = (window.screenY || window.screenTop || 0) + e.clientY;
            const dx = screenX - startCursor.x;
            const dy = screenY - startCursor.y;
            
            let nextX = Math.round(startWindow.x + dx);
            let nextY = Math.round(startWindow.y + dy);
            
            // 边界限制
            const maxX = Math.max(0, window.screen.width - windowSize.w);
            const maxY = Math.max(0, window.screen.height - windowSize.h);
            if (isFinite(maxX) && isFinite(maxY)) {
                nextX = Math.max(0, Math.min(maxX, nextX));
                nextY = Math.max(0, Math.min(maxY, nextY));
            }
            
            pendingPos.x = nextX;
            pendingPos.y = nextY;
        }
        
        function endDrag() {
            if (!dragging) return;
            dragging = false;
            self.isDragging = false;
            petEl.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 平滑恢复动画
            requestAnimationFrame(() => {
                petEl.style.transition = 'transform 0.2s ease-out';
                const sprite = petEl.querySelector('.pet-sprite');
                setTimeout(() => {
                    if (!self.isDragging && sprite) {
                        petEl.style.animation = '';
                        sprite.style.animation = 'breathe 2s ease-in-out infinite';
                    }
                }, 200);
            });
        }
        
        function onPointerUp(e) {
            try { petEl.releasePointerCapture(e.pointerId); } catch (_) {}
            endDrag();
        }
        
        // 注册事件
        petEl.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        
        // 存储清理函数
        this.dragSystem = {
            destroy() {
                petEl.removeEventListener('pointerdown', onPointerDown);
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                if (dragFrame) {
                    cancelAnimationFrame(dragFrame);
                    dragFrame = null;
                }
                if (self.isDragging) {
                    self.isDragging = false;
                    petEl.classList.remove('dragging');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            }
        };
    }

    
    // 初始化窗口位置
    async initializePosition() {
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                const position = await ipcRenderer.invoke('get-window-position');
                this.position = position;
                console.log('初始化宠物位置:', this.position);
            } catch (error) {
                console.error('获取窗口位置失败:', error);
                this.position = { x: 100, y: 100 }; // 默认位置
            }
        }
    }
    
    // 设置鼠标位置跟踪
    setupMouseTracking() {
        // 跟踪窗口内鼠标位置，转换为屏幕坐标
        document.addEventListener('mousemove', (e) => {
            // 将相对于窗口的坐标转换为屏幕坐标
            const screenX = (window.screenX || window.screenLeft || 0) + e.clientX;
            const screenY = (window.screenY || window.screenTop || 0) + e.clientY;
            
            this.mousePosition.x = screenX;
            this.mousePosition.y = screenY;
            
            // 调试输出
            // console.log('鼠标屏幕坐标:', screenX, screenY);
        });
        
        // 尝试获取系统级鼠标位置（如果支持的话）
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                // 可以定期向主进程请求鼠标位置
                setInterval(() => {
                    if (this.state === 'excited') {
                        ipcRenderer.invoke('get-cursor-position').then(pos => {
                            if (pos) {
                                this.mousePosition.x = pos.x;
                                this.mousePosition.y = pos.y;
                            }
                        }).catch(() => {
                            // 如果主进程不支持，忽略错误
                        });
                    }
                }, 500); // 每500ms更新一次
            } catch (error) {
                console.log('系统鼠标位置跟踪不可用，使用窗口内跟踪');
            }
        }
    }
    
    setState(newState) {
        // 睡眠状态特殊处理：只有能量足够才能唤醒
        if (this.state === 'sleeping' && newState !== 'sleeping') {
            if (this.energy < 20) {
                console.log('能量不足，无法从睡眠状态唤醒');
                this.showMessage('sleeping');
                return;
            } else {
                // 能量足够，允许唤醒
                this.clearSleepRecovery();
            }
        }
        
        // 如果能量为0且不是进入睡眠状态，强制进入睡眠
        if (this.energy <= 0 && newState !== 'sleeping') {
            console.log('能量耗尽，强制进入睡眠状态');
            this.forceSleep();
            return;
        }
        
        if (this.state !== newState) {
            // 清除之前的定时器
            this.clearExcitedMoveTimer();
            
            // 显示状态切换提示
            this.showStateChangeNotification(this.state, newState);
            
            this.pet.className = `pet ${newState}`;
            this.state = newState;
            
            // 控制睡眠指示器的显示
            if (this.sleepIndicator) {
                if (newState === 'sleeping') {
                    this.sleepIndicator.style.display = 'block';
                    // 开始睡眠恢复
                    this.startSleepRecovery();
                } else {
                    this.sleepIndicator.style.display = 'none';
                    // 停止睡眠恢复
                    this.clearSleepRecovery();
                }
            }
            
            // 如果进入兴奋状态，启动移动定时器
            if (newState === 'excited') {
                this.startExcitedMoveTimer();
            }
            
            this.updateStatusDisplay();
            console.log(`宠物状态改变: ${this.state} -> ${newState}`);
            
            // 显示对应状态的消息
            setTimeout(() => {
                this.showMessage(newState);
            }, 500);
        }
    }
    
    startBehaviorLoop() {
        // 完全禁用自动行为循环，所有状态切换必须由用户手动选择触发
        console.log('自动行为循环已禁用');
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
        // 移除这个函数，使用新的 moveTo 接口替代
        console.log('请使用 moveTo 接口替代 moveToPosition');
        this.moveTo(x, y);
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    interact() {
        this.mood = Math.min(100, this.mood + 10);
        
        // 能量系统交互
        this.handleEnergyInteraction();
        
        // 更新最后交互时间
        this.lastInteractionTime = Date.now();
        
        this.setState('excited');
        this.showMessage('greeting');
        this.updateMoodDisplay();
        
        // 移除自动状态切换，所有状态切换必须由用户手动选择
        // setTimeout(() => {
        //     if (this.state === 'excited') {
        //         this.setState('idle');
        //     }
        // }, 2000);
    }
    
    // 已移除喂食和玩耍功能
    
    sleep() {
        // 检查是否可以睡眠（只有在非强制睡眠时才检查）
        if (this.energy > 50) {
            console.log('能量还很充足，暂时不想睡觉');
            this.showMessage('idle');
            return;
        }
        
        this.setState('sleeping');
        this.showMessage('sleeping');
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
        
        // 根据能量水平添加状态指示
        let energyIcon = '';
        let energyStatus = '';
        
        if (this.energy <= 5) {
            energyIcon = ' 🔴'; // 红色警告
            energyStatus = '(极低)';
        } else if (this.energy <= 15) {
            energyIcon = ' 🟠'; // 橙色警告
            energyStatus = '(很低)';
        } else if (this.energy <= 30) {
            energyIcon = ' 🟡'; // 黄色警告
            energyStatus = '(低)';
        } else if (this.energy <= 60) {
            energyIcon = ' 🟡'; // 黄色一般
            energyStatus = '';
        } else if (this.energy >= 80) {
            energyIcon = ' 🟢'; // 绿色充满
            energyStatus = '';
        }
        
        // 显示能量消耗率信息
        const currentDecayRate = this.energyDecayRates[this.state] || 0;
        const decayRatePerMinute = (currentDecayRate * 60 * 1000).toFixed(1);
        const statusSuffix = currentDecayRate > 0 ? ` (-${decayRatePerMinute}%/min)` : '';
        
        this.statusText.textContent = `${currentStateName}${energyIcon} | 心情: ${Math.round(this.mood)}% | 能量: ${Math.round(this.energy)}%${energyStatus}${statusSuffix}`;
    }
    
    updateMoodDisplay() {
        // 更新心情条
        this.moodFill.style.width = `${this.mood}%`;
        
        // 根据心情改变颜色
        if (this.mood > 70) {
            this.moodFill.style.background = 'linear-gradient(90deg, #48dbfb, #0abde3)';
        } else if (this.mood > 40) {
            this.moodFill.style.background = 'linear-gradient(90deg, #feca57, #ff9ff3)';
        } else {
            this.moodFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a24)';
        }
        
        // 更新能量条
        const energyFill = document.getElementById('energy-fill');
        if (energyFill) {
            energyFill.style.width = `${this.energy}%`;
            
            // 根据能量水平改变颜色
            if (this.energy > 70) {
                energyFill.style.background = 'linear-gradient(90deg, #4caf50, #66bb6a)';
            } else if (this.energy > 30) {
                energyFill.style.background = 'linear-gradient(90deg, #ffa726, #ffb74d)';
            } else if (this.energy > 10) {
                energyFill.style.background = 'linear-gradient(90deg, #ff7043, #ff8a65)';
            } else {
                energyFill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b7a)';
            }
        }
    }
    
    // 宠物移动接口函数
    moveTo(targetX, targetY, callback) {
        if (this.isMoving) {
            console.log('宠物正在移动中，忽略新的移动请求');
            return;
        }
        
        // 检查能量是否足够移动
        if (this.energy < 3) {
            console.log('能量不足，无法移动');
            this.showMessage('energyLow');
            return;
        }
        
        // 计算移动距离和能量消耗
        const distance = Math.sqrt(Math.pow(targetX - this.position.x, 2) + Math.pow(targetY - this.position.y, 2));
        const energyCost = this.calculateMoveEnergyCost(distance);
        
        console.log(`准备移动距离: ${distance.toFixed(0)}px, 能量消耗: ${energyCost.toFixed(1)}%`);
        
        this.isMoving = true;
        console.log(`宠物开始移动到位置: (${targetX}, ${targetY})`);
        
        // 使用 Electron 的 IPC 来移动窗口
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            
            const startX = this.position.x;
            const startY = this.position.y;
            const duration = Math.min(2000, Math.max(800, distance * 1.5)); // 调整移动速度
            const steps = 30;
            const stepDelay = duration / steps;
            
            let currentStep = 0;
            
            const moveStep = () => {
                currentStep++;
                const progress = currentStep / steps;
                const easeProgress = this.easeInOutQuad(progress);
                
                const currentX = startX + (targetX - startX) * easeProgress;
                const currentY = startY + (targetY - startY) * easeProgress;
                
                ipcRenderer.send('move-window', Math.round(currentX), Math.round(currentY));
                this.position.x = currentX;
                this.position.y = currentY;
                
                if (currentStep < steps) {
                    setTimeout(moveStep, stepDelay);
                } else {
                    this.isMoving = false;
                    
                    // 移动完成后消耗能量
                    this.consumeEnergyForMovement(energyCost);
                    
                    console.log('宠物移动完成');
                    if (callback) callback();
                }
            };
            
            moveStep();
        } else {
            console.error('require 不可用，无法移动窗口');
            this.isMoving = false;
        }
    }
    
    // 移动到鼠标位置
    moveToMouse() {
        if (!this.mousePosition.x && !this.mousePosition.y) {
            console.log('未检测到鼠标位置，使用当前窗口中心位置');
            // 如果没有鼠标位置，随机移动到屏幕的中心区域
            const centerX = window.screen.width / 2;
            const centerY = window.screen.height / 2;
            const randomOffsetX = (Math.random() - 0.5) * 200; // -100 到 100
            const randomOffsetY = (Math.random() - 0.5) * 200;
            
            this.mousePosition.x = centerX + randomOffsetX;
            this.mousePosition.y = centerY + randomOffsetY;
        }
        
        console.log('当前鼠标位置:', this.mousePosition.x, this.mousePosition.y);
        console.log('屏幕尺寸:', window.screen.width, window.screen.height);
        
        // 计算鼠标附近的合适位置（避免完全覆盖鼠标）
        // 在鼠标周围100像素范围内随机选择位置
        const offsetRadius = 80; // 偏移半径
        const angle = Math.random() * 2 * Math.PI; // 随机角度
        const distance = Math.random() * offsetRadius + 20; // 20-100像素距离
        
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        
        let targetX = this.mousePosition.x + offsetX;
        let targetY = this.mousePosition.y + offsetY;
        
        // 安全边界检查，确保宠物不会移动到屏幕外
        const petSize = 120; // 宠物窗口大小（留一些安全边距）
        const safeMargin = 10; // 安全边距
        
        const minX = safeMargin;
        const minY = safeMargin;
        const maxX = window.screen.width - petSize - safeMargin;
        const maxY = window.screen.height - petSize - safeMargin;
        
        // 限制在安全范围内
        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));
        
        console.log(`宠物移动目标: (${Math.round(targetX)}, ${Math.round(targetY)})`);
        console.log(`边界范围: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
        
        this.moveTo(targetX, targetY, () => {
            this.showMessage('excited');
        });
    }
    
    // 启动兴奋状态下的移动定时器
    startExcitedMoveTimer() {
        this.clearExcitedMoveTimer();
        
        const checkAndMove = () => {
            if (this.state !== 'excited') {
                return; // 如果不在兴奋状态，停止检查
            }
            
            const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
            
            if (timeSinceLastInteraction >= 5000) { // 5秒没有交互
                console.log('5秒内没有交互，宠物主动移动到鼠标位置');
                this.moveToMouse();
                // 重置交互时间，避免频繁移动
                this.lastInteractionTime = Date.now();
            }
            
            // 继续检查（每秒检查一次）
            this.excitedMoveTimer = setTimeout(checkAndMove, 1000);
        };
        
        // 开始第一次检查
        this.excitedMoveTimer = setTimeout(checkAndMove, 1000);
    }
    
    // 清除兴奋状态移动定时器
    clearExcitedMoveTimer() {
        if (this.excitedMoveTimer) {
            clearTimeout(this.excitedMoveTimer);
            this.excitedMoveTimer = null;
        }
    }
    
    // ==================== 能量系统 ==================== //
    
    // 启动能量系统
    startEnergySystem() {
        console.log('能量系统已启动');
        this.lastEnergyUpdateTime = Date.now();
        this.startEnergyDecay();
    }
    
    // 开始能量衰减
    startEnergyDecay() {
        this.clearEnergyDecay();
        
        const updateEnergy = () => {
            if (!this.isEnergySystemActive) return;
            
            const now = Date.now();
            const deltaTime = now - this.lastEnergyUpdateTime;
            this.lastEnergyUpdateTime = now;
            
            // 根据当前状态获取对应的能量消耗率
            const currentDecayRate = this.energyDecayRates[this.state] || this.energyDecayRates.idle;
            
            if (currentDecayRate > 0 && this.energy > 0) {
                const energyLoss = currentDecayRate * deltaTime;
                this.energy = Math.max(0, this.energy - energyLoss);
                
                // 检查能量水平并相应处理
                this.checkEnergyLevel();
                
                // 更新显示
                this.updateMoodDisplay();
                
                // 每10秒输出一次日志，避免频繁输出
                if (Math.floor(now / 10000) !== Math.floor((now - deltaTime) / 10000)) {
                    console.log(`能量: ${this.energy.toFixed(1)}% (状态: ${this.state}, 消耗率: ${(currentDecayRate * 1000).toFixed(3)}%/s)`);
                }
            }
            
            // 继续下一次更新
            this.energyDecayTimer = setTimeout(updateEnergy, 1000); // 每秒1更新
        };
        
        updateEnergy();
    }
    
    // 清除能量衰减定时器
    clearEnergyDecay() {
        if (this.energyDecayTimer) {
            clearTimeout(this.energyDecayTimer);
            this.energyDecayTimer = null;
        }
    }
    
    // 检查能量水平并处理
    checkEnergyLevel() {
        if (this.energy <= 0) {
            // 能量耗尽，强制进入睡眠状态
            this.forceSleep();
        } else if (this.energy <= 5) {
            // 极低能量，频繁警告
            if (Math.random() < 0.5) { // 50%几率显示消息
                this.showMessage('energyLow');
            }
        } else if (this.energy <= 15) {
            // 低能量警告
            if (Math.random() < 0.2) { // 20%几率显示消息
                this.showMessage('energyLow');
            }
        } else if (this.energy <= 30) {
            // 中低能量状态
            if (Math.random() < 0.1) { // 10%几率显示消息
                this.showMessage('tired');
            }
        }
        
        // 能量低时影响行为表现
        this.adjustBehaviorByEnergy();
    }
    
    // 根据能量水平调整行为表现
    adjustBehaviorByEnergy() {
        const petSprite = this.pet.querySelector('.pet-sprite');
        if (!petSprite) return;
        
        // 清除之前的能量相关样式
        petSprite.classList.remove('low-energy', 'very-low-energy');
        
        if (this.energy <= 15) {
            // 极低能量：动作变慢，透明度降低
            petSprite.classList.add('very-low-energy');
        } else if (this.energy <= 30) {
            // 低能量：轻微动作变慢
            petSprite.classList.add('low-energy');
        }
    }
    
    // 强制进入睡眠状态
    forceSleep() {
        console.log('能量耗尽，强制进入睡眠状态');
        this.energy = 0;
        this.setState('sleeping');
        this.showMessage('sleeping');
        this.startSleepRecovery();
    }
    
    // 开始睡眠恢复
    startSleepRecovery() {
        this.clearSleepRecovery();
        
        const recoverEnergy = () => {
            if (this.state === 'sleeping') {
                this.energy = Math.min(100, this.energy + 1); // 每10秒恢复1%
                this.updateMoodDisplay();
                
                console.log(`睡眠恢复能量: ${this.energy.toFixed(1)}%`);
                
                // 如果能量恢复到一定程度，允许手动唤醒
                if (this.energy >= 20) {
                    console.log('能量恢复至 20%，可以手动唤醒');
                }
                
                // 继续恢复
                if (this.energy < 100) {
                    this.sleepRecoveryTimer = setTimeout(recoverEnergy, 10000); // 10秒恢复一次
                } else {
                    console.log('能量已满，结束睡眠恢复');
                }
            }
        };
        
        // 立即开始第一次恢复
        this.sleepRecoveryTimer = setTimeout(recoverEnergy, 10000);
    }
    
    // 清除睡眠恢复定时器
    clearSleepRecovery() {
        if (this.sleepRecoveryTimer) {
            clearTimeout(this.sleepRecoveryTimer);
            this.sleepRecoveryTimer = null;
        }
    }
    
    // 处理交互能量恢复
    handleEnergyInteraction() {
        const now = Date.now();
        const timeSinceLastInteraction = now - this.lastInteractionForEnergy;
        
        // 防止过度点击刷能量
        if (timeSinceLastInteraction >= this.minInteractionInterval) {
            const energyBefore = this.energy;
            this.energy = Math.min(100, this.energy + this.energyRecoveryAmount);
            this.lastInteractionForEnergy = now;
            
            // 如果能量有恢复，显示消息
            if (this.energy > energyBefore) {
                const recoveredAmount = this.energy - energyBefore;
                console.log(`交互恢复能量: +${recoveredAmount.toFixed(1)}% (剩余: ${this.energy.toFixed(1)}%)`);
                
                // 如果从低能量状态恢复，显示特殊消息
                if (energyBefore <= 30 && this.energy > 30) {
                    this.showMessage('energyRecovered');
                }
            }
            
            // 如果在睡眠状态且能量足够，可以唤醒
            if (this.state === 'sleeping' && this.energy >= 20) {
                this.wakeUpFromSleep();
            }
        } else {
            const remainingCooldown = Math.ceil((this.minInteractionInterval - timeSinceLastInteraction) / 1000);
            console.log(`交互太频繁，还需等待 ${remainingCooldown} 秒`);
            
            // 显示冷却提示
            if (Math.random() < 0.3) {
                this.showMessage('idle');
            }
        }
    }
    
    // 从睡眠中唤醒
    wakeUpFromSleep() {
        if (this.state === 'sleeping' && this.energy >= 20) {
            console.log('从睡眠中唤醒');
            this.clearSleepRecovery();
            this.setState('idle');
            this.showMessage('energyRecovered');
        }
    }
    
    // 计算移动能量消耗
    calculateMoveEnergyCost(distance) {
        // 根据距离计算能量消耗，距离越远消耗越多
        const baseDistance = 200; // 基础距离（像素）
        const distanceRatio = Math.min(distance / baseDistance, 3); // 最多3倍基础消耗
        const energyCost = this.moveEnergyCost + (this.maxMoveEnergyCost - this.moveEnergyCost) * (distanceRatio - 1) / 2;
        
        return Math.min(this.maxMoveEnergyCost, Math.max(this.moveEnergyCost, energyCost));
    }
    
    // 消耗移动能量
    consumeEnergyForMovement(energyCost) {
        this.energy = Math.max(0, this.energy - energyCost);
        console.log(`移动消耗能量: ${energyCost.toFixed(1)}%, 剩余能量: ${this.energy.toFixed(1)}%`);
        
        // 更新显示
        this.updateMoodDisplay();
        
        // 检查能量水平
        this.checkEnergyLevel();
    }
    
    // ==================== 能量系统结束 ==================== //
    
    // 清理方法（用于组件销毁）
    destroy() {
        // 清理能量系统
        this.isEnergySystemActive = false;
        this.clearEnergyDecay();
        this.clearSleepRecovery();
        this.clearExcitedMoveTimer();
        
        // 清理拖拽系统
        if (this.dragSystem) {
            this.dragSystem.destroy();
            this.dragSystem = null;
        }
        
        // 清理DOM引用
        this.pet = null;
        this.container = null;
        this.statusText = null;
        this.moodFill = null;
        this.energyFill = null;
        this.speechBubble = null;
        this.speechText = null;
        this.sleepIndicator = null;
        
        console.log('桌面宠物系统已清理');
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