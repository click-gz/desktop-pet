# 🐱 桌面宠物 AI 后端服务

基于 FastAPI 的智能聊天后端，支持用户画像、会话管理、增量总结等高级功能。

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)](https://www.python.org/)
[![Redis](https://img.shields.io/badge/Redis-5.0+-red?logo=redis)](https://redis.io/)

## ✨ 功能特性

### 🤖 AI 聊天服务
- **多服务商支持**: 支持 OpenAI 和硅基流动 (SiliconFlow) API
- **智能故障转移**: 自动切换可用的 AI 服务提供商
- **流式响应**: 支持 SSE (Server-Sent Events) 流式输出
- **上下文管理**: 智能管理对话上下文，避免 token 超限

### 👤 用户画像系统
- **自动画像构建**: 基于聊天内容自动分析用户兴趣、性格
- **亲密度系统**: 跟踪用户互动频率，建立情感连接
- **个性化回复**: 根据用户画像定制 AI 回复风格
- **长期记忆**: 持久化存储用户偏好和历史互动

### 💬 会话管理
- **智能会话分段**: 自动检测对话主题变化
- **增量总结**: 定期对长对话进行智能总结
- **上下文压缩**: 保留关键信息，优化 token 使用
- **会话恢复**: 支持跨设备会话状态同步

### 📊 数据存储
- **Redis 持久化**: 高性能的数据存储和缓存
- **结构化存储**: 用户画像、会话数据、聊天历史分离管理
- **过期策略**: 智能数据清理，优化存储空间
- **后台任务**: 异步处理会话总结和画像更新

## 🚀 快速开始

### 环境要求

- **Python**: >= 3.8 (推荐 3.10+)
- **Redis**: >= 5.0
- **AI API**: OpenAI 或硅基流动 API Key

### 安装步骤

#### 1. 安装 Redis

**Windows:**
```bash
# 使用 Windows Subsystem for Linux (WSL)
wsl sudo apt install redis-server
wsl redis-server

# 或使用 Memurai (Redis for Windows)
# 下载: https://www.memurai.com/
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

#### 2. 配置环境变量

```bash
# 复制配置文件模板
cp env.example .env

# 编辑 .env 文件，配置你的 API Key
```

**必填配置 (.env):**
```env
# AI 服务配置（至少配置一个）
SILICONFLOW_API_KEY=your_siliconflow_token_here
SILICONFLOW_MODEL=Qwen/Qwen3-8B
# 或
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务器配置
PORT=3000
HOST=0.0.0.0
```

#### 3. 安装 Python 依赖

```bash
# 推荐使用虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

#### 4. 启动服务

**方式一：使用 Uvicorn（推荐）**
```bash
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

**方式二：使用 Python 直接启动**
```bash
# 取消 main.py 底部代码的注释
python main.py
```

**启动成功标志：**
```
✅ 硅基流动 AI 已配置 (模型: Qwen/Qwen3-8B)
🤖 AI 服务优先级: siliconflow
✅ Redis 连接成功: localhost:6379
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
✅ 桌面宠物后端服务已启动
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:3000 (Press CTRL+C to quit)
```

#### 5. 验证服务

打开浏览器访问：
- **API 文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/health

## 📖 API 文档

### 核心端点

#### 1. 健康检查
```http
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-10-07T14:00:00.000000",
  "message": "桌面宠物后端服务运行中",
  "ai_services": {
    "siliconflow": {
      "configured": true,
      "model": "Qwen/Qwen3-8B",
      "priority": 1
    }
  }
}
```

#### 2. 发送聊天消息
```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "你好",
  "user_id": "optional_user_id",
  "conversation_history": []
}
```

**响应示例：**
```json
{
  "success": true,
  "reply": "你好！很高兴见到你～",
  "timestamp": "2025-10-07T14:00:00.000000"
}
```

#### 3. 流式聊天（SSE）
```http
POST /api/chat/stream
Content-Type: application/json

{
  "message": "讲个故事",
  "user_id": "optional_user_id"
}
```

#### 4. 获取当前会话
```http
GET /api/session/{user_id}/current
```

#### 5. 结束会话
```http
POST /api/session/{session_id}/end
```

#### 6. 获取会话总结
```http
GET /api/session/{session_id}/summary
```

### 完整 API 文档

启动服务后访问 **http://localhost:3000/docs** 查看完整的交互式 API 文档。

## 🔧 配置详解

### AI 服务配置

支持两种 AI 服务提供商，可配置故障转移：

```env
# 硅基流动（推荐，国内访问快）
SILICONFLOW_API_KEY=sk-xxxxx
SILICONFLOW_MODEL=Qwen/Qwen3-8B
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1

# 优先级设置（逗号分隔，按顺序尝试）
AI_PROVIDER_PRIORITY=siliconflow,openai
```

**推荐模型：**
- 硅基流动: `Qwen/Qwen3-8B`, `Qwen/QwQ-32B`
- OpenAI: `gpt-3.5-turbo`, `gpt-4`

### Redis 配置

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=          # 如果 Redis 有密码
```

### 服务器配置

```env
PORT=3000               # 服务端口
HOST=0.0.0.0           # 监听地址（0.0.0.0 允许外部访问）
```

## 📁 项目结构

```
backend-python/
├── main.py                          # 主应用入口
├── models.py                        # 数据模型定义
├── requirements.txt                 # Python 依赖
├── env.example                      # 环境变量模板
├── README.md                        # 本文档
├── services/                        # 业务逻辑服务
│   ├── __init__.py
│   ├── ai_provider.py              # AI 服务提供商管理
│   ├── chat_service.py             # 聊天服务核心
│   ├── redis_manager.py            # Redis 连接管理
│   ├── session_manager.py          # 会话管理（增量总结）
│   ├── user_profile_service.py     # 用户画像服务
│   └── background_tasks.py         # 后台任务管理器
├── test_incremental_summary.py     # 增量总结测试
├── INCREMENTAL_SUMMARY_UPGRADE.md  # 增量总结升级文档
└── USER_PROFILE_README.md          # 用户画像系统文档
```

## 🎯 核心功能详解

### 用户画像系统

自动分析用户聊天内容，构建个性化画像：

- **基础信息**: 用户ID、创建时间、最后活跃时间
- **兴趣标签**: 自动提取用户感兴趣的主题
- **性格特征**: 分析对话风格，识别性格倾向
- **互动统计**: 消息数量、会话次数、互动频率
- **亲密度等级**: 陌生人 → 熟人 → 朋友 → 密友 → 挚友

查看详细文档: [USER_PROFILE_README.md](USER_PROFILE_README.md)

### 增量总结系统

智能管理长对话，避免上下文溢出：

- **自动触发**: 对话达到 30 条消息时自动总结
- **增量模式**: 只总结新增内容，合并历史总结
- **后台处理**: 异步执行，不阻塞用户交互
- **智能压缩**: 保留关键信息，减少 token 消耗
- **主题识别**: 自动识别对话主题和转折点

查看详细文档: [INCREMENTAL_SUMMARY_UPGRADE.md](INCREMENTAL_SUMMARY_UPGRADE.md)

### 会话管理

- **自动创建**: 用户首次对话自动创建会话
- **超时检测**: 30 分钟无互动自动结束会话
- **状态跟踪**: active → ended → summarized
- **历史查询**: 支持查询历史会话和总结

## 🐛 故障排除

### 常见问题

#### Q: 服务启动后没有看到 Uvicorn 运行日志？

**A:** 检查 `main.py` 底部的启动代码是否被注释。使用 uvicorn 命令启动：
```bash
uvicorn main:app --host 0.0.0.0 --port 3000
```

#### Q: Redis 连接失败？

**A:** 确保 Redis 服务正在运行：
```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回: PONG

# 如果未运行，启动 Redis
# Windows (WSL): wsl redis-server
# macOS: brew services start redis
# Linux: sudo systemctl start redis
```

#### Q: AI API 调用失败？

**A:** 检查以下几点：
1. 确认 `.env` 文件中的 API Key 正确
2. 检查 API Key 是否有余额
3. 确认网络能访问 AI 服务（国内访问 OpenAI 可能需要代理）
4. 查看服务日志中的具体错误信息

#### Q: 看到 DeprecationWarning: on_event is deprecated？

**A:** 这是 FastAPI 的版本警告，不影响功能。如需消除警告，可以升级 FastAPI 并使用新的 `lifespan` 事件处理器。

#### Q: 用户画像不生成？

**A:** 
1. 确认 Redis 正常运行
2. 检查聊天消息是否成功保存（查看日志）
3. 画像分析需要积累一定量的对话（建议 5+ 条）
4. 后台任务可能需要几分钟完成分析

### 调试模式

启动时开启详细日志：
```bash
uvicorn main:app --host 0.0.0.0 --port 3000 --log-level debug
```

### 手动测试

使用 curl 测试 API：
```bash
# 健康检查
curl http://localhost:3000/health

# 发送消息
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "user_id": "test_user"}'
```

## 🔄 更新日志

### v2.0.0 (2025-10-07)
- ✨ 新增用户画像系统
- ✨ 新增增量总结功能
- ✨ 新增会话管理系统
- ✨ 新增后台任务管理器
- 🚀 支持硅基流动 AI 服务
- 🔧 优化 Redis 连接管理
- 📊 新增亲密度系统

### v1.0.0 (2024-12-01)
- 🎉 初始版本发布
- 🤖 支持 OpenAI API
- 💬 基础聊天功能
- 📡 FastAPI 框架搭建

## 🤝 集成指南

### 与桌面宠物前端集成

1. **启动后端服务**（本服务）
2. **启动 Electron 应用**（主项目）
3. **前端配置**：确保前端 API 地址指向 `http://localhost:3000`

### 与管理系统集成

后端服务与管理系统共享 Redis 数据：
1. **启动后端服务**（本服务，端口 3000）
2. **启动管理系统后端**（`desktop-pet-admin/backend`，端口 8080）
3. **管理系统可查看**：用户数据、会话记录、系统统计

## 📚 相关文档

- [用户画像系统文档](USER_PROFILE_README.md)
- [增量总结升级文档](INCREMENTAL_SUMMARY_UPGRADE.md)
- [管理系统文档](../desktop-pet-admin/README.md)
- [主项目文档](../README.md)

## 📄 许可证

MIT License

## 📞 技术支持

- **问题反馈**: [GitHub Issues](https://github.com/your-repo/desktop-pet/issues)
- **API 文档**: http://localhost:3000/docs (启动服务后访问)

---

**祝你的桌面宠物越来越聪明！** 🐱✨

