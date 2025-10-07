# 🎮 桌面宠物前端

基于 Electron 的桌面宠物客户端，提供可爱的桌面陪伴体验。

[![Electron](https://img.shields.io/badge/Electron-28.0.0-blue?logo=electron)](https://www.electronjs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)

## ✨ 功能特性

### 🐱 桌面宠物
- **桌面悬浮**：窗口始终在桌面最顶层，不遮挡工作
- **透明窗口**：无边框透明窗口，完美融入桌面
- **拖拽移动**：可随意拖动宠物位置
- **动画系统**：丰富的动画效果（待机、行走、互动等）
- **系统托盘**：最小化到系统托盘，不占用任务栏

### 💬 智能对话
- **AI 聊天**：接入后端 AI 服务，智能对话
- **上下文记忆**：记住对话历史，连贯交流
- **个性化回复**：基于用户画像定制回复
- **表情反馈**：根据对话内容展示不同表情

### 🎨 界面设计
- **现代 UI**：简洁美观的聊天界面
- **响应式布局**：自适应不同屏幕尺寸
- **主题支持**：支持亮色/暗色主题（规划中）
- **动画过渡**：流畅的页面切换效果

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 16.0.0 (推荐 18.x LTS)
- **npm**: >= 8.0.0
- **操作系统**: Windows 10/11, macOS 10.13+, Linux

### 安装步骤

#### 1. 安装依赖

```bash
# 安装项目依赖
npm install
```

#### 2. 配置后端地址

编辑 `scripts/pet-chat.js`，确保后端 API 地址正确：

```javascript
// 默认配置
const API_URL = 'http://localhost:3000';
```

#### 3. 启动开发模式

```bash
# 启动 Electron 应用（开发模式）
npm start
```

#### 4. 打包应用

```bash
# 打包成可执行文件
npm run build

# Windows 打包
npm run build:win

# macOS 打包
npm run build:mac

# Linux 打包
npm run build:linux
```

打包后的文件在 `dist/` 目录下。

## 📁 项目结构

```
desktop-pet/
├── main.js                    # Electron 主进程
├── index.html                 # 宠物主界面
├── chat.html                  # 聊天窗口
├── package.json               # 项目配置
├── assets/                    # 静态资源
│   ├── icon.png              # 应用图标
│   └── icon.icotmp           # Windows 图标
├── scripts/                   # 前端脚本
│   ├── pet-animation-system.js   # 动画系统
│   ├── pet-behavior.js           # 行为逻辑
│   ├── pet-chat.js               # 聊天功能
│   ├── pet-state-manager.js      # 状态管理
│   ├── pet-ui.js                 # UI 交互
│   └── pet-voice.js              # 语音功能（规划中）
└── styles/                    # 样式文件
    ├── pet.css               # 宠物样式
    └── chat.css              # 聊天样式
```

## 🎯 核心功能详解

### 窗口管理

**主窗口配置** (`main.js`):
```javascript
const mainWindow = new BrowserWindow({
  width: 200,
  height: 200,
  transparent: true,        // 透明窗口
  frame: false,            // 无边框
  alwaysOnTop: true,       // 始终置顶
  resizable: false,        // 禁止调整大小
  skipTaskbar: true,       // 不显示在任务栏
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});
```

**聊天窗口配置**:
```javascript
const chatWindow = new BrowserWindow({
  width: 400,
  height: 600,
  frame: true,             // 有边框
  alwaysOnTop: false,      // 不置顶
  parent: mainWindow,      // 父窗口
  modal: false
});
```

### 宠物动画系统

支持多种动画状态：
- **idle**: 待机动画
- **walk**: 行走动画
- **happy**: 开心动画
- **sad**: 难过动画
- **sleep**: 睡觉动画

动画配置示例：
```javascript
const animations = {
  idle: {
    frames: ['idle1.png', 'idle2.png', 'idle3.png'],
    duration: 2000,
    loop: true
  },
  walk: {
    frames: ['walk1.png', 'walk2.png', 'walk3.png'],
    duration: 1000,
    loop: true
  }
};
```

### 聊天功能

**发送消息**:
```javascript
async function sendMessage(message) {
  const response = await fetch(`${API_URL}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      user_id: userId  // 自动生成或读取本地
    })
  });
  
  const data = await response.json();
  return data.reply;
}
```

**用户ID管理**:
- 首次使用自动生成唯一ID
- 存储在本地，保持用户画像连续性
- 支持多用户切换（规划中）

## ⚙️ 配置选项

### package.json 配置

```json
{
  "name": "desktop-pet",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.desktop.pet",
    "productName": "桌面宠物",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    }
  }
}
```

### Electron Builder 配置

支持的打包格式：
- **Windows**: NSIS 安装包 (.exe)
- **macOS**: DMG 镜像 (.dmg)
- **Linux**: AppImage (.AppImage)

## 🔧 开发指南

### 调试技巧

1. **打开开发者工具**:
```javascript
// 在 main.js 中添加
mainWindow.webContents.openDevTools();
```

2. **查看日志**:
```bash
# 在终端查看 Electron 日志
npm start
```

3. **热重载**（需要安装 electron-reload）:
```javascript
require('electron-reload')(__dirname);
```

### 添加新动画

1. 准备动画帧图片
2. 在 `pet-animation-system.js` 中注册动画
3. 在合适的时机触发动画

```javascript
// 注册动画
registerAnimation('custom', {
  frames: ['custom1.png', 'custom2.png'],
  duration: 1500,
  loop: false
});

// 播放动画
playAnimation('custom');
```

### 与后端集成

确保后端服务运行在正确端口，修改 `scripts/pet-chat.js`:

```javascript
const API_URL = process.env.API_URL || 'http://localhost:3000';
```

## 🐛 故障排除

### 常见问题

#### Q: Electron 应用启动失败？

**A:** 检查 Node.js 版本和依赖安装：
```bash
node --version  # 应该 >= 16.0.0
npm install     # 重新安装依赖
```

#### Q: 窗口不透明/有白边？

**A:** 确保 CSS 设置了透明背景：
```css
body {
  background: transparent;
  -webkit-app-region: drag;  /* 允许拖动 */
}
```

#### Q: 无法连接后端 API？

**A:** 
1. 确认后端服务已启动（http://localhost:3000/health）
2. 检查防火墙是否阻止了连接
3. 查看浏览器控制台的网络请求错误

#### Q: 打包后应用无法运行？

**A:**
1. 检查 `package.json` 中的 `main` 字段是否正确
2. 确认所有依赖都在 `dependencies` 中（而非 `devDependencies`）
3. 查看打包日志中的错误信息

### 性能优化

- **减少动画帧率**：降低 CPU 使用
- **懒加载资源**：按需加载图片和脚本
- **节流处理**：限制高频事件（如鼠标移动）的处理频率

```javascript
// 节流函数示例
function throttle(func, delay) {
  let timer = null;
  return function(...args) {
    if (!timer) {
      timer = setTimeout(() => {
        func.apply(this, args);
        timer = null;
      }, delay);
    }
  };
}
```

## 🤝 集成说明

### 完整系统架构

```
┌─────────────┐       ┌──────────────┐       ┌──────────┐
│  桌面宠物    │  HTTP  │  后端服务     │  TCP  │  Redis   │
│  (Electron)  │ ────> │  (FastAPI)   │ ────> │          │
└─────────────┘       └──────────────┘       └──────────┘
                            ▲
                            │ HTTP
                            ▼
                      ┌──────────────┐
                      │  管理系统     │
                      │  (Web)       │
                      └──────────────┘
```

### 启动顺序

1. **启动 Redis**（如果未运行）
   ```bash
   redis-server
   ```

2. **启动后端服务**（端口 3000）
   ```bash
   cd backend-python
   uvicorn main:app --port 3000
   ```

3. **启动桌面宠物**
   ```bash
   npm start
   ```

4. **（可选）启动管理系统**（端口 8080）
   ```bash
   cd desktop-pet-admin/backend
   python main.py
   ```

## 📄 许可证

MIT License

## 📞 技术支持

- **问题反馈**: [GitHub Issues](https://github.com/your-repo/desktop-pet/issues)
- **功能建议**: 欢迎提交 Pull Request

---

**让可爱的桌面宠物陪伴你的每一天！** 🐱✨

