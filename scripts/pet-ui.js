// UI交互和右键菜单控制
class PetUI {
    constructor() {
        this.contextMenu = document.getElementById('context-menu');
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
    }
    
    setupContextMenu() {
        // 右键显示菜单
        document.addEventListener('contextmenu', (e) => {
            console.log('右键事件被触发', e.target, e.clientX, e.clientY);
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });
        
        // 点击其他地方隐藏菜单（使用捕获阶段避免事件冲突）
        document.addEventListener('click', (e) => {
            // 延迟检查，确保右键事件先处理
            setTimeout(() => {
                if (this.contextMenu.style.display === 'block' && 
                    !this.contextMenu.contains(e.target)) {
                    this.hideContextMenu();
                }
            }, 50);
        }, true); // 使用捕获阶段
        
        // 点击菜单项时也要关闭菜单
        this.contextMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            // 如果点击的是菜单项（li元素），则关闭菜单
            if (e.target.tagName === 'LI' && !e.target.classList.contains('separator')) {
                console.log('菜单项被点击:', e.target.textContent);
                setTimeout(() => {
                    this.hideContextMenu();
                }, 100); // 略微延迟，让点击事件先执行
            }
        });
        
        // ESC键隐藏菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
            }
        });
        
        // 鼠标离开窗口时也关闭菜单
        document.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (this.contextMenu.style.display === 'block') {
                    this.hideContextMenu();
                }
            }, 1000); // 1秒后自动关闭
        });
    }
    
    setupKeyboardShortcuts() {
        // 已禁用快捷键操作
        // 保留该方法以免报错，但不添加任何事件监听器
    }
    
    showContextMenu(x, y) {
        console.log('显示右键菜单在位置:', x, y);
        
        // 首先隐藏任何已显示的菜单
        this.contextMenu.style.display = 'none';
        
        // 重置样式
        this.contextMenu.style.left = '0px';
        this.contextMenu.style.top = '0px';
        this.contextMenu.style.opacity = '1';
        this.contextMenu.style.transform = 'scale(1)';
        this.contextMenu.style.visibility = 'visible';
        
        // 显示菜单以获取实际尺寸
        this.contextMenu.style.display = 'block';
        
        // 获取菜单尺寸
        const menuRect = this.contextMenu.getBoundingClientRect();
        
        // 计算最佳位置
        let menuX = x;
        let menuY = y;
        
        // 简化边界检测，确保菜单不会超出屏幕
        const maxX = window.innerWidth - menuRect.width - 10;
        const maxY = window.innerHeight - menuRect.height - 10;
        
        if (menuX > maxX) {
            menuX = Math.max(0, x - menuRect.width);
        }
        
        if (menuY > maxY) {
            menuY = Math.max(0, y - menuRect.height);
        }
        
        // 设置最终位置
        this.contextMenu.style.left = `${menuX}px`;
        this.contextMenu.style.top = `${menuY}px`;
        
        console.log('菜单最终位置:', menuX, menuY, '菜单尺寸:', menuRect.width, menuRect.height);
        
        // 显示动画
        this.contextMenu.style.opacity = '0';
        this.contextMenu.style.transform = 'scale(0.9)';
        this.contextMenu.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        // 使用requestAnimationFrame确保动画正常播放
        requestAnimationFrame(() => {
            this.contextMenu.style.opacity = '1';
            this.contextMenu.style.transform = 'scale(1)';
        });
    }
    
    hideContextMenu() {
        // 检查菜单是否正在显示
        if (this.contextMenu.style.display === 'none' || 
            this.contextMenu.style.opacity === '0') {
            return; // 已经隐藏或正在隐藏
        }
        
        this.contextMenu.style.opacity = '0';
        this.contextMenu.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            this.contextMenu.style.display = 'none';
            // 重置样式以便下次显示
            this.contextMenu.style.transform = 'scale(1)';
        }, 200);
    }
}

// 菜单功能函数（已移除喂食和玩耍功能）

function petSleep() {
    if (window.desktopPet) {
        window.desktopPet.sleep();
        showNotification('😴 宠物开始休息！');
    }
}

function switchToSleeping() {
    if (window.desktopPet) {
        window.desktopPet.setState('sleeping');
        showNotification('😴 切换到睡觉状态');
    }
}

function switchToIdle() {
    if (window.desktopPet) {
        window.desktopPet.setState('idle');
        showNotification('💭 切换到待机状态');
    }
}

function switchToExcited() {
    if (window.desktopPet) {
        window.desktopPet.setState('excited');
        showNotification('🎉 切换到兴奋状态');
    }
}

function showSettings() {
    if (window.desktopPet) {
        const energy = window.desktopPet.energy;
        const mood = window.desktopPet.mood;
        const state = window.desktopPet.state;
        
        showNotification(`📊 状态: ${state} | 能量: ${Math.round(energy)}% | 心情: ${Math.round(mood)}%`, 5000);
    } else {
        showNotification('⚙️ 设置功能开发中...');
    }
}

// 唤醒宠物功能
function wakeUpPet() {
    if (window.desktopPet) {
        if (window.desktopPet.state === 'sleeping') {
            window.desktopPet.wakeUpFromSleep();
            showNotification('🐱 尝试唤醒宠物...');
        } else {
            showNotification('😊 宠物已经醒着呢！');
        }
    }
}

// 查看能量状态
function checkEnergyStatus() {
    if (window.desktopPet) {
        const energy = window.desktopPet.energy;
        const state = window.desktopPet.state;
        const decayRate = window.desktopPet.energyDecayRates[state] || 0;
        const decayRatePerMinute = (decayRate * 60 * 1000).toFixed(1);
        
        let statusMessage = '';
        let timeToEmpty = '';
        
        if (energy <= 0) {
            statusMessage = '🔴 能量耗尽！必须睡觉恢复';
        } else if (energy <= 5) {
            statusMessage = '🔴 能量极低，即将耗尽';
        } else if (energy <= 15) {
            statusMessage = '🟠 能量很低，需要休息';
        } else if (energy <= 30) {
            statusMessage = '🟡 能量低，建议休息';
        } else if (energy <= 60) {
            statusMessage = '🟡 能量中等';
        } else {
            statusMessage = '🟢 能量充满！';
        }
        
        // 计算剩余时间
        if (decayRate > 0 && energy > 0) {
            const minutesToEmpty = energy / (decayRate * 60 * 1000);
            const hours = Math.floor(minutesToEmpty / 60);
            const minutes = Math.floor(minutesToEmpty % 60);
            
            if (hours > 0) {
                timeToEmpty = ` (剩余: ${hours}小时${minutes}分钟)`;
            } else {
                timeToEmpty = ` (剩余: ${minutes}分钟)`;
            }
        }
        
        const consumptionInfo = decayRate > 0 ? `\n消耗率: ${decayRatePerMinute}%/分钟${timeToEmpty}` : '';
        
        showNotification(`⚡ 能量: ${Math.round(energy)}%\n${statusMessage}${consumptionInfo}`, 6000);
    }
}

function hidePet() {
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        console.log('发送隐藏信号到主进程');
        ipcRenderer.send('hide-window');
        showNotification('👁️ 宠物已隐藏，可从系统托盘恢复！');
    } else {
        console.error('require 不可用，无法隐藏窗口');
    }
}

function quitApp() {
    const confirmed = confirm('确定要退出桌面宠物吗？');
    if (confirmed) {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('quit-app');
        }
    }
}

function hideContextMenu() {
    const ui = window.petUI;
    if (ui) {
        ui.hideContextMenu();
    }
}

// 通知系统
function showNotification(message, duration = 3000) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 10001;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: none;
        max-width: 200px;
        word-break: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// 双击切换宠物状态
function handleDoubleClick() {
    if (window.desktopPet) {
        const currentState = window.desktopPet.state;
        
        switch(currentState) {
            case 'idle':
                window.desktopPet.setState('excited');
                break;
            case 'excited':
                window.desktopPet.setState('idle');
                break;
            case 'sleeping':
                window.desktopPet.setState('idle');
                window.desktopPet.showMessage('greeting');
                break;
        }
    }
}

// 窗口焦点管理
let windowFocused = true;

window.addEventListener('focus', () => {
    windowFocused = true;
    if (window.desktopPet && Math.random() < 0.3) {
        setTimeout(() => {
            window.desktopPet.showMessage('greeting');
        }, 500);
    }
});

window.addEventListener('blur', () => {
    windowFocused = false;
});

// 性能优化：当窗口失去焦点时减少动画频率
setInterval(() => {
    if (!windowFocused) {
        // 可以在这里添加性能优化逻辑
    }
}, 5000);

// 初始化UI
let petUI;

document.addEventListener('DOMContentLoaded', () => {
    petUI = new PetUI();
    
    // 为宠物添加双击事件
    const pet = document.getElementById('pet');
    let clickCount = 0;
    pet.addEventListener('click', () => {
        clickCount++;
        setTimeout(() => {
            if (clickCount === 2) {
                handleDoubleClick();
            }
            clickCount = 0;
        }, 300);
    });
    
    // 显示欢迎提示
    setTimeout(() => {
        showNotification('🎉 桌面宠物已启动！右键查看功能菜单', 4000);
    }, 2000);
    
    // 显示操作提示
    setTimeout(() => {
        showNotification('📚 提示：点击互动，右键切换状态', 4000);
    }, 7000);
});

// 全局暴露UI实例
window.petUI = petUI;