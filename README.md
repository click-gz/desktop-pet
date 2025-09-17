# 🐱 桌面宠物 (Desktop Pet)

[![Electron](https://img.shields.io/badge/Electron-27.0.0-blue?logo=electron)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.19.0-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

一个简单可爱的跨平台桌面宠物应用，使用 Electron 构建。陪伴你的工作时光！

## ✨ 功能特点

### 🎮 基础交互
- **三种状态**：待机、兴奋、睡觉
- **状态切换**：点击宠物或右键菜单切换状态
- **双击互动**：双击宠物根据当前状态智能切换
- **流畅拖拽**：支持平滑的窗口拖拽移动

### 🎨 视觉效果
- **可爱外观**：圆形彩色宠物精灵
- **呼吸动画**：自然的呼吸效果
- **状态显示**：心情条和状态文字显示
- **对话气泡**：宠物会说不同的话

### 🖥️ 桌面集成
- **始终置顶**：在所有窗口前端显示
- **透明背景**：无边框透明窗口，融入桌面
- **系统托盘**：集成系统托盘，便于管理
- **右键菜单**：完整的功能菜单

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 16.0.0 (推荐 22.19.0)
- **npm**: >= 7.0.0
- **操作系统**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/desktop-pet.git
cd desktop-pet
```

2. **安装依赖**
```bash
npm install
```

3. **运行应用**
```bash
npm start
```

## 📚 使用指南

### 基本操作

| 操作 | 描述 | 效果 |
|------|------|------|
| 单击宠物 | 基础互动 | 随机显示对话气泡 |
| 双击宠物 | 智能切换 | 根据当前状态自动切换 |
| 右键宠物 | 打开菜单 | 显示状态切换菜单 |
| 拖拽宠物 | 移动位置 | 平滑拖动宠物到新位置 |
| 悬停宠物 | 查看状态 | 显示详细状态信息 |

### 宠物状态详解

#### 💭 待机状态 (Idle)
- **特征**: 平静的呼吸动画，红色外观
- **行为**: 随机显示对话，等待互动
- **转换**: 可切换到兴奋或睡觉状态

#### 🎉 兴奋状态 (Excited)
- **特征**: 快速动画，黄色外观
- **行为**: 表达开心情绪，显示兴奋消息
- **触发**: 点击互动、双击切换时

#### 😴 睡觉状态 (Sleeping)
- **特征**: 缓慢呼吸，显示"ZZZ..."
- **行为**: 表示休息状态，不响应交互
- **触发**: 手动切换或双击唤醒

### 右键菜单功能

- **💭 待机状态** - 切换到待机模式
- **🎉 兴奋状态** - 切换到兴奋模式
- **😴 睡觉状态** - 切换到睡觉模式
- **⚙️ 设置** - (开发中)
- **👁️ 隐藏** - 隐藏宠物窗口
- **❌ 退出** - 退出应用

### 状态显示

- **心情条**: 显示宠物当前心情，颜色从红色到蓝色
- **状态文字**: 显示当前状态、心情百分比和能量百分比

## 🛠️ 开发指南

### 项目结构

```
desktop-pet/
├── package.json          # 项目配置和依赖
├── main.js              # Electron 主进程
├── index.html           # 宠物界面HTML
├── README.md            # 项目文档
├── styles/              # 样式文件
│   └── pet.css         # 宠物样式
└── scripts/             # JavaScript文件
    ├── pet-behavior.js  # 宠物行为逻辑
    └── pet-ui.js       # 用户界面交互
```

### 开发命令

```bash
# 开发模式（带调试工具）
npm run dev

# 生产模式运行
npm start

# 构建可分发版本
npm run build
```

### 核心架构

#### 主进程 (main.js)
- 创建无边框透明窗口
- 处理系统托盘集成
- 管理窗口移动和IPC通信
- 处理应用生命周期

#### 渲染进程 (scripts/)
- **pet-behavior.js**: 宠物行为系统、状态管理
- **pet-ui.js**: 用户交互、右键菜单处理
- **pet.css**: 视觉样式、动画定义

### 技术特点

- **GPU硬件加速**: 使用CSS3 transform和will-change优化性能
- **平滑拖拽**: 基于requestAnimationFrame的高性能拖拽系统
- **无残影渲染**: 通过GPU合成层避免拖拽残影问题
- **事件优化**: 防抖和节流机制确保交互流畅

## 🔧 配置选项

### 外观自定义

在 `styles/pet.css` 中可以修改：

```css
/* 宠物大小 */
#pet {
    width: 100px;      /* 宠物宽度 */
    height: 100px;     /* 宠物高度 */
}

/* 颜色主题 */
.pet-sprite {
    background: radial-gradient(circle, #ff9999 20%, #ff6b6b 40%, #ee5a24 60%);
}
```

## 📦 打包分发

### 构建可执行文件

```bash
# 为当前平台构建
npm run build

# 为特定平台构建
npx electron-builder --win
npx electron-builder --mac
npx electron-builder --linux
```

## 🐛 故障排除

### 常见问题

**Q: 托盘图标不显示？**
A: 确保系统托盘设置允许显示图标。

**Q: 拖拽不够流畅？**
A: 项目已针对拖拽性能进行优化，确保使用较新版本的Node.js。

**Q: 应用无法启动？**
A: 检查Node.js版本是否符合要求，尝试重新安装依赖：
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用2空格缩进
- 函数和变量使用驼峰命名
- 添加适当的注释
- 保持代码简洁易读

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **项目主页**: [GitHub Repository](https://github.com/your-username/desktop-pet)
- **问题反馈**: [Issues](https://github.com/your-username/desktop-pet/issues)

## 🙏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Node.js](https://nodejs.org/) - JavaScript运行时环境

---

**享受与你的桌面宠物相处的时光吧！** 🐱💕