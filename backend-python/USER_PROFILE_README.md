# 用户画像功能说明

## 功能概述

本系统实现了基于LLM的智能用户画像功能，可以在后台自动运行，对用户进行无感知的画像分析和更新。

## 核心组件

### 1. UserProfileService (用户画像服务)
**文件**: `services/user_profile_service.py`

**功能**:
- 管理用户长期画像数据（兴趣、性格、偏好等）
- 存储和检索用户聊天历史
- 计算和更新用户亲密度
- 生成个性化聊天上下文

**关键方法**:
- `init_user()` - 初始化新用户画像
- `get_user_profile()` - 获取用户画像数据
- `add_interest_tags()` - 添加兴趣标签
- `update_personality_traits()` - 更新性格特征
- `update_intimacy_score()` - 更新亲密度分数
- `get_chat_context_prompt()` - 生成个性化聊天上下文
- `update_profile_from_llm_analysis()` - 根据LLM分析更新画像

### 2. LLMProfileAnalyzer (LLM画像分析器)
**文件**: `services/llm_profile_analyzer.py`

**功能**:
- 使用LLM智能分析用户对话
- 提取用户兴趣、性格、偏好等特征
- 定期进行深度画像分析

**关键方法**:
- `summarize_session()` - 总结会话，提取关键信息
- `analyze_user_profile()` - 深度分析用户画像

### 3. BackgroundTaskManager (后台任务管理器)
**文件**: `services/background_tasks.py`

**功能**:
- 后台异步执行画像分析任务
- 每30秒检查一次待处理任务
- 自动处理会话总结和画像更新

**工作流程**:
1. 监听会话总结队列
2. 当会话达到触发条件（每10条消息）时加入队列
3. 后台任务自动调用LLM分析会话
4. 将分析结果合并到用户画像

### 4. SessionManager (会话管理器)
**文件**: `services/session_manager.py`

**功能**:
- 管理短期会话上下文（与长期画像分离）
- 标记需要总结的会话
- 触发画像更新条件

## 工作流程

### 1. 用户发送消息
```
用户消息 → SessionManager → 保存到短期上下文
                         ↓
                  UserProfileService → 保存到长期历史
                         ↓
                  检查是否触发总结（每10条消息）
                         ↓
                  加入总结队列（如果满足条件）
```

### 2. 后台自动处理（用户无感）
```
BackgroundTaskManager (每30秒)
         ↓
检查总结队列
         ↓
获取完整会话上下文
         ↓
LLMProfileAnalyzer.summarize_session()
         ↓
提取：兴趣、性格、话题、情感等
         ↓
UserProfileService.update_profile_from_llm_analysis()
         ↓
更新用户画像数据
```

### 3. 个性化回复
```
用户发送消息
         ↓
UserProfileService.get_chat_context_prompt()
         ↓
读取用户画像（关系、兴趣、性格等）
         ↓
构建个性化系统提示
         ↓
AI生成个性化回复
```

## 数据存储结构（Redis）

### 用户画像 (Hash)
```
Key: user:{user_id}:profile
Fields:
  - user_id: 用户ID
  - created_at: 创建时间
  - last_seen: 最后活跃时间
  - total_interactions: 总交互次数
  - intimacy_score: 亲密度分数
  - relationship_level: 关系等级（陌生人/初识/熟人/朋友/好友/挚友）
  - interests: 兴趣标签（JSON数组）
  - personality_traits: 性格特征（JSON对象）
  - preferences: 偏好设置（JSON对象）
  - chat_style: 聊天风格（JSON对象）
```

### 会话上下文 (List)
```
Key: session:{session_id}:context
Value: 消息列表（JSON）
  - role: user/assistant
  - content: 消息内容
  - timestamp: 时间戳
```

### 会话总结队列 (Set)
```
Key: session:summary_queue
Value: 待总结的会话ID列表
```

### 会话总结结果 (Hash)
```
Key: session:{session_id}:summary
Fields:
  - interests_mentioned: 提到的兴趣（JSON）
  - personality_hints: 性格线索
  - relationship_progress: 关系进展
  - topics_discussed: 讨论话题（JSON）
  - emotional_tone: 情感基调
  - summarized_at: 总结时间
```

## 触发条件

### 会话总结触发
- 每10条消息触发一次（10, 20, 30...）
- 会话结束时手动触发

### 画像更新触发
- 每次会话总结完成后自动更新
- 提取的兴趣标签自动添加到画像
- 性格特征逐步累积

## 亲密度系统

### 关系等级
- 0-9分: 陌生人
- 10-29分: 初识
- 30-59分: 熟人
- 60-99分: 朋友
- 100-199分: 好友
- 200+分: 挚友

### 亲密度增长
- 每次对话 +1分
- 关系进展良好时额外加分
- 可根据对话质量调整

## 优化建议

### 已实现的优化
✅ 短期上下文与长期画像分离
✅ 后台异步处理，用户无感
✅ LLM智能分析提取特征
✅ 个性化聊天上下文生成
✅ 亲密度系统

### 可以增强的功能
- [ ] 定期深度画像分析（目前只在会话总结时更新）
- [ ] 情感分析更细化
- [ ] 多维度性格模型
- [ ] 画像可视化接口
- [ ] 画像导出/导入功能

## 启动说明

后台任务会在服务启动时自动启动：

```python
# main.py中已配置
@app.on_event("startup")
async def startup_event():
    if background_tasks.task_manager:
        background_tasks.task_manager.start()  # 自动启动
```

无需额外配置，系统会自动：
1. 每30秒检查待处理任务
2. 自动分析会话并更新画像
3. 用户完全无感知

## 测试验证

验证功能是否正常工作：

1. 发送10条以上对话（触发总结）
2. 检查后台日志，应该看到：
   - "会话 xxx 已加入总结队列"
   - "开始总结会话: xxx"
   - "会话总结完成: xxx"
   - "用户画像已更新: xxx"

3. 调用API查看画像：
   ```
   GET /api/user/{user_id}/profile
   ```

## 注意事项

1. **Redis依赖**: 确保Redis服务运行正常
2. **LLM API**: 确保AI服务配置正确（硅基流动或OpenAI）
3. **后台线程**: 使用daemon线程，服务关闭时自动停止
4. **数据持久化**: Redis数据建议配置持久化
