"""
管理后台 API 路由
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime

from config import config
from services.redis_service import RedisService
from api.models import ApiResponse, UpdateUserRequest

router = APIRouter(prefix="/api/admin", tags=["管理后台"])


# ==================== 统计信息 ====================

@router.get("/stats/overview")
async def get_overview_stats(token: str = Query(..., description="管理员令牌")):
    """获取系统概览统计"""
    # 简单的 Token 验证
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        stats = RedisService.get_database_stats()
        return ApiResponse(
            success=True,
            message="获取成功",
            data=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")


# ==================== 用户管理 ====================

@router.get("/users")
async def list_users(
    token: str = Query(..., description="管理员令牌"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量")
):
    """获取用户列表"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        user_ids = RedisService.get_all_user_ids()
        total = len(user_ids)
        
        # 分页
        start = (page - 1) * page_size
        end = start + page_size
        page_ids = user_ids[start:end]
        
        users = []
        for user_id in page_ids:
            profile = RedisService.get_user_profile(user_id)
            if profile:
                # 获取活跃会话
                client = RedisService.get_client()
                active_session = client.get(f"user:{user_id}:active_session")
                profile['active_session'] = active_session if active_session else None
                users.append(profile)
        
        return ApiResponse(
            success=True,
            data={
                "users": users,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户列表失败: {str(e)}")


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, token: str = Query(...)):
    """获取用户详细信息"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        profile = RedisService.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取聊天历史
        chat_history = RedisService.get_user_chat_history(user_id, limit=50)
        
        # 获取活跃会话信息
        client = RedisService.get_client()
        active_session_id = client.get(f"user:{user_id}:active_session")
        
        active_session = None
        if active_session_id:
            active_session = RedisService.get_session_data(active_session_id)
        
        return ApiResponse(
            success=True,
            data={
                "profile": profile,
                "chat_history": chat_history,
                "active_session": active_session
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户详情失败: {str(e)}")


@router.get("/users/{user_id}/profile")
async def get_user_complete_profile(user_id: str, token: str = Query(...)):
    """获取完整的用户画像（统一接口）"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        # 获取完整画像
        complete_profile = RedisService.get_complete_user_profile(user_id)
        
        if not complete_profile:
            raise HTTPException(status_code=404, detail="用户画像不存在")
        
        return ApiResponse(
            success=True,
            data=complete_profile
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户画像失败: {str(e)}")


@router.post("/users/{user_id}/refresh_profile")
async def refresh_user_profile(user_id: str, token: str = Query(...)):
    """手动刷新用户画像（立即触发分析）"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        # 清除更新时间限制
        client = RedisService.get_client()
        last_update_key = f"user:{user_id}:last_profile_update"
        client.delete(last_update_key)
        
        return ApiResponse(
            success=True,
            message="画像刷新请求已提交，请等待30秒后查看更新结果"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刷新画像失败: {str(e)}")


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    updates: UpdateUserRequest,
    token: str = Query(...)
):
    """更新用户信息"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        # 构建更新数据
        update_data = {}
        if updates.intimacy_score is not None:
            update_data['intimacy_score'] = updates.intimacy_score
            # 计算关系等级
            score = updates.intimacy_score
            if score < 10:
                level = "陌生人"
            elif score < 30:
                level = "初识"
            elif score < 60:
                level = "熟人"
            elif score < 100:
                level = "朋友"
            elif score < 200:
                level = "好友"
            else:
                level = "挚友"
            update_data['relationship_level'] = level
        
        if updates.interests is not None:
            update_data['interests'] = updates.interests
        
        if updates.preferences is not None:
            update_data['preferences'] = updates.preferences
        
        if update_data:
            success = RedisService.update_user_profile(user_id, update_data)
            if success:
                return ApiResponse(
                    success=True,
                    message="更新成功",
                    data=update_data
                )
        
        raise HTTPException(status_code=400, detail="没有需要更新的数据")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新用户失败: {str(e)}")


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, token: str = Query(...)):
    """删除用户"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    if not config.ENABLE_DANGEROUS_OPERATIONS:
        raise HTTPException(status_code=403, detail="危险操作已禁用")
    
    try:
        deleted_count = RedisService.delete_user(user_id)
        return ApiResponse(
            success=True,
            message=f"用户已删除（清理了 {deleted_count} 个键）"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除用户失败: {str(e)}")


# ==================== 会话管理 ====================

@router.get("/sessions")
async def list_sessions(
    token: str = Query(...),
    status: Optional[str] = Query(None, description="会话状态过滤")
):
    """获取会话列表"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        session_ids = RedisService.get_all_session_ids()
        
        sessions = []
        for session_id in session_ids:
            session_data = RedisService.get_session_data(session_id)
            if not session_data:
                continue
            
            # 状态过滤
            if status and session_data.get('status') != status:
                continue
            
            # 获取实际消息数
            context = RedisService.get_session_context(session_id)
            session_data['actual_message_count'] = len(context)
            
            sessions.append(session_data)
        
        # 按开始时间排序
        sessions.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        
        return ApiResponse(
            success=True,
            data={
                "sessions": sessions,
                "total": len(sessions)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, token: str = Query(...)):
    """获取会话详情"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        session_data = RedisService.get_session_data(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        context = RedisService.get_session_context(session_id)
        summary = RedisService.get_session_summary(session_id)
        
        return ApiResponse(
            success=True,
            data={
                "session": session_data,
                "context": context,
                "summary": summary
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话详情失败: {str(e)}")


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, token: str = Query(...)):
    """删除会话"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    if not config.ENABLE_DANGEROUS_OPERATIONS:
        raise HTTPException(status_code=403, detail="危险操作已禁用")
    
    try:
        deleted_count = RedisService.delete_session(session_id)
        return ApiResponse(
            success=True,
            message=f"会话已删除（清理了 {deleted_count} 个键）"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


# ==================== 系统管理 ====================

@router.get("/redis/info")
async def get_redis_info(token: str = Query(...)):
    """获取 Redis 信息"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        info = RedisService.get_redis_info()
        return ApiResponse(
            success=True,
            data=info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取Redis信息失败: {str(e)}")


@router.post("/redis/cleanup")
async def cleanup_expired_data(token: str = Query(...)):
    """清理过期数据"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        cleaned = RedisService.cleanup_expired_sessions()
        return ApiResponse(
            success=True,
            message=f"已清理 {cleaned} 条过期数据"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理失败: {str(e)}")


@router.delete("/redis/flush")
async def flush_all_data(
    token: str = Query(...),
    confirm: str = Query(..., description="确认码")
):
    """清空所有数据（危险操作）"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    if not config.ENABLE_DANGEROUS_OPERATIONS:
        raise HTTPException(status_code=403, detail="危险操作已禁用")
    
    if confirm != "CONFIRM_FLUSH_ALL":
        raise HTTPException(status_code=400, detail="需要正确的确认码")
    
    try:
        RedisService.flush_database()
        return ApiResponse(
            success=True,
            message="所有数据已清空"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空失败: {str(e)}")

