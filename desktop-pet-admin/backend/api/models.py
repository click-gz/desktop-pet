"""
数据模型定义
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class LoginResponse(BaseModel):
    """登录响应"""
    success: bool
    token: str
    message: str


class UserProfile(BaseModel):
    """用户画像"""
    user_id: str
    created_at: str
    last_seen: str
    total_interactions: int
    intimacy_score: int
    relationship_level: str
    interests: List[str] = []
    personality_traits: Dict[str, Any] = {}
    preferences: Dict[str, Any] = {}


class SessionInfo(BaseModel):
    """会话信息"""
    session_id: str
    user_id: str
    status: str
    message_count: int
    start_time: str
    last_active: str


class UpdateUserRequest(BaseModel):
    """更新用户请求"""
    intimacy_score: Optional[int] = None
    interests: Optional[List[str]] = None
    preferences: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    """通用 API 响应"""
    success: bool
    message: str = ""
    data: Optional[Any] = None

