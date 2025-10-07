"""
LLM用户画像分析器
使用LLM对用户会话进行智能分析，提取用户特征
"""

import json
from typing import Dict, List, Optional
from services.ai_provider import AIProvider


class LLMProfileAnalyzer:
    """LLM画像分析器"""
    
    def __init__(self):
        self.ai_provider = AIProvider()
    
    async def summarize_session(
        self, 
        context: List[Dict], 
        previous_summary_context: Optional[str] = None
    ) -> Dict:
        """总结会话内容，提取关键信息（支持增量分析）
        
        Args:
            context: 本次需要分析的对话列表
            previous_summary_context: 上次总结的简要内容（用于理解连贯性）
        """
        
        # 构建提示词
        conversation_text = ""
        for msg in context:
            role_name = "用户" if msg["role"] == "user" else "AI助手"
            conversation_text += f"{role_name}: {msg['content']}\n"
        
        # 添加历史上下文（如果存在）
        context_section = ""
        if previous_summary_context:
            context_section = f"""【之前的对话总结】
{previous_summary_context}

注意：以上是之前对话的总结，请参考这些信息来理解本次对话的连贯性。

"""
        
        analysis_prompt = f"""{context_section}请分析以下对话（本次新增内容），提取用户的关键信息：

{conversation_text}

请以JSON格式输出分析结果，包含以下字段：
1. interests_mentioned: 对话中提到的用户兴趣爱好（列表，只包含本次新提到的）
2. personality_hints: 用户性格特点的线索
3. relationship_progress: 关系进展情况描述
4. topics_discussed: 讨论的主要话题（列表，只包含本次讨论的）
5. emotional_tone: 对话的情感基调

重要：只需分析本次新增的对话内容，但可以参考之前的总结理解上下文连贯性。
仅输出JSON，不要其他说明。"""

        try:
            # 调用AI进行分析
            response = await self.ai_provider.send_message(
                analysis_prompt,
                []
            )
            
            # 尝试解析JSON
            try:
                # 清理响应，提取JSON部分
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    summary = json.loads(json_str)
                else:
                    # 如果没有找到JSON，返回默认结构
                    summary = {
                        "interests_mentioned": [],
                        "personality_hints": "",
                        "relationship_progress": "",
                        "topics_discussed": [],
                        "emotional_tone": ""
                    }
            except json.JSONDecodeError:
                print(f"⚠️ LLM返回的不是有效JSON，原始响应: {response[:200]}")
                summary = {
                    "interests_mentioned": [],
                    "personality_hints": "",
                    "relationship_progress": "",
                    "topics_discussed": [],
                    "emotional_tone": "",
                    "raw_analysis": response[:500]  # 保存原始分析的前500字符
                }
            
            return summary
            
        except Exception as e:
            print(f"❌ 会话总结失败: {str(e)}")
            return {
                "interests_mentioned": [],
                "personality_hints": "",
                "relationship_progress": "",
                "topics_discussed": [],
                "emotional_tone": "",
                "error": str(e)
            }
    
    async def analyze_user_profile(self, chat_history: List[Dict], behaviors: List[Dict]) -> Dict:
        """深度分析用户画像（定期执行）"""
        
        # 限制历史长度
        recent_chats = chat_history[-50:] if len(chat_history) > 50 else chat_history
        
        # 构建对话摘要
        conversation_summary = ""
        for msg in recent_chats:
            role_name = "用户" if msg["role"] == "user" else "AI"
            conversation_summary += f"{role_name}: {msg['content'][:100]}...\n"
        
        # 构建行为摘要
        behavior_summary = ""
        for behavior in behaviors[-20:]:
            behavior_summary += f"- {behavior.get('type')}: {behavior.get('metadata', {})}\n"
        
        analysis_prompt = f"""基于以下用户数据，进行深度画像分析：

【最近对话】
{conversation_summary}

【用户行为】
{behavior_summary}

请以JSON格式输出分析结果：
{{
    "interests": ["兴趣1", "兴趣2", ...],
    "personality": {{
        "外向性": "高/中/低",
        "情绪稳定性": "高/中/低",
        "友好度": "高/中/低"
    }},
    "preferences": {{
        "聊天风格": "描述",
        "话题偏好": "描述"
    }},
    "summary": "总体画像描述"
}}

仅输出JSON，不要其他说明。"""

        try:
            response = await self.ai_provider.send_message(analysis_prompt, [])
            
            # 解析JSON
            try:
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    analysis = json.loads(json_str)
                else:
                    analysis = {
                        "interests": [],
                        "personality": {},
                        "preferences": {},
                        "summary": ""
                    }
            except json.JSONDecodeError:
                print(f"⚠️ 画像分析JSON解析失败")
                analysis = {
                    "interests": [],
                    "personality": {},
                    "preferences": {},
                    "summary": "",
                    "raw_analysis": response[:500]
                }
            
            return analysis
            
        except Exception as e:
            print(f"❌ 用户画像分析失败: {str(e)}")
            return {
                "interests": [],
                "personality": {},
                "preferences": {},
                "summary": "",
                "error": str(e)
            }


# 全局分析器实例
llm_analyzer = LLMProfileAnalyzer()
