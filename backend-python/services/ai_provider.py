"""
AI 服务提供商适配器
支持多个 AI 服务，自动故障转移
"""

import os
from typing import List, Dict, Optional, AsyncGenerator
from openai import AsyncOpenAI
import json
import requests
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

# 系统提示词 - 定义宠物的性格
SYSTEM_PROMPT = """你是一只可爱的桌面宠物，性格活泼开朗，喜欢和主人聊天。

你的特点：
- 友好、善解人意、有点调皮
- 会用可爱的语气和表情符号
- 回复要简短精炼，一般1-3句话
- 偶尔会提到自己是桌面宠物，需要休息和能量
- 会关心主人的工作和生活

回复风格：
- 使用口语化、轻松的语气
- 适当使用 emoji 表情 😊
- 不要太正式或太长
- 像朋友一样聊天

请记住你是一只虚拟宠物，要可爱且有趣！"""


class AIProvider:
    """AI 服务提供商管理器"""
    
    def __init__(self):
        self.providers = []
        self.max_tokens = 150
        self.temperature = 0.8
        self.initialize_providers()
    
    def initialize_providers(self):
        """初始化所有可用的 AI 提供商"""
        priority_str = os.getenv("AI_PROVIDER_PRIORITY", "siliconflow,openai")
        priority = [p.strip() for p in priority_str.split(",")]
        print( os.getenv("SILICONFLOW_API_KEY"))
        # 硅基流动 - 使用直接 API 调用
        if os.getenv("SILICONFLOW_API_KEY"):
            self.providers.append({
                "name": "siliconflow",
                "type": "direct_api",  # 直接API调用
                "api_key": os.getenv("SILICONFLOW_API_KEY"),
                "base_url": os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1"),
                "model": os.getenv("SILICONFLOW_MODEL", "Qwen/QwQ-32B"),
                "priority": priority.index("siliconflow") if "siliconflow" in priority else 999
            })
            
            print(f"✅ 硅基流动 AI 已配置 (模型: {os.getenv('SILICONFLOW_MODEL', 'Qwen/QwQ-32B')})")
        
        # OpenAI - 使用 OpenAI SDK
        if os.getenv("OPENAI_API_KEY"):
            openai_client = AsyncOpenAI(
                api_key=os.getenv("OPENAI_API_KEY"),
                base_url=os.getenv("OPENAI_BASE_URL")
            )
            
            self.providers.append({
                "name": "openai",
                "type": "openai_sdk",  # OpenAI SDK
                "client": openai_client,
                "model": os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
                "priority": priority.index("openai") if "openai" in priority else 999
            })
            
            print(f"✅ OpenAI 已配置 (模型: {os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')})")
        
        # 按优先级排序
        self.providers.sort(key=lambda p: p["priority"])
        
        if not self.providers:
            print("⚠️ 警告：没有配置任何 AI 服务！")
        else:
            names = [p["name"] for p in self.providers]
            print(f"🤖 AI 服务优先级: {' → '.join(names)}")
    
    async def send_message(self, message: str, conversation_history: List[Dict]) -> str:
        """发送消息并获取回复（自动选择可用的服务）"""
        if not self.providers:
            raise Exception("未配置任何 AI 服务，请检查环境变量")
        
        # 检查 conversation_history 是否已包含 system prompt
        has_system_prompt = any(msg.get("role") == "system" for msg in conversation_history)
        
        messages = []
        
        # 如果历史中没有 system prompt，添加默认的
        if not has_system_prompt:
            messages.append({"role": "system", "content": SYSTEM_PROMPT})
        
        # 添加对话历史和当前消息
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        # 限制历史消息数量（保留前面的 system prompts + 最近10条消息）
        system_messages = [msg for msg in messages if msg.get("role") == "system"]
        other_messages = [msg for msg in messages if msg.get("role") != "system"]
        limited_messages = system_messages + other_messages[-11:]
        
        # 按优先级尝试每个提供商
        for provider in self.providers:
            try:
                print(f"尝试使用 {provider['name']} ({provider['model']})...")
                
                # 根据类型选择调用方式
                if provider.get('type') == 'direct_api':
                    # 硅基流动 - 直接 API 调用
                    reply = await self._call_direct_api(provider, limited_messages)
                else:
                    # OpenAI SDK 调用
                    reply = await self._call_openai_sdk(provider, limited_messages)
                
                print(f"✅ {provider['name']} 调用成功")
                return reply
                
            except Exception as e:
                print(f"❌ {provider['name']} 调用失败: {str(e)}")
                print(f"   错误类型: {type(e).__name__}")
                
                # 如果是最后一个提供商，抛出错误
                if provider == self.providers[-1]:
                    raise self.normalize_error(e)
                
                # 否则继续尝试下一个
                print(f"⏭️ 切换到下一个 AI 服务...")
        
        raise Exception("所有 AI 服务都不可用")
    
    async def _call_direct_api(self, provider: Dict, messages: List[Dict]) -> str:
        """直接调用 API（用于硅基流动）"""
        url = f"{provider['base_url']}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {provider['api_key']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": provider['model'],
            "messages": messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": False,
            "enable_thinking": False
        }
        
        # 使用 aiohttp 进行异步请求
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=30) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API 返回错误 {response.status}: {error_text}")
                
                data = await response.json()
                
                if 'choices' in data and len(data['choices']) > 0:
                    reply = data['choices'][0]['message']['content'].strip()
                    
                    # 打印 token 使用情况
                    if 'usage' in data:
                        print(f"   Token 使用: {data['usage']}")
                    
                    return reply
                else:
                    raise Exception("API 返回格式错误")
    
    async def _call_openai_sdk(self, provider: Dict, messages: List[Dict]) -> str:
        """使用 OpenAI SDK 调用（用于 OpenAI）"""
        completion = await provider["client"].chat.completions.create(
            model=provider["model"],
            messages=messages,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            stop=["\n\n", "。。", "！！"]
        )

        reply = completion.choices[0].message.content.strip()
        
        if hasattr(completion, 'usage'):
            print(f"   Token 使用: {completion.usage}")
        
        return reply
    
    
    async def send_message_stream(
        self, 
        message: str, 
        conversation_history: List[Dict]
    ) -> AsyncGenerator[str, None]:
        """流式发送消息"""
        if not self.providers:
            raise Exception("未配置任何 AI 服务")
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *conversation_history,
            {"role": "user", "content": message}
        ]
        
        limited_messages = [messages[0]] + messages[-11:]
        
        # 只使用第一个可用的提供商进行流式传输
        provider = self.providers[0]
        
        try:
            print(f"使用 {provider['name']} Stream API ({provider['model']})...")
            
            stream = await provider["client"].chat.completions.create(
                model=provider["model"],
                messages=limited_messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield json.dumps({"chunk": content})
            
            print(f"✅ {provider['name']} Stream 调用完成")
            
        except Exception as e:
            print(f"❌ {provider['name']} Stream 调用失败: {str(e)}")
            raise self.normalize_error(e)
    
    def normalize_error(self, error: Exception) -> Exception:
        """标准化错误信息"""
        error_str = str(error)
        
        if "API key" in error_str or "401" in error_str:
            return Exception("API key 无效，请检查配置")
        elif "rate limit" in error_str or "429" in error_str:
            return Exception("rate limit exceeded")
        elif "network" in error_str.lower() or "connection" in error_str.lower():
            return Exception("network error")
        else:
            return Exception(f"AI API 错误: {error_str}")
    
    def get_provider_info(self) -> Dict:
        """获取当前使用的服务信息"""
        if not self.providers:
            return {"available": False}
        
        return {
            "available": True,
            "providers": [
                {"name": p["name"], "model": p["model"]}
                for p in self.providers
            ],
            "primary": {
                "name": self.providers[0]["name"],
                "model": self.providers[0]["model"]
            }
        }


# 全局实例
ai_provider = AIProvider()

