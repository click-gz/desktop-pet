"""
桌面宠物后端服务 - Python 版本
基于 FastAPI 框架
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import uvicorn
import os
from datetime import datetime

from models import ChatRequest, ChatResponse
from services.chat_service import ChatService
from services.ai_provider import AIProvider
from services.redis_manager import RedisManager
from services.user_profile_service import UserProfileService
from services.session_manager import SessionManager
from services.background_tasks import BackgroundTaskManager, task_manager as bg_task_manager


# 加载环境变量
load_dotenv()

# 创建 FastAPI 应用
app = FastAPI(
    title="桌面宠物 AI 聊天后端",
    description="提供 AI 聊天功能，支持多个服务提供商",
    version="2.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务
chat_service = ChatService()

# 初始化 Redis 和用户画像服务
redis_client = RedisManager.get_client()
profile_service = UserProfileService(redis_client)

session_manager = SessionManager(redis_client)
# 初始化后台任务管理器
from services import background_tasks
background_tasks.task_manager = BackgroundTaskManager(session_manager, profile_service)

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "🐱 桌面宠物 AI 聊天后端服务",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat": "/api/chat/message",
            "chat_stream": "/api/chat/stream"
        }
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    provider_info = chat_service.get_provider_info()
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "message": "桌面宠物后端服务运行中",
        "ai_services": provider_info
    }

# 启动后台任务
@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化"""
    if background_tasks.task_manager:
        background_tasks.task_manager.start()
    print("✅ 桌面宠物后端服务已启动")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时的清理"""
    if background_tasks.task_manager:
        background_tasks.task_manager.stop()
    RedisManager.close()
    print("✅ 桌面宠物后端服务已关闭")


# 修改聊天API（替换原来的send_message函数）
@app.post("/api/chat/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """发送消息并获取回复（使用会话管理）"""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="消息不能为空")
        
        # 获取或创建用户ID
        user_id = profile_service.get_user_id(request.user_id or "default")
        
        # 初始化用户画像（如果不存在）
        profile = profile_service.get_user_profile(user_id)
        if not profile:
            await profile_service.init_user(user_id)
        
        # 获取或创建会话
        session_id = session_manager.get_or_create_session(user_id)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 用户 {user_id[:8]} (会话:{session_id[:8]}) 发送消息: {request.message}")
        
        # 添加用户消息到会话上下文
        session_manager.add_message_to_session(session_id, "user", request.message.strip())
        
        # 获取短期上下文（只用最近20条）
        session_context = session_manager.get_session_context(session_id, limit=20)
        
        # 转换为AI需要的格式
        conversation_history = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in session_context[:-1]  # 排除刚添加的用户消息
        ]
        
        # 获取个性化上下文（基于长期画像）
        context_prompt = profile_service.get_chat_context_prompt(user_id)
        
        # 构建增强的对话历史
        enhanced_history = []
        if context_prompt:
            enhanced_history.append({
                "role": "system",
                "content": context_prompt
            })
        enhanced_history.extend(conversation_history)
        
        # 调用AI服务
        reply = await chat_service.send_message(
            request.message.strip(),
            enhanced_history
        )
        
        # 保存AI回复到会话
        session_manager.add_message_to_session(session_id, "assistant", reply)
        
        # 同时保存到长期历史（用于画像分析）
        profile_service.save_chat_message(user_id, "user", request.message.strip())
        profile_service.save_chat_message(user_id, "assistant", reply)
        
        # 更新用户行为
        profile_service.record_behavior(user_id, "chat", {"message_length": len(request.message)})
        profile_service.update_last_seen(user_id)
        profile_service.increment_interaction(user_id)
        
        # 检查是否需要触发会话总结（异步处理）
        if session_manager.should_trigger_summary(session_id):
            session_manager.mark_session_for_summary(session_id)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 会话 {session_id[:8]} 已加入总结队列")
        
        # 更新亲密度
        intimacy_score, relationship_level = profile_service.update_intimacy_score(user_id)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] AI回复 (亲密度:{intimacy_score}, 关系:{relationship_level}): {reply}")
        
        return ChatResponse(
            success=True,
            reply=reply,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 聊天错误: {str(e)}")
        
        # 返回友好的错误信息
        error_message = "抱歉，我现在有点累，稍后再聊吧～"
        
        if "API key" in str(e):
            error_message = "配置错误，请检查 API Key 设置"
        elif "rate limit" in str(e):
            error_message = "请求太频繁了，休息一下吧～"
        elif "network" in str(e) or "connection" in str(e).lower():
            error_message = "网络连接失败，请检查网络设置"
        
        raise HTTPException(status_code=500, detail=error_message)

@app.get("/api/session/{user_id}/current")
async def get_current_session(user_id: str = "default"):
    """获取当前会话信息"""
    try:
        uid = profile_service.get_user_id(user_id)
        session_id = session_manager.get_active_session(uid)
        
        if not session_id:
            return {"success": True, "session": None}
        
        session_data = session_manager.get_session_data(session_id)
        context = session_manager.get_session_context(session_id, limit=10)
        
        return {
            "success": True,
            "session": {
                "session_id": session_id,
                "data": session_data,
                "recent_context": context
            }
        }
    except Exception as e:
        print(f"获取会话失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取会话失败")


@app.post("/api/session/{session_id}/end")
async def end_session(session_id: str):
    """手动结束会话"""
    try:
        session_manager.end_session(session_id)
        session_manager.mark_session_for_summary(session_id)
        
        return {
            "success": True,
            "message": "会话已结束，将进行总结"
        }
    except Exception as e:
        print(f"结束会话失败: {str(e)}")
        raise HTTPException(status_code=500, detail="结束会话失败")


@app.get("/api/session/{session_id}/summary")
async def get_session_summary(session_id: str):
    """获取会话总结"""
    try:
        summary = session_manager.get_session_summary(session_id)
        
        if not summary:
            return {
                "success": False,
                "message": "会话尚未总结或不存在"
            }
        
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        print(f"获取会话总结失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取会话总结失败")

@app.post("/api/chat/stream")
async def send_message_stream(request: ChatRequest):
    """流式发送消息（可选功能）"""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="消息不能为空")
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始流式响应: {request.message}")
        
        async def generate():
            try:
                async for chunk in chat_service.send_message_stream(
                    request.message.strip(),
                    request.conversation_history or []
                ):
                    yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                print(f"流式响应错误: {str(e)}")
                yield f"data: {{'error': '发生错误'}}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        print(f"流式聊天错误: {str(e)}")
        raise HTTPException(status_code=500, detail="发生错误")




# 使用 uvicorn 命令启动，不需要这段代码
# 运行方式：uvicorn main:app --host 0.0.0.0 --port 3000

# 如果要用 python main.py 启动，取消下面的注释
"""
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print("=" * 50)
    print("🚀 桌面宠物后端服务")
    print(f"📡 http://localhost:{port}")
    print("=" * 50)
    
    uvicorn.run(
        app,  # 直接传 app 对象
        host=host,
        port=port,
        log_level="info"
    )
"""

