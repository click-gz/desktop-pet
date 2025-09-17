const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

function createWindow() {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 250,
    height: 250,
    frame: false, // 无边框窗口
    transparent: true, // 透明背景
    alwaysOnTop: true, // 始终在最前面
    resizable: false, // 不可调整大小
    skipTaskbar: true, // 不在任务栏显示
    show: false, // 初始不显示，避免闪烁
    hasShadow: false, // 去除窗口阴影
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false, // 允许加载本地资源
      experimentalFeatures: true
    }
  });

  // 加载宠物界面
  mainWindow.loadFile('index.html');

  // 等待页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 设置窗口可点击穿透（可选）
  mainWindow.setIgnoreMouseEvents(false);

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建系统托盘
  createTray();
}

function createTray() {
  // 创建托盘图标
  try {
    const iconPath = path.join(__dirname, 'assets', 'icon.ico');
    const pngIconPath = path.join(__dirname, 'assets', 'icon.png');
    console.log('尝试加载托盘图标:', iconPath);
    
    let trayIcon = null;
    
    // 首先尝试加载 ICO 文件
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        trayIcon = icon;
        console.log('ICO 图标加载成功');
      }
    }
    
    // 如果 ICO 失败，尝试加载 PNG 文件
    if (!trayIcon && fs.existsSync(pngIconPath)) {
      const pngIcon = nativeImage.createFromPath(pngIconPath);
      if (!pngIcon.isEmpty()) {
        trayIcon = pngIcon;
        console.log('PNG 图标加载成功');
      }
    }
    
    // 如果两个文件都失败，创建一个程序化生成的图标
    if (!trayIcon) {
      console.log('图标文件加载失败，创建程序化图标');
      // 创建一个 16x16 的简单图标
      const canvas = nativeImage.createEmpty();
      // 尝试创建一个基本的系统兼容图标
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgxCwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGw==');
      if (trayIcon.isEmpty()) {
        // 最后的备用方案：创建一个完全空的图标
        trayIcon = nativeImage.createEmpty();
      }
    }
    
    // 创建托盘
    tray = new Tray(trayIcon);
    console.log('托盘创建成功');
  } catch (error) {
    console.log('托盘图标加载失败，使用备用方案:', error.message);
    // 备用方案：创建一个简单的图标
    try {
      // 在Windows上使用系统默认图标
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    } catch (fallbackError) {
      console.error('无法创建托盘图标:', fallbackError.message);
      return; // 如果无法创建托盘，直接返回
    }
  }
  
  // 只有成功创建托盘时才设置菜单和事件
  if (!tray) {
    console.log('托盘创建失败，跳过托盘功能');
    return;
  }
  
  // 设置托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示宠物',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus(); // 确保窗口获得焦点
          console.log('从托盘显示窗口');
        }
      }
    },
    {
      label: '隐藏宠物',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
          console.log('从托盘隐藏窗口');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('桌面宠物');
  
  // 双击托盘图标显示/隐藏窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
        console.log('双击托盘隐藏窗口');
      } else {
        mainWindow.show();
        mainWindow.focus();
        console.log('双击托盘显示窗口');
      }
    }
  });
  
  // 单击托盘图标也可以显示窗口
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      console.log('单击托盘显示窗口');
    }
  });
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(createWindow);

// 当所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 当应用激活时创建窗口 (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 通信处理
let moveThrottleTimeout = null;
let pendingPosition = null;
let lastSetPosition = null;

ipcMain.on('move-window', (event, x, y) => {
  if (mainWindow) {
    // 检查是否为重复位置，避免不必要的移动
    if (lastSetPosition && lastSetPosition.x === x && lastSetPosition.y === y) {
      return;
    }
    
    // 存储最新的位置
    pendingPosition = { x, y };
    
    // 使用节流限制移动频率
    if (!moveThrottleTimeout) {
      moveThrottleTimeout = setTimeout(() => {
        if (pendingPosition && mainWindow) {
          mainWindow.setPosition(pendingPosition.x, pendingPosition.y);
          lastSetPosition = { x: pendingPosition.x, y: pendingPosition.y };
          pendingPosition = null;
        }
        moveThrottleTimeout = null;
      }, 16); // 约60fps
    }
  }
});

ipcMain.on('quit-app', () => {
  console.log('接收到退出信号');
  app.quit();
});

// 获取当前窗口位置
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

// 获取全局鼠标位置
ipcMain.handle('get-cursor-position', () => {
  try {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  } catch (error) {
    console.error('获取鼠标位置失败:', error);
    return null;
  }
});

// 隐藏窗口
ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
    console.log('接收到隐藏窗口信号，窗口已隐藏');
  }
});