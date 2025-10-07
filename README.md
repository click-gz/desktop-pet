# 🐱 桌面宠物系统 (Desktop Pet System)

[![Electron](https://img.shields.io/badge/Electron-28.0.0-blue?logo=electron)](https://electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Redis](https://img.shields.io/badge/Redis-5.0+-red?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个完整的智能桌面宠物系统，集成了AI聊天、用户画像、会话管理等高级功能。包含桌面客户端、后端服务和管理系统三大模块。

## 🌟 项目概述

本项目由三个独立但互联的系统组成：

### 1. 🎮 桌面宠物客户端 (Electron)
- 可爱的桌面陪伴宠物
- 透明悬浮窗口，不影响工作
- AI智能对话，个性化回复
- 丰富的动画和交互

### 2. 🚀 后端AI服务 (Python + FastAPI)
- 多AI服务提供商支持（OpenAI、硅基流动）
- 用户画像智能分析
- 会话管理与增量总结
- Redis持久化存储

### 3. 🎨 管理系统 (Web)
- 完整的用户画像展示
- 实时数据统计
- 会话监控与管理
- Redis数据库管理

## ✨ 核心功能

### 🤖 AI对话系统
- **智能回复**：基于用户画像的个性化对话
- **上下文记忆**：记住历史对话，连贯交流
- **多模型支持**：OpenAI GPT、硅基流动 Qwen
- **流式输出**：实时显示AI回复内容

### 👤 用户画像系统（统一版）
完整的五层画像结构：

1. **基础属性层**
   - 年龄段、性别、职业、教育程度
   - 智能推断，置信度评分

2. **兴趣偏好层**
   - 自动识别兴趣标签（带权重）
   - 内容偏好分析
   - 活跃时段统计

3. **心理特征层**
   - 大五人格分析
   - 情感状态追踪
   - 沟通风格识别

4. **社交关系层**
   - AI亲密度系统（陌生人 → 挚友）
   - 信任度、互动舒适度
   - 互动模式分析

5. **统计信息**
   - 互动次数、会话数、消息数
   - 注册天数、活跃度

### 💬 会话管理
- **智能分段**：自动检测对话主题变化
- **增量总结**：只总结新内容，合并历史
- **后台处理**：异步执行，不阻塞交互
- **上下文优化**：智能压缩，减少token消耗

### 📊 管理功能
- **用户管理**：查看、编辑、删除用户
- **画像刷新**：手动触发画像更新
- **会话监控**：实时查看对话内容
- **数据统计**：系统运行状态监控
- **Redis管理**：数据清理、导出等

## 🏗️ 系统架构

```
┌─────────────────┐
│   桌面宠物客户端   │ (Electron + JavaScript)
│   - 可爱UI界面    │
│   - 用户交互      │
└────────┬────────┘
         │ HTTP/WebSocket
         ▼
┌─────────────────┐       ┌──────────┐
│   后端AI服务     │  TCP  │  Redis   │
│   (FastAPI)     │◄─────►│  数据库   │
│   - AI对话      │       └──────────┘
│   - 用户画像     │              ▲
│   - 会话管理     │              │
└────────┬────────┘              │
         │                       │
         ▼                       │
┌─────────────────┐              │
│   管理系统       │  HTTP        │
│   (Web)         │──────────────┘
│   - 数据可视化   │
│   - 用户管理     │
└─────────────────┘
```

## 🚀 快速开始

### 环境要求

#### 通用依赖
- **Redis**: >= 5.0（数据存储）
- **Git**: 用于克隆项目

#### 桌面客户端
- **Node.js**: >= 16.0.0

#### 后端服务
- **Python**: >= 3.8
- **AI API**: OpenAI 或硅基流动 API Key

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/your-username/desktop-pet.git
cd desktop-pet
```

#### 2. 启动 Redis

```bash
# Windows (WSL)
wsl redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

#### 3. 配置并启动后端服务

```bash
cd backend-python

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp env.example .env
# 编辑 .env 文件，填入你的 API Key

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 3000
```

后端服务将运行在 `http://localhost:3000`

#### 4. 启动桌面客户端

```bash
cd ..  # 回到项目根目录

# 安装依赖
npm install

# 启动应用
npm start
```

#### 5.（可选）启动管理系统

```bash
cd desktop-pet-admin/backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp ../env.example ../.env
# 编辑 .env 文件，设置管理员令牌

# 启动后端
python main.py
```

管理后端运行在 `http://localhost:8080`

打开 `desktop-pet-admin/frontend/index.html` 访问管理界面。

## 📖 详细文档

### 各模块详细说明

- **[桌面客户端文档](FRONTEND_README.md)** - Electron应用使用指南
- **[后端服务文档](backend-python/README.md)** - API文档和配置说明
- **[管理系统文档](desktop-pet-admin/README.md)** - 管理后台使用指南
- **[用户画像系统](backend-python/USER_PROFILE_README.md)** - 画像系统详细说明
- **[增量总结文档](backend-python/INCREMENTAL_SUMMARY_UPGRADE.md)** - 会话总结功能

### API文档

启动相应服务后访问：
- **后端API**: http://localhost:3000/docs
- **管理API**: http://localhost:8080/docs

## 🎯 使用场景

### 日常陪伴
- 桌面宠物陪伴工作学习
- 聊天解闷，缓解压力
- 可爱动画，赏心悦目

### 智能助手
- AI问答，解决问题
- 个性化对话，了解你的喜好
- 记忆功能，延续上下文

### 数据分析
- 用户行为分析
- 兴趣偏好洞察
- 互动模式研究

## 🔧 配置说明

### 后端服务配置 (backend-python/.env)

```env
# AI服务（至少配置一个）
SILICONFLOW_API_KEY=your_api_key_here
SILICONFLOW_MODEL=Qwen/Qwen3-8B

# 或使用 OpenAI
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 服务器配置
PORT=3000
HOST=0.0.0.0
```

### 管理系统配置 (desktop-pet-admin/.env)

```env
# Redis配置（与后端共享）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 管理员认证
ADMIN_TOKEN=your_secret_token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 服务器配置
SERVER_PORT=8080
```

### 前端配置

桌面客户端自动连接到 `http://localhost:3000`
管理系统前端通过 `frontend/config.js` 配置API地址。

## 📁 项目结构

```
desktop-pet/
├── README.md                      # 本文档（总体说明）
├── FRONTEND_README.md             # 前端详细文档
├── package.json                   # 前端依赖
├── main.js                        # Electron主进程
├── index.html                     # 宠物界面
├── chat.html                      # 聊天窗口
├── scripts/                       # 前端脚本
│   ├── pet-animation-system.js
│   ├── pet-behavior.js
│   ├── pet-chat.js
│   └── ...
├── styles/                        # 样式文件
│   ├── pet.css
│   └── chat.css
│
├── backend-python/                # 后端服务
│   ├── README.md                 # 后端详细文档
│   ├── main.py                   # FastAPI应用
│   ├── requirements.txt          # Python依赖
│   ├── services/                 # 业务服务
│   │   ├── ai_provider.py
│   │   ├── chat_service.py
│   │   ├── user_profile_service.py
│   │   ├── session_manager.py
│   │   └── background_tasks.py
│   └── ...
│
└── desktop-pet-admin/            # 管理系统
    ├── README.md                 # 管理系统文档
    ├── backend/                  # 管理后端
    │   ├── main.py
    │   ├── api/
    │   └── services/
    ├── frontend/                 # 管理前端
    │   ├── index.html
    │   ├── assets/
    │   └── config.js
    └── ...
```

## 🐛 故障排除

### 常见问题

#### Q: Redis连接失败？
**A:** 确保Redis服务正在运行：
```bash
redis-cli ping  # 应返回 PONG
```

#### Q: AI API调用失败？
**A:** 检查以下几点：
1. `.env` 文件中API Key是否正确
2. API Key是否有余额
3. 网络是否能访问AI服务
4. 查看后端日志的具体错误

#### Q: 桌面宠物无法连接后端？
**A:**
1. 确认后端服务已启动（访问 http://localhost:3000/health）
2. 检查防火墙设置
3. 查看浏览器控制台的网络请求错误

#### Q: 管理系统无法登录？
**A:**
1. 确认管理后端已启动（端口8080）
2. 检查 `.env` 中的 `ADMIN_TOKEN` 配置
3. 确认Redis连接正常

#### Q: 用户画像不更新？
**A:**
1. 确认已有足够的对话消息（至少2条）
2. 后台任务每30秒执行一次，需要等待
3. 可通过管理系统手动刷新画像
4. 检查后端日志查看更新状态

### 调试技巧

**后端服务调试**:
```bash
# 启用详细日志
uvicorn main:app --log-level debug

# 使用 curl 测试 API
curl http://localhost:3000/health
```

**Electron应用调试**:
```javascript
// 在 main.js 中开启开发者工具
mainWindow.webContents.openDevTools();
```

**Redis数据查看**:
```bash
# 连接Redis
redis-cli

# 查看所有用户
KEYS user:*:profile

# 查看特定用户画像
HGETALL user:{user_id}:profile
```

## 🔄 更新日志

### v2.1.0 (2025-10-07)
- ✨ **统一用户画像系统**：整合所有画像数据到统一视图
- 🔄 **画像自动更新**：后台任务自动分析用户画像
- 🎯 **手动刷新功能**：管理员可手动触发画像更新
- 🐛 **修复更新bug**：修复画像更新时间计算错误
- 📊 **优化更新策略**：降低更新限制，提高更新频率

### v2.0.0 (2025-10-07)
- ✨ 新增用户画像系统（五层结构）
- ✨ 新增增量总结功能
- ✨ 新增会话管理系统
- ✨ 新增管理系统
- 🚀 支持硅基流动AI服务
- 🤖 多AI服务提供商故障转移

### v1.0.0 (2025-09-01)
- 🎉 初始版本发布
- 🐱 桌面宠物基础功能
- 💬 AI聊天功能
- 📡 FastAPI后端

## 🛣️ 路线图

### 短期计划
- [ ] 语音交互功能
- [ ] 更多宠物形象选择
- [ ] 插件系统支持
- [ ] 多语言支持

### 长期计划
- [ ] 移动端适配
- [ ] 多宠物互动
- [ ] 社区分享平台
- [ ] 宠物养成系统

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- Python: 遵循 PEP 8
- JavaScript: 使用 ESLint
- 添加适当的注释和文档
- 编写单元测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 技术支持

- **问题反馈**: [GitHub Issues](https://github.com/your-username/desktop-pet/issues)
- **功能建议**: 欢迎提交 Issue 或 PR
- **API文档**: 
  - 后端: http://localhost:3000/docs
  - 管理: http://localhost:8080/docs

## 🙏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代Python Web框架
- [Redis](https://redis.io/) - 高性能数据存储
- [OpenAI](https://openai.com/) - AI服务提供商
- [硅基流动](https://siliconflow.cn/) - 国内AI服务

## 🌟 Star History

如果这个项目对你有帮助，请给个Star⭐️支持一下！

---

**让智能的桌面宠物陪伴你的每一天！** 🐱✨💬
