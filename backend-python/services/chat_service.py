"""
聊天服务
"""

from typing import List, Dict, AsyncGenerator
from .ai_provider import ai_provider


class ChatService:
    """聊天服务类"""
    
    async def send_message(self, message: str, conversation_history: List[Dict]) -> str:
        """发送消息并获取回复"""
        return await ai_provider.send_message(message, conversation_history)
    
    async def send_message_stream(
        self, 
        message: str, 
        conversation_history: List[Dict]
    ) -> AsyncGenerator[str, None]:
        """流式发送消息"""
        async for chunk in ai_provider.send_message_stream(message, conversation_history):
            yield chunk
    
    def get_provider_info(self) -> Dict:
        """获取服务信息"""
        return ai_provider.get_provider_info()

