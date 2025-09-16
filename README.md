# 🐱 桌面宠物 (Desktop Pet)

[![Electron](https://img.shields.io/badge/Electron-27.0.0-blue?logo=electron)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.19.0-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

一个可爱的跨平台桌面宠物应用，使用 Electron 构建。你的桌面伴侣将陪伴你工作、学习，为你的数字生活增添乐趣！

![桌面宠物预览](https://via.placeholder.com/600x300/ff6b6b/ffffff?text=Desktop+Pet+Demo)

## ✨ 功能特点

### 🎮 智能交互系统
- **多状态切换**：待机、散步、兴奋、睡觉四种状态
- **智能行为**：根据心情和能量自动调整行为
- **丰富互动**：点击、双击、拖拽多种交互方式
- **语音对话**：宠物会根据状态说不同的话

### 🎨 精美视觉效果
- **可爱外观**：圆形宠物精灵，表情丰富
- **流畅动画**：呼吸、眨眼、弹跳、行走动画
- **状态指示**：心情条、能量显示、状态提示
- **主题变换**：不同状态对应不同颜色主题

### 🖥️ 桌面集成
- **始终置顶**：在所有窗口前端显示
- **自由移动**：支持拖拽和自动随机移动
- **系统托盘**：集成系统托盘，便于管理
- **透明背景**：无边框透明窗口，融入桌面

### ⌨️ 便捷操作
- **右键菜单**：完整的功能菜单
- **快捷键支持**：数字键1-4快速切换状态
- **键盘控制**：F(喂食)、P(玩耍)、S(睡觉)

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

## 📖 使用指南

### 基本操作

| 操作 | 描述 | 效果 |
|------|------|------|
| 单击宠物 | 基础互动 | 提升心情，切换到兴奋状态 |
| 双击宠物 | 智能切换 | 根据当前状态自动切换 |
| 右键宠物 | 打开菜单 | 显示完整功能菜单 |
| 拖拽宠物 | 移动位置 | 拖动宠物到新位置 |
| 悬停宠物 | 查看状态 | 显示详细状态信息 |

### 快捷键列表

#### 状态切换
- `1` - 💭 待机状态
- `2` - 🚶 散步状态  
- `3` - 🎉 兴奋状态
- `4` - 😴 睡觉状态

#### 互动操作
- `F` - 🍖 喂食宠物
- `P` - 🎮 和宠物玩耍
- `S` - 😴 让宠物休息

#### 系统控制
- `Ctrl + H` - 隐藏宠物
- `Ctrl + Q` - 退出应用
- `Esc` - 关闭右键菜单

### 宠物状态详解

#### 💭 待机状态 (Idle)
- **持续时间**: 3秒
- **特征**: 呼吸动画，偶尔眨眼
- **行为**: 随机说话，等待互动
- **转换**: 可切换到散步或兴奋状态

#### 🚶 散步状态 (Walking)
- **持续时间**: 4秒
- **特征**: 左右摇摆动画
- **行为**: 在桌面上随机移动
- **转换**: 移动完成后回到待机状态

#### 🎉 兴奋状态 (Excited)
- **持续时间**: 2.5秒
- **特征**: 弹跳动画，黄色外观
- **行为**: 表达开心情绪
- **触发**: 互动、喂食、玩耍时

#### 😴 睡觉状态 (Sleeping)
- **持续时间**: 6秒
- **特征**: 绿色外观，显示"zzZ"
- **行为**: 恢复能量值
- **触发**: 能量低于30%时自动进入

### 宠物属性系统

#### 💖 心情值 (Mood: 0-100%)
- **影响因素**: 互动(+10)、喂食(+20)、玩耍(+15)、时间流逝(-2)
- **效果**: 心情>80%时有30%概率自动变兴奋
- **显示**: 彩色心情条，悬停查看数值

#### ⚡ 能量值 (Energy: 0-100%)
- **影响因素**: 睡觉(+5/秒)、互动(-5)、玩耍(-10)、时间流逝(-3)
- **效果**: 能量<30%时强制进入睡觉状态
- **恢复**: 通过睡觉状态恢复

## 🛠️ 开发指南

### 项目结构

```
desktop-pet/
├── package.json          # 项目配置和依赖
├── main.js              # Electron 主进程
├── index.html           # 宠物界面HTML
├── README.md            # 项目文档
├── assets/              # 资源文件
│   └── icon.ico        # 应用图标
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

# 安装新依赖
npm install <package-name>
```

### 核心架构

#### 主进程 (main.js)
- 创建无边框透明窗口
- 处理系统托盘集成
- 管理窗口移动和IPC通信
- 处理应用生命周期

#### 渲染进程 (index.html + scripts/)
- **pet-behavior.js**: 宠物行为系统、状态管理、动画控制
- **pet-ui.js**: 用户交互、右键菜单、快捷键处理
- **pet.css**: 视觉样式、动画定义、响应式布局

### 自定义开发

#### 添加新状态
1. 在 `pet-behavior.js` 的 `behaviors` 对象中添加新状态
2. 在 `pet.css` 中定义对应的动画样式
3. 在 `chooseNextState()` 方法中添加切换逻辑

#### 添加新动画
1. 在 `pet.css` 中使用 `@keyframes` 定义动画
2. 在对应状态的CSS类中应用动画
3. 可配置动画持续时间和缓动函数

#### 扩展交互功能
1. 在 `pet-ui.js` 中添加事件监听器
2. 定义新的菜单项和对应的处理函数
3. 可添加键盘快捷键和鼠标手势

## 🔧 配置选项

### 行为参数调整

在 `scripts/pet-behavior.js` 中可以调整以下参数：

```javascript
// 状态持续时间 (毫秒)
this.behaviors = {
    idle: { duration: 3000 },      // 待机时间
    walking: { duration: 4000 },   // 散步时间
    excited: { duration: 2500 },   // 兴奋时间
    sleeping: { duration: 6000 }   // 睡觉时间
};

// 属性变化速率
this.mood = 80;        // 初始心情值
this.energy = 100;     // 初始能量值
```

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

### 构建配置

在 `package.json` 中的 `build` 字段可以配置：

```json
{
  "build": {
    "appId": "com.example.desktop-pet",
    "productName": "桌面宠物",
    "directories": {
      "output": "dist"
    },
    "files": ["**/*", "!node_modules/**/*"]
  }
}
```

## 🐛 故障排除

### 常见问题

**Q: 宠物不移动怎么办？**
A: 检查是否有权限访问屏幕坐标，确保没有被其他应用阻止。

**Q: 托盘图标不显示？**
A: 确保 `assets/icon.ico` 文件存在，或检查系统托盘设置。

**Q: 快捷键不工作？**
A: 确保宠物窗口有焦点，或者检查是否与其他应用快捷键冲突。

**Q: 应用无法启动？**
A: 检查Node.js版本是否符合要求，尝试重新安装依赖：
```bash
rm -rf node_modules package-lock.json
npm install
```

### 日志调试

开发模式下可以查看控制台日志：
```bash
npm run dev
```

在开发者工具中查看状态变化和错误信息。

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
- **功能建议**: [Discussions](https://github.com/your-username/desktop-pet/discussions)

## 🙏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Node.js](https://nodejs.org/) - JavaScript运行时环境
- 所有贡献者和用户的支持

## 🗺️ 发展路线


---

**享受与你的桌面宠物相处的时光吧！** 🐱💕