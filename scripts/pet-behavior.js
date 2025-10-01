// 宠物行为系统 - 使用新的状态管理和动画系统
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
        
        // 初始化状态管理器
        this.stateManager = new PetStateManager();
        
        // 初始化动画系统
        this.animationSystem = new PetAnimationSystem(this.pet);
        
        // 定时器管理
        this.timers = {
            energyDecay: null,
            sleepRecovery: null,
            excitedMove: null
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMouseTracking();
        this.initializePosition();
        this.setupStateListeners();
        this.updateMoodDisplay();
        this.startEnergySystem();
        
        // 显示欢迎消息
        setTimeout(() => {
            this.showMessage('greeting');
        }, 1000);
    }
    
    // 设置状态监听器
    setupStateListeners() {
        // 监听状态变化
        this.stateManager.subscribe('currentState', (newState, oldState) => {
            this.onStateChange(newState, oldState);
        });
        
        // 监听能量变化
        this.stateManager.subscribe('energy', (newEnergy, oldEnergy) => {
            this.onEnergyChange(newEnergy, oldEnergy);
        });
        
        // 监听心情变化
        this.stateManager.subscribe('mood', (newMood) => {
            this.updateMoodDisplay();
        });
        
        // 监听拖拽状态
        this.stateManager.subscribe('isDragging', (isDragging) => {
            this.animationSystem.setDragAnimation(isDragging);
        });
    }
    
    // 状态变化处理
    onStateChange(newState, oldState) {
        console.log(`宠物状态改变: ${oldState} -> ${newState}`);
        
        // 更新CSS类
        this.pet.className = `pet ${newState}`;
        
        // 更新动画
        this.animationSystem.setStateAnimation(newState);
        
        // 控制睡眠指示器
        if (this.sleepIndicator) {
            if (newState === 'sleeping') {
                this.sleepIndicator.style.display = 'block';
                this.startSleepRecovery();
            } else {
                this.sleepIndicator.style.display = 'none';
                this.clearSleepRecovery();
            }
        }
        
        // 处理兴奋状态的特殊行为
        if (newState === 'excited') {
            this.startExcitedMoveTimer();
        } else {
            this.clearExcitedMoveTimer();
        }
        
        // 显示状态切换通知
        this.showStateChangeNotification(oldState, newState);
        
        // 更新状态显示
        this.updateStatusDisplay();
        
        // 显示对应状态的消息
        setTimeout(() => {
            this.showMessage(newState);
        }, 500);
    }
    
    // 能量变化处理
    onEnergyChange(newEnergy, oldEnergy) {
        // 更新能量显示
        this.updateMoodDisplay();
        
        // 检查能量水平
        this.checkEnergyLevel();
        
        // 更新能量动画
        this.animationSystem.setEnergyAnimation(newEnergy);
        
        // 如果能量恢复，播放恢复动画
        if (newEnergy > oldEnergy && oldEnergy <= 30) {
            this.animationSystem.playEnergyRecovery();
        }
    }
    
    setupEventListeners() {
        // 点击交互
        this.pet.addEventListener('click', (e) => {
            e.preventDefault();
            const state = this.stateManager.getState();
            if (!state.isDragging) {
                this.interact();
            }
        });
        
        // 使用 Pointer Events + rAF 实现丝滑拖拽
        this.initPointerDragSystem();
        
        // 悬停显示状态
        this.pet.addEventListener('mouseenter', () => {
            const state = this.stateManager.getState();
            if (!state.isDragging) {
                this.updateStatusDisplay();
            }
        });
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
            
            // 更新状态管理器
            self.stateManager.updateState({
                isDragging: true,
                lastInteractionTime: Date.now()
            });
            
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
                const state = self.stateManager.getState();
                startWindow.x = state.position.x || 0;
                startWindow.y = state.position.y || 0;
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
                    // 更新状态管理器中的位置
                    self.stateManager.setStateValue('position', { x: pendingPos.x, y: pendingPos.y });
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
            
            // 更新状态管理器
            self.stateManager.updateState({
                isDragging: false
            });
            
            petEl.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 平滑恢复动画
            requestAnimationFrame(() => {
                petEl.style.transition = 'transform 0.2s ease-out';
                const sprite = petEl.querySelector('.pet-sprite');
                setTimeout(() => {
                    const state = self.stateManager.getState();
                    if (!state.isDragging && sprite) {
                        petEl.style.animation = '';
                        // 使用动画系统恢复状态动画
                        self.animationSystem.setStateAnimation(state.currentState);
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
                const state = self.stateManager.getState();
                if (state.isDragging) {
                    self.stateManager.updateState({ isDragging: false });
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
                this.stateManager.setStateValue('position', position);
                console.log('初始化宠物位置:', position);
            } catch (error) {
                console.error('获取窗口位置失败:', error);
                this.stateManager.setStateValue('position', { x: 100, y: 100 }); // 默认位置
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
            
            this.stateManager.setStateValue('mousePosition', { x: screenX, y: screenY });
            
            // 调试输出
            // console.log('鼠标屏幕坐标:', screenX, screenY);
        });
        
        // 尝试获取系统级鼠标位置（如果支持的话）
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                // 可以定期向主进程请求鼠标位置
                setInterval(() => {
                    const state = this.stateManager.getState();
                    if (state.currentState === 'excited') {
                        ipcRenderer.invoke('get-cursor-position').then(pos => {
                            if (pos) {
                                this.stateManager.setStateValue('mousePosition', { x: pos.x, y: pos.y });
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
        const currentState = this.stateManager.getState();
        
        // 睡眠状态特殊处理：只有能量足够才能唤醒
        if (currentState.currentState === 'sleeping' && newState !== 'sleeping') {
            if (currentState.energy < 20) {
                console.log('能量不足，无法从睡眠状态唤醒');
                this.showMessage('sleeping');
                return;
            } else {
                // 能量足够，允许唤醒
                this.clearSleepRecovery();
            }
        }
        
        // 如果能量为0且不是进入睡眠状态，强制进入睡眠
        if (currentState.energy <= 0 && newState !== 'sleeping') {
            console.log('能量耗尽，强制进入睡眠状态');
            this.forceSleep();
            return;
        }
        
        if (currentState.currentState !== newState) {
            // 清除之前的定时器
            this.clearExcitedMoveTimer();
            
            // 播放状态切换动画
            this.animationSystem.playStateTransition();
            
            // 更新状态管理器
            this.stateManager.setStateValue('currentState', newState);
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
        const currentState = this.stateManager.getState();
        
        // 更新心情
        const newMood = Math.min(100, currentState.mood + 10);
        this.stateManager.setStateValue('mood', newMood);
        
        // 能量系统交互
        this.handleEnergyInteraction();
        
        // 更新最后交互时间
        this.stateManager.setStateValue('lastInteractionTime', Date.now());
        
        this.setState('excited');
        this.showMessage('greeting');
    }
    
    // 已移除喂食和玩耍功能
    
    sleep() {
        const currentState = this.stateManager.getState();
        
        // 检查是否可以睡眠（只有在非强制睡眠时才检查）
        if (currentState.energy > 50) {
            console.log('能量还很充足，暂时不想睡觉');
            this.showMessage('idle');
            return;
        }
        
        this.setState('sleeping');
        this.showMessage('sleeping');
    }
    
    // 已移除随机交互和updateStats功能
    
    showMessage(type) {
        const messageConfig = this.stateManager.messageConfig;
        const messages = messageConfig[type] || messageConfig.idle;
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        this.speechText.textContent = message;
        this.speechBubble.style.display = 'block';
        
        // 3秒后隐藏消息
        setTimeout(() => {
            this.speechBubble.style.display = 'none';
        }, 3000);
    }
    
    updateStatusDisplay() {
        const state = this.stateManager.getState();
        const stateNames = {
            idle: '💭 待机中',
            excited: '🎉 兴奋中',
            sleeping: '😴 睡觉中'
        };
        
        const currentStateName = stateNames[state.currentState] || state.currentState;
        
        // 根据能量水平添加状态指示
        let energyIcon = '';
        let energyStatus = '';
        
        if (state.energy <= 5) {
            energyIcon = ' 🔴'; // 红色警告
            energyStatus = '(极低)';
        } else if (state.energy <= 15) {
            energyIcon = ' 🟠'; // 橙色警告
            energyStatus = '(很低)';
        } else if (state.energy <= 30) {
            energyIcon = ' 🟡'; // 黄色警告
            energyStatus = '(低)';
        } else if (state.energy <= 60) {
            energyIcon = ' 🟡'; // 黄色一般
            energyStatus = '';
        } else if (state.energy >= 80) {
            energyIcon = ' 🟢'; // 绿色充满
            energyStatus = '';
        }
        
        // 显示能量消耗率信息
        const energyConfig = this.stateManager.energyConfig;
        const currentDecayRate = energyConfig.decayRates[state.currentState] || 0;
        const decayRatePerMinute = (currentDecayRate * 60 * 1000).toFixed(1);
        const statusSuffix = currentDecayRate > 0 ? ` (-${decayRatePerMinute}%/min)` : '';
        
        this.statusText.textContent = `${currentStateName}${energyIcon} | 心情: ${Math.round(state.mood)}% | 能量: ${Math.round(state.energy)}%${energyStatus}${statusSuffix}`;
    }
    
    updateMoodDisplay() {
        const state = this.stateManager.getState();
        
        // 更新心情条
        this.moodFill.style.width = `${state.mood}%`;
        
        // 根据心情改变颜色
        if (state.mood > 70) {
            this.moodFill.style.background = 'linear-gradient(90deg, #48dbfb, #0abde3)';
        } else if (state.mood > 40) {
            this.moodFill.style.background = 'linear-gradient(90deg, #feca57, #ff9ff3)';
        } else {
            this.moodFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a24)';
        }
        
        // 更新能量条
        const energyFill = document.getElementById('energy-fill');
        if (energyFill) {
            energyFill.style.width = `${state.energy}%`;
            
            // 根据能量水平改变颜色
            if (state.energy > 70) {
                energyFill.style.background = 'linear-gradient(90deg, #4caf50, #66bb6a)';
            } else if (state.energy > 30) {
                energyFill.style.background = 'linear-gradient(90deg, #ffa726, #ffb74d)';
            } else if (state.energy > 10) {
                energyFill.style.background = 'linear-gradient(90deg, #ff7043, #ff8a65)';
            } else {
                energyFill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b7a)';
            }
        }
    }
    
    // 宠物移动接口函数
    moveTo(targetX, targetY, callback) {
        const state = this.stateManager.getState();
        
        if (state.isMoving) {
            console.log('宠物正在移动中，忽略新的移动请求');
            return;
        }
        
        // 检查能量是否足够移动
        if (state.energy < 3) {
            console.log('能量不足，无法移动');
            this.showMessage('energyLow');
            return;
        }
        
        // 计算移动距离和能量消耗
        const distance = Math.sqrt(Math.pow(targetX - state.position.x, 2) + Math.pow(targetY - state.position.y, 2));
        const energyCost = this.calculateMoveEnergyCost(distance);
        
        console.log(`准备移动距离: ${distance.toFixed(0)}px, 能量消耗: ${energyCost.toFixed(1)}%`);
        
        // 更新移动状态
        this.stateManager.updateState({ isMoving: true });
        console.log(`宠物开始移动到位置: (${targetX}, ${targetY})`);
        
        // 播放移动动画
        this.animationSystem.playMoveAnimation();
        
        // 使用 Electron 的 IPC 来移动窗口
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            
            const startX = state.position.x;
            const startY = state.position.y;
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
                this.stateManager.setStateValue('position', { x: currentX, y: currentY });
                
                if (currentStep < steps) {
                    setTimeout(moveStep, stepDelay);
                } else {
                    this.stateManager.updateState({ isMoving: false });
                    
                    // 移动完成后消耗能量
                    this.consumeEnergyForMovement(energyCost);
                    
                    console.log('宠物移动完成');
                    if (callback) callback();
                }
            };
            
            moveStep();
        } else {
            console.error('require 不可用，无法移动窗口');
            this.stateManager.updateState({ isMoving: false });
        }
    }
    
    // 移动到鼠标位置
    moveToMouse() {
        const state = this.stateManager.getState();
        const mousePos = state.mousePosition;
        
        if (!mousePos.x && !mousePos.y) {
            console.log('未检测到鼠标位置，使用当前窗口中心位置');
            // 如果没有鼠标位置，随机移动到屏幕的中心区域
            const centerX = window.screen.width / 2;
            const centerY = window.screen.height / 2;
            const randomOffsetX = (Math.random() - 0.5) * 200; // -100 到 100
            const randomOffsetY = (Math.random() - 0.5) * 200;
            
            this.stateManager.setStateValue('mousePosition', { 
                x: centerX + randomOffsetX, 
                y: centerY + randomOffsetY 
            });
        }
        
        const currentMousePos = this.stateManager.getState().mousePosition;
        console.log('当前鼠标位置:', currentMousePos.x, currentMousePos.y);
        console.log('屏幕尺寸:', window.screen.width, window.screen.height);
        
        // 计算鼠标附近的合适位置（避免完全覆盖鼠标）
        // 在鼠标周围100像素范围内随机选择位置
        const offsetRadius = 80; // 偏移半径
        const angle = Math.random() * 2 * Math.PI; // 随机角度
        const distance = Math.random() * offsetRadius + 20; // 20-100像素距离
        
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        
        let targetX = currentMousePos.x + offsetX;
        let targetY = currentMousePos.y + offsetY;
        
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
            const state = this.stateManager.getState();
            if (state.currentState !== 'excited') {
                return; // 如果不在兴奋状态，停止检查
            }
            
            const timeSinceLastInteraction = Date.now() - state.lastInteractionTime;
            
            if (timeSinceLastInteraction >= 5000) { // 5秒没有交互
                console.log('5秒内没有交互，宠物主动移动到鼠标位置');
                this.moveToMouse();
                // 重置交互时间，避免频繁移动
                this.stateManager.setStateValue('lastInteractionTime', Date.now());
            }
            
            // 继续检查（每秒检查一次）
            this.timers.excitedMove = setTimeout(checkAndMove, 1000);
        };
        
        // 开始第一次检查
        this.timers.excitedMove = setTimeout(checkAndMove, 1000);
    }
    
    // 清除兴奋状态移动定时器
    clearExcitedMoveTimer() {
        if (this.timers.excitedMove) {
            clearTimeout(this.timers.excitedMove);
            this.timers.excitedMove = null;
        }
    }
    
    // ==================== 能量系统 ==================== //
    
    // 启动能量系统
    startEnergySystem() {
        console.log('能量系统已启动');
        this.stateManager.setStateValue('lastEnergyUpdateTime', Date.now());
        this.startEnergyDecay();
    }
    
    // 开始能量衰减
    startEnergyDecay() {
        this.clearEnergyDecay();
        
        const updateEnergy = () => {
            const state = this.stateManager.getState();
            if (!state.isEnergySystemActive) return;
            
            const now = Date.now();
            const deltaTime = now - state.lastEnergyUpdateTime;
            this.stateManager.setStateValue('lastEnergyUpdateTime', now);
            
            // 根据当前状态获取对应的能量消耗率
            const energyConfig = this.stateManager.energyConfig;
            const currentDecayRate = energyConfig.decayRates[state.currentState] || energyConfig.decayRates.idle;
            
            if (currentDecayRate > 0 && state.energy > 0) {
                const energyLoss = currentDecayRate * deltaTime;
                const newEnergy = Math.max(0, state.energy - energyLoss);
                this.stateManager.setStateValue('energy', newEnergy);
                
                // 每10秒输出一次日志，避免频繁输出
                if (Math.floor(now / 10000) !== Math.floor((now - deltaTime) / 10000)) {
                    console.log(`能量: ${newEnergy.toFixed(1)}% (状态: ${state.currentState}, 消耗率: ${(currentDecayRate * 1000).toFixed(3)}%/s)`);
                }
            }
            
            // 继续下一次更新
            this.timers.energyDecay = setTimeout(updateEnergy, 1000); // 每秒1更新
        };
        
        updateEnergy();
    }
    
    // 清除能量衰减定时器
    clearEnergyDecay() {
        if (this.timers.energyDecay) {
            clearTimeout(this.timers.energyDecay);
            this.timers.energyDecay = null;
        }
    }
    
    // 检查能量水平并处理
    checkEnergyLevel() {
        const state = this.stateManager.getState();
        
        if (state.energy <= 0) {
            // 能量耗尽，强制进入睡眠状态
            this.forceSleep();
        } else if (state.energy <= 5) {
            // 极低能量，频繁警告
            if (Math.random() < 0.5) { // 50%几率显示消息
                this.showMessage('energyLow');
            }
        } else if (state.energy <= 15) {
            // 低能量警告
            if (Math.random() < 0.2) { // 20%几率显示消息
                this.showMessage('energyLow');
            }
        } else if (state.energy <= 30) {
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
        const state = this.stateManager.getState();
        const petSprite = this.pet.querySelector('.pet-sprite');
        if (!petSprite) return;
        
        // 清除之前的能量相关样式
        petSprite.classList.remove('low-energy', 'very-low-energy');
        
        if (state.energy <= 15) {
            // 极低能量：动作变慢，透明度降低
            petSprite.classList.add('very-low-energy');
        } else if (state.energy <= 30) {
            // 低能量：轻微动作变慢
            petSprite.classList.add('low-energy');
        }
    }
    
    // 强制进入睡眠状态
    forceSleep() {
        console.log('能量耗尽，强制进入睡眠状态');
        this.stateManager.setStateValue('energy', 0);
        this.setState('sleeping');
        this.showMessage('sleeping');
        this.startSleepRecovery();
    }
    
    // 开始睡眠恢复
    startSleepRecovery() {
        this.clearSleepRecovery();
        
        const recoverEnergy = () => {
            const state = this.stateManager.getState();
            if (state.currentState === 'sleeping') {
                const newEnergy = Math.min(100, state.energy + 1); // 每10秒恢复1%
                this.stateManager.setStateValue('energy', newEnergy);
                
                console.log(`睡眠恢复能量: ${newEnergy.toFixed(1)}%`);
                
                // 如果能量恢复到一定程度，允许手动唤醒
                if (newEnergy >= 20) {
                    console.log('能量恢复至 20%，可以手动唤醒');
                }
                
                // 继续恢复
                if (newEnergy < 100) {
                    this.timers.sleepRecovery = setTimeout(recoverEnergy, 10000); // 10秒恢复一次
                } else {
                    console.log('能量已满，结束睡眠恢复');
                }
            }
        };
        
        // 立即开始第一次恢复
        this.timers.sleepRecovery = setTimeout(recoverEnergy, 10000);
    }
    
    // 清除睡眠恢复定时器
    clearSleepRecovery() {
        if (this.timers.sleepRecovery) {
            clearTimeout(this.timers.sleepRecovery);
            this.timers.sleepRecovery = null;
        }
    }
    
    // 处理交互能量恢复
    handleEnergyInteraction() {
        const state = this.stateManager.getState();
        const now = Date.now();
        const timeSinceLastInteraction = now - state.lastInteractionForEnergy;
        
        const energyConfig = this.stateManager.energyConfig;
        
        // 防止过度点击刷能量
        if (timeSinceLastInteraction >= energyConfig.minInteractionInterval) {
            const energyBefore = state.energy;
            const newEnergy = Math.min(100, state.energy + energyConfig.recoveryAmount);
            this.stateManager.updateState({
                energy: newEnergy,
                lastInteractionForEnergy: now
            });
            
            // 如果能量有恢复，显示消息
            if (newEnergy > energyBefore) {
                const recoveredAmount = newEnergy - energyBefore;
                console.log(`交互恢复能量: +${recoveredAmount.toFixed(1)}% (剩余: ${newEnergy.toFixed(1)}%)`);
                
                // 如果从低能量状态恢复，显示特殊消息
                if (energyBefore <= 30 && newEnergy > 30) {
                    this.showMessage('energyRecovered');
                }
            }
            
            // 如果在睡眠状态且能量足够，可以唤醒
            if (state.currentState === 'sleeping' && newEnergy >= 20) {
                this.wakeUpFromSleep();
            }
        } else {
            const remainingCooldown = Math.ceil((energyConfig.minInteractionInterval - timeSinceLastInteraction) / 1000);
            console.log(`交互太频繁，还需等待 ${remainingCooldown} 秒`);
            
            // 显示冷却提示
            if (Math.random() < 0.3) {
                this.showMessage('idle');
            }
        }
    }
    
    // 从睡眠中唤醒
    wakeUpFromSleep() {
        const state = this.stateManager.getState();
        if (state.currentState === 'sleeping' && state.energy >= 20) {
            console.log('从睡眠中唤醒');
            this.clearSleepRecovery();
            this.setState('idle');
            this.showMessage('energyRecovered');
        }
    }
    
    // 计算移动能量消耗
    calculateMoveEnergyCost(distance) {
        const energyConfig = this.stateManager.energyConfig;
        
        // 根据距离计算能量消耗，距离越远消耗越多
        const baseDistance = 200; // 基础距离（像素）
        const distanceRatio = Math.min(distance / baseDistance, 3); // 最多3倍基础消耗
        const energyCost = energyConfig.moveEnergyCost + (energyConfig.maxMoveEnergyCost - energyConfig.moveEnergyCost) * (distanceRatio - 1) / 2;
        
        return Math.min(energyConfig.maxMoveEnergyCost, Math.max(energyConfig.moveEnergyCost, energyCost));
    }
    
    // 消耗移动能量
    consumeEnergyForMovement(energyCost) {
        const state = this.stateManager.getState();
        const newEnergy = Math.max(0, state.energy - energyCost);
        this.stateManager.setStateValue('energy', newEnergy);
        
        console.log(`移动消耗能量: ${energyCost.toFixed(1)}%, 剩余能量: ${newEnergy.toFixed(1)}%`);
        
        // 检查能量水平
        this.checkEnergyLevel();
    }
    
    // ==================== 能量系统结束 ==================== //
    
    // 清理方法（用于组件销毁）
    destroy() {
        // 清理能量系统
        this.stateManager.setStateValue('isEnergySystemActive', false);
        this.clearEnergyDecay();
        this.clearSleepRecovery();
        this.clearExcitedMoveTimer();
        
        // 清理动画系统
        if (this.animationSystem) {
            this.animationSystem.destroy();
            this.animationSystem = null;
        }
        
        // 清理状态管理器
        if (this.stateManager) {
            this.stateManager.destroy();
            this.stateManager = null;
        }
        
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