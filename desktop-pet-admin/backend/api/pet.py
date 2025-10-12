"""
宠物配置管理 API 路由
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from config import config
from services.redis_service import RedisService

router = APIRouter(prefix="/api/pet", tags=["宠物配置"])


class PetConfigUpdate(BaseModel):
    """宠物配置更新请求"""
    pet_name: Optional[str] = None
    system_prompt: Optional[str] = None
    personality: Optional[str] = None
    greeting_message: Optional[str] = None
    avatar_style: Optional[str] = None
    voice_enabled: Optional[bool] = None


# ==================== 宠物配置管理 ====================

@router.get("/config")
async def get_pet_config(token: str = Query(..., description="管理员令牌")):
    """获取宠物配置"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        client = RedisService.get_client()
        
        # 获取宠物配置
        pet_config = {
            "pet_name": client.get("pet:config:name") or "小猫咪",
            "system_prompt": client.get("pet:config:system_prompt") or "你是一个可爱的桌面宠物，名叫小猫咪。你性格活泼开朗，喜欢和用户互动聊天。",
            "personality": client.get("pet:config:personality") or "活泼可爱",
            "greeting_message": client.get("pet:config:greeting") or "喵~ 我是你的桌面宠物小猫咪！",
            "avatar_style": client.get("pet:config:avatar_style") or "cat",
            "voice_enabled": client.get("pet:config:voice_enabled") == "true",
            "last_updated": client.get("pet:config:last_updated") or None
        }
        
        return {
            "success": True,
            "data": pet_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取宠物配置失败: {str(e)}")


@router.put("/config")
async def update_pet_config(
    updates: PetConfigUpdate,
    token: str = Query(..., description="管理员令牌")
):
    """更新宠物配置"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        client = RedisService.get_client()
        updated_fields = []
        
        # 更新宠物名称
        if updates.pet_name is not None:
            client.set("pet:config:name", updates.pet_name)
            updated_fields.append("pet_name")
        
        # 更新 system prompt
        if updates.system_prompt is not None:
            client.set("pet:config:system_prompt", updates.system_prompt)
            updated_fields.append("system_prompt")
        
        # 更新性格
        if updates.personality is not None:
            client.set("pet:config:personality", updates.personality)
            updated_fields.append("personality")
        
        # 更新欢迎消息
        if updates.greeting_message is not None:
            client.set("pet:config:greeting", updates.greeting_message)
            updated_fields.append("greeting_message")
        
        # 更新头像风格
        if updates.avatar_style is not None:
            client.set("pet:config:avatar_style", updates.avatar_style)
            updated_fields.append("avatar_style")
        
        # 更新语音开关
        if updates.voice_enabled is not None:
            client.set("pet:config:voice_enabled", "true" if updates.voice_enabled else "false")
            updated_fields.append("voice_enabled")
        
        # 记录更新时间
        if updated_fields:
            client.set("pet:config:last_updated", datetime.now().isoformat())
        
        return {
            "success": True,
            "message": f"宠物配置更新成功",
            "data": {
                "updated_fields": updated_fields
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新宠物配置失败: {str(e)}")


@router.post("/config/reset")
async def reset_pet_config(token: str = Query(..., description="管理员令牌")):
    """重置宠物配置为默认值"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        client = RedisService.get_client()
        
        # 设置默认配置
        default_config = {
            "pet:config:name": "小猫咪",
            "pet:config:system_prompt": "你是一个可爱的桌面宠物，名叫小猫咪。你性格活泼开朗，喜欢和用户互动聊天。回复要简短、可爱、有趣，适当使用表情符号。",
            "pet:config:personality": "活泼可爱",
            "pet:config:greeting": "喵~ 我是你的桌面宠物小猫咪！有什么可以帮你的吗？",
            "pet:config:avatar_style": "cat",
            "pet:config:voice_enabled": "false",
            "pet:config:last_updated": datetime.now().isoformat()
        }
        
        for key, value in default_config.items():
            client.set(key, value)
        
        return {
            "success": True,
            "message": "宠物配置已重置为默认值"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置配置失败: {str(e)}")


@router.get("/stats")
async def get_pet_stats(token: str = Query(..., description="管理员令牌")):
    """获取宠物统计信息"""
    if token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    try:
        client = RedisService.get_client()
        
        # 获取统计信息
        total_users = len(RedisService.get_all_user_ids())
        total_sessions = len(RedisService.get_all_session_ids())
        
        # 计算总消息数
        total_messages = 0
        for user_id in RedisService.get_all_user_ids():
            chat_history = RedisService.get_user_chat_history(user_id, limit=10000)
            total_messages += len(chat_history)
        
        # 配置更新时间
        last_config_update = client.get("pet:config:last_updated")
        
        stats = {
            "total_interactions": total_messages,
            "unique_users": total_users,
            "total_sessions": total_sessions,
            "config_last_updated": last_config_update,
            "pet_name": client.get("pet:config:name") or "小猫咪"
        }
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

