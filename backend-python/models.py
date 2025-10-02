"""
数据模型定义
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class Message(BaseModel):
    """对话消息"""
    role: str = Field(..., description="角色: user 或 assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(..., description="用户消息")
    user_id: Optional[str] = Field(
        default="default",
        description="用户ID（用于用户画像）"
    )
    conversation_history: Optional[List[Message]] = Field(
        default=None,
        description="对话历史"
    )


class ChatResponse(BaseModel):
    """聊天响应"""
    success: bool = Field(..., description="是否成功")
    reply: str = Field(..., description="AI 回复")
    timestamp: str = Field(..., description="时间戳")

