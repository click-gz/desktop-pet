# 🎨 桌面宠物管理系统

独立的 Web 管理后台，用于管理桌面宠物应用的 Redis 数据库。

## ✨ 功能特性

- 🔐 **安全认证**：基于 Token 的管理员认证
- 👥 **用户管理**：查看、编辑、删除用户数据
- 🎯 **用户画像**：完整展示用户的所有画像数据（统一视图）
  - 📊 基础属性：年龄、性别、职业、教育程度
  - 💡 兴趣偏好：兴趣标签、内容偏好、活跃时段
  - 🧠 心理特征：大五人格、情感状态、沟通风格
  - 💕 社交关系：亲密度、信任度、互动舒适度
  - 📈 统计信息：互动次数、会话数、注册天数
  - 🆕 **行为分析**：基于用户交互行为的深度分析
    - 交互模式（频率、风格、强度）
    - 性格特征（外向性、控制欲、社交需求）
    - 时间模式（活跃时段、使用习惯）
    - 参与度评分（0-100分综合评估）
- 🔄 **画像刷新**：支持手动触发用户画像更新
- 💬 **会话管理**：监控和管理用户会话
- 📊 **数据统计**：实时统计和数据可视化
- 🔍 **Redis 监控**：查看 Redis 运行状态和性能指标
- 🐱 **宠物配置**：自定义宠物名称、System Prompt、外观设置
- ⚙️ **系统管理**：数据清理、导出等维护功能

## 🚀 快速开始

### 环境要求

- Python 3.8+
- Redis 服务
- 现代浏览器（Chrome/Firefox/Edge）

### 安装步骤

1. **克隆或下载项目**
```bash
cd desktop-pet-admin
```

2. **配置环境变量**
```bash
# 复制配置文件
cp .env.example .env

# 编辑 .env 文件，配置你的参数
# REDIS_HOST=localhost
# REDIS_PORT=6379
# ADMIN_TOKEN=your_secret_token
```

3. **安装后端依赖**
```bash
cd backend
pip install -r requirements.txt
```

4. **启动后端服务**
```bash
python main.py
```

后端将在 `http://localhost:8080` 运行

5. **打开前端界面**

使用浏览器打开 `frontend/index.html`

或者使用简单的 HTTP 服务器：
```bash
# Python 3
cd frontend
python -m http.server 8000

# 访问 http://localhost:8000
```

## 📝 配置说明

### 后端配置 (.env)

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# 安全配置
ADMIN_TOKEN=your_secret_admin_token_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# CORS 配置
ALLOW_ORIGINS=*
```

### 前端配置 (frontend/config.js)

```javascript
window.CONFIG = {
    API_BASE_URL: 'http://localhost:8080',
    DEFAULT_PAGE_SIZE: 20,
    AUTO_REFRESH_INTERVAL: 30000  // 30秒
};
```

## 🔒 安全建议

1. **生产环境务必修改默认 Token**
2. **使用强密码**
3. **启用 HTTPS**
4. **配置防火墙规则**
5. **定期更新依赖**

## 📖 API 文档

启动服务后访问：`http://localhost:8080/docs`

### 主要端点

#### 认证
- `POST /api/auth/login` - 管理员登录

#### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/{user_id}` - 获取用户详情
- `GET /api/admin/users/{user_id}/profile` - 获取完整用户画像（统一接口）
- `POST /api/admin/users/{user_id}/refresh_profile` - 手动刷新用户画像
- `PUT /api/admin/users/{user_id}` - 更新用户信息
- `DELETE /api/admin/users/{user_id}` - 删除用户

#### 会话管理
- `GET /api/admin/sessions` - 获取会话列表
- `GET /api/admin/sessions/{session_id}` - 获取会话详情
- `DELETE /api/admin/sessions/{session_id}` - 删除会话

#### 统计信息
- `GET /api/admin/stats/overview` - 系统概览
- `GET /api/admin/stats/users` - 用户统计
- `GET /api/admin/stats/sessions` - 会话统计

#### 系统管理
- `GET /api/admin/redis/info` - Redis 信息
- `POST /api/admin/redis/cleanup` - 清理过期数据
- `DELETE /api/admin/redis/flush` - 清空数据库（危险）

## 🐳 Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📊 使用截图

### 仪表板
![Dashboard](docs/images/dashboard.png)

### 用户管理
![Users](docs/images/users.png)

### 会话管理
![Sessions](docs/images/sessions.png)

## 🛠️ 开发指南

### 项目结构

```
backend/
├── api/            # API 路由
├── services/       # 业务服务
├── config.py       # 配置管理
└── main.py         # 入口文件

frontend/
├── assets/         # 静态资源
├── index.html      # 主页面
└── config.js       # 前端配置
```

### 添加新功能

1. 在 `backend/api/` 中添加新的路由
2. 在 `backend/services/` 中实现业务逻辑
3. 在前端添加对应的界面和交互

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请提交 Issue 或联系开发者。

## 🎯 核心功能使用

### 用户画像统一视图

系统现已整合所有用户画像数据到统一视图中，包括：

**1. 基础属性层**
- 年龄段、性别、职业、教育程度
- 地理位置、设备类型
- 置信度评分（智能推断）

**2. 兴趣偏好层**
- 兴趣标签（带权重）
- 内容偏好（回复长度、使用表情、举例偏好）
- 活跃时段分析

**3. 心理特征层**
- 大五人格特征（开放性、尽责性、外向性、宜人性、神经质）
- 情感状态（当前情绪、情绪稳定性、积极情绪占比）
- 沟通风格（正式度、幽默接受度、消息长度）
- 动机需求

**4. 社交关系层**
- 与AI的亲密度分数
- 关系等级（陌生人 → 初识 → 熟人 → 朋友 → 好友 → 挚友）
- 信任程度、互动舒适度
- 互动模式分析
- 🆕 **行为分析**：基于实际交互的深度分析

**5. 统计信息**
- 总互动次数、总会话数、总消息数
- 注册天数、连续活跃天数
- 最长沉默天数

### 🆕 行为分析功能

系统现已集成完整的用户行为分析功能，可以查看：

**交互模式**
- 总交互次数和频率
- 点击、拖拽、聊天比例
- 交互强度等级（极高/高/中/低）
- 交互风格（聊天型/操控型/互动型/观察型）

**性格特征推断**
- 外向性、控制欲、社交需求
- 耐心程度、参与度
- 使用习惯（重度/活跃/中度/轻度用户）
- 聊天偏好（深度交流型/快速交流型等）

**时间模式识别**
- 高峰活跃时段
- 活跃天数分布
- 使用习惯类型（夜猫子型/早起型/全天分散型等）

**参与度评分**
- 0-100分综合评分
- 交互、多样性、时长、聊天深度分项评分
- 参与度等级评定

### 如何查看用户画像

1. 登录管理系统
2. 进入"用户管理"标签页
3. 点击用户行的"详情"按钮
4. 在用户详情弹窗中点击"📊 查看完整用户画像"
5. 如需更新画像，点击"🔄 刷新画像"按钮

### 画像更新机制

- **自动更新**：后台任务每30秒扫描一次，自动更新有新消息的用户画像
- **更新限制**：同一用户每3分钟最多更新一次，避免资源浪费
- **手动刷新**：管理员可通过"刷新画像"按钮立即触发更新
- **分析模式**：
  - 规则引擎：快速推测基础属性（2条消息即可）
  - LLM深度分析：8条以上消息时启用，提供更准确的心理特征分析

## 🔄 更新日志

### v1.2.0 (2025-10-12) 🆕
- ✨ **行为分析功能集成**
  - 展示用户交互模式分析
  - 显示性格特征推断结果
  - 时间模式识别和可视化
  - 参与度评分系统
- 📊 **画像系统增强**
  - 行为数据整合到用户画像
  - 基于行为的个性化洞察
  - 活跃时段统计优化
- 🎨 **界面优化**
  - 行为分析数据展示
  - 参与度评分可视化
  - 交互风格标签

### v1.1.0 (2025-10-07)
- ✨ 统一用户画像系统，整合所有画像数据
- 🔄 新增手动刷新画像功能
- 🎯 优化画像更新策略，降低更新限制
- 🐛 修复画像更新时间计算bug
- 📊 完善画像展示界面

### v1.0.0 (2025-10-07)
- ✨ 初始版本发布
- 🎨 完整的管理界面
- 📊 数据统计和可视化
- 🔐 安全认证机制
