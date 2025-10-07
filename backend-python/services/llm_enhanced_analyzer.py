"""
LLM 增强的用户画像分析服务
使用 AI 进行更深入的用户画像分析
"""

import json
from typing import Dict, List, Optional
from services.ai_provider import AIProvider


class LLMEnhancedAnalyzer:
    """LLM 增强的画像分析器"""
    
    def __init__(self, ai_provider: AIProvider):
        self.ai_provider = ai_provider
    
    async def analyze_user_profile_comprehensive(
        self, 
        chat_history: List[Dict],
        current_profile: Dict
    ) -> Dict:
        """全面分析用户画像"""
        
        # 提取最近的对话内容
        recent_messages = chat_history[-30:] if len(chat_history) > 30 else chat_history
        conversation_text = self._format_conversation(recent_messages)
        
        # 构建分析提示
        prompt = self._build_analysis_prompt(conversation_text, current_profile)
        
        try:
            # 调用 AI 分析
            analysis_result = await self.ai_provider.chat(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3  # 降低温度以获得更稳定的结果
            )
            
            # 解析结果
            return self._parse_analysis_result(analysis_result)
            
        except Exception as e:
            print(f"❌ LLM 画像分析失败: {str(e)}")
            return {}
    
    def _format_conversation(self, messages: List[Dict]) -> str:
        """格式化对话内容"""
        formatted = []
        for msg in messages:
            role = "用户" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "")
            formatted.append(f"{role}: {content}")
        return "\n".join(formatted)
    
    def _build_analysis_prompt(self, conversation: str, current_profile: Dict) -> str:
        """构建分析提示词"""
        
        prompt = f"""作为一个专业的用户画像分析师，请基于以下对话内容，深入分析用户的特征。

【对话内容】
{conversation}

【当前画像概要】
- 亲密度等级: {current_profile.get('relationship_level', '陌生人')}
- 互动次数: {current_profile.get('total_interactions', 0)}
- 已知兴趣: {', '.join(current_profile.get('interests', [])[:5]) if current_profile.get('interests') else '未知'}

请从以下维度进行分析，并以 JSON 格式返回结果：

1. **基础属性推测**（confidence 表示置信度 0-1）
   - age_range: 年龄段（如 "18-24", "25-30", "31-40", "40+"）
   - gender: 性别（"male", "female", "unknown"）
   - occupation: 职业（如 "程序员", "学生", "设计师"等）
   - education: 教育程度（"本科", "硕士", "博士"等）
   - location_hints: 地理位置线索

2. **兴趣偏好分析**（weight 表示权重 0-1）
   - interest_tags: {{
       "一级分类": {{
         "weight": 权重,
         "sub_tags": ["具体标签"],
         "trend": "上升/稳定/下降"
       }}
     }}
   - topic_preferences: 喜欢讨论的话题类型

3. **心理特征分析**（score 表示分数 0-1）
   - personality: {{
       "openness": 开放性得分,
       "conscientiousness": 尽责性得分,
       "extraversion": 外向性得分,
       "agreeableness": 宜人性得分,
       "neuroticism": 神经质得分
     }}
   - current_mood: 当前情绪（"happy", "neutral", "sad", "anxious", "excited"等）
   - communication_style: {{
       "formality": "formal/casual",
       "humor_appreciation": 幽默接受度,
       "preferred_tone": "friendly/professional/humorous"
     }}

4. **需求动机分析**（score 表示分数 0-1）
   - motivations: {{
       "companionship": 陪伴需求,
       "productivity": 效率需求,
       "entertainment": 娱乐需求,
       "learning": 学习需求,
       "emotional_support": 情感支持需求
     }}

5. **关系发展建议**
   - interaction_suggestions: 互动建议列表
   - content_recommendations: 内容推荐列表
   - relationship_insights: 关系洞察

请严格按照 JSON 格式返回，不要包含任何多余的文字说明。只返回纯 JSON 对象。
"""
        return prompt
    
    def _parse_analysis_result(self, result: str) -> Dict:
        """解析分析结果"""
        try:
            # 尝试提取 JSON 内容
            result = result.strip()
            
            # 移除可能的 markdown 代码块标记
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            
            result = result.strip()
            
            # 解析 JSON
            analysis = json.loads(result)
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON 解析失败，尝试提取部分内容: {str(e)}")
            # 返回空结果
            return {}
    
    async def analyze_emotional_state(self, recent_messages: List[Dict]) -> Dict:
        """分析情感状态（快速版本）"""
        
        if not recent_messages:
            return {"current_mood": "neutral", "confidence": 0.0}
        
        # 只分析最近5条用户消息
        user_messages = [
            msg["content"] for msg in recent_messages[-10:] 
            if msg.get("role") == "user"
        ][-5:]
        
        if not user_messages:
            return {"current_mood": "neutral", "confidence": 0.0}
        
        conversation = "\n".join([f"用户: {msg}" for msg in user_messages])
        
        prompt = f"""分析以下对话中用户的情绪状态，只返回 JSON 格式：

{conversation}

返回格式：
{{
  "current_mood": "情绪类型（happy/sad/anxious/excited/neutral/angry/tired）",
  "intensity": "强度（low/medium/high）",
  "confidence": 置信度（0-1）,
  "key_indicators": ["情绪指示词1", "情绪指示词2"]
}}
"""
        
        try:
            result = await self.ai_provider.chat(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            return self._parse_analysis_result(result)
        except Exception as e:
            print(f"❌ 情感分析失败: {str(e)}")
            return {"current_mood": "neutral", "confidence": 0.0}
    
    async def suggest_personalized_response_style(self, user_profile: Dict) -> str:
        """建议个性化的回复风格"""
        
        relationship_level = user_profile.get("relationship_level", "陌生人")
        interests = user_profile.get("interests", [])
        personality = user_profile.get("personality_traits", {})
        
        style_guide = f"""基于用户画像生成回复风格指导：

关系等级：{relationship_level}
兴趣爱好：{', '.join(interests[:3]) if interests else '未知'}
性格特点：{', '.join([f'{k}({v})' for k, v in list(personality.items())[:2]]) if personality else '未知'}

回复风格建议：
"""
        
        if relationship_level in ["陌生人", "初识"]:
            style_guide += "- 保持礼貌和专业\n- 语气友善但不过分亲密\n- 多用疑问句了解用户"
        elif relationship_level in ["熟人", "朋友"]:
            style_guide += "- 可以更轻松随意\n- 适当使用表情符号\n- 可以开些轻松的玩笑"
        else:  # 好友、挚友
            style_guide += "- 非常亲密和随意\n- 可以用亲昵的称呼\n- 分享更多个人化的内容"
        
        return style_guide

