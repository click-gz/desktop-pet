"""
用户画像服务
管理用户长期画像数据，包括兴趣爱好、性格特征、亲密度等
"""

import redis
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import hashlib


class UserProfileService:
    """用户画像服务"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def get_user_id(self, raw_id: str = "default") -> str:
        """生成或获取用户ID"""
        if not raw_id or raw_id == "default":
            default_key = "user:default:mapping"
            existing_id = self.redis.get(default_key)
            if existing_id:
                return existing_id.decode() if isinstance(existing_id, bytes) else existing_id
            
            user_id = hashlib.md5(f"default_{datetime.now().isoformat()}".encode()).hexdigest()
            self.redis.set(default_key, user_id)
            return user_id
        
        mapping_key = f"user:{raw_id}:mapping"
        existing_id = self.redis.get(mapping_key)
        if existing_id:
            return existing_id.decode() if isinstance(existing_id, bytes) else existing_id
        
        user_id = hashlib.md5(raw_id.encode()).hexdigest()
        self.redis.set(mapping_key, user_id)
        return user_id
    
    async def init_user(self, user_id: str):
        """初始化用户画像"""
        profile_key = f"user:{user_id}:profile"
        
        if self.redis.exists(profile_key):
            return
        
        initial_profile = {
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "last_seen": datetime.now().isoformat(),
            "total_interactions": "0",
            "intimacy_score": "0",
            "relationship_level": "陌生人",
            "interests": json.dumps([]),
            "personality_traits": json.dumps({}),
            "preferences": json.dumps({}),
            "chat_style": json.dumps({}),
        }
        
        self.redis.hset(profile_key, mapping=initial_profile)
        print(f"✅ 初始化用户画像: {user_id}")
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """获取用户画像"""
        profile_key = f"user:{user_id}:profile"
        data = self.redis.hgetall(profile_key)
        
        if not data:
            return None
        
        result = {}
        for k, v in data.items():
            k_str = k.decode() if isinstance(k, bytes) else k
            v_str = v.decode() if isinstance(v, bytes) else v
            
            if k_str in ['interests', 'personality_traits', 'preferences', 'chat_style']:
                try:
                    result[k_str] = json.loads(v_str)
                except:
                    result[k_str] = v_str
            else:
                result[k_str] = v_str
        
        return result
    
    def save_chat_message(self, user_id: str, role: str, content: str):
        """保存聊天消息到长期历史"""
        history_key = f"user:{user_id}:chat_history"
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        self.redis.rpush(history_key, json.dumps(message))
        self.redis.ltrim(history_key, -500, -1)
    
    def get_chat_history(self, user_id: str, limit: int = 100) -> List[Dict]:
        """获取聊天历史"""
        history_key = f"user:{user_id}:chat_history"
        messages = self.redis.lrange(history_key, -limit, -1)
        
        return [json.loads(msg) for msg in messages]
    
    def record_behavior(self, user_id: str, behavior_type: str, metadata: Dict = None):
        """记录用户行为"""
        behavior_key = f"user:{user_id}:behaviors"
        
        behavior = {
            "type": behavior_type,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.redis.rpush(behavior_key, json.dumps(behavior))
        self.redis.ltrim(behavior_key, -200, -1)
    
    def update_last_seen(self, user_id: str):
        """更新最后活跃时间"""
        profile_key = f"user:{user_id}:profile"
        self.redis.hset(profile_key, "last_seen", datetime.now().isoformat())
    
    def increment_interaction(self, user_id: str):
        """增加交互次数"""
        profile_key = f"user:{user_id}:profile"
        self.redis.hincrby(profile_key, "total_interactions", 1)
    
    def add_interest_tags(self, user_id: str, tags: List[str]):
        """添加兴趣标签"""
        profile_key = f"user:{user_id}:profile"
        
        current_interests_str = self.redis.hget(profile_key, "interests")
        if current_interests_str:
            current_interests_str = current_interests_str.decode() if isinstance(current_interests_str, bytes) else current_interests_str
            current_interests = json.loads(current_interests_str) if current_interests_str else []
        else:
            current_interests = []
        
        updated_interests = list(set(current_interests + tags))
        self.redis.hset(profile_key, "interests", json.dumps(updated_interests, ensure_ascii=False))
        print(f"✅ 更新用户兴趣标签: {user_id[:8]} -> {updated_interests}")
    
    def update_intimacy_score(self, user_id: str, increment: int = 1) -> Tuple[int, str]:
        """更新亲密度分数"""
        profile_key = f"user:{user_id}:profile"
        
        new_score = self.redis.hincrby(profile_key, "intimacy_score", increment)
        level = self._calculate_relationship_level(new_score)
        self.redis.hset(profile_key, "relationship_level", level)
        
        return new_score, level
    
    def _calculate_relationship_level(self, score: int) -> str:
        """计算关系等级"""
        if score < 10:
            return "陌生人"
        elif score < 30:
            return "初识"
        elif score < 60:
            return "熟人"
        elif score < 100:
            return "朋友"
        elif score < 200:
            return "好友"
        else:
            return "挚友"
    
    def calculate_intimacy(self, user_id: str) -> int:
        """计算当前亲密度"""
        profile = self.get_user_profile(user_id)
        if profile:
            return int(profile.get('intimacy_score', 0))
        return 0
    
    def update_personality_traits(self, user_id: str, traits: Dict):
        """更新性格特征"""
        profile_key = f"user:{user_id}:profile"
        
        current_traits_str = self.redis.hget(profile_key, "personality_traits")
        if current_traits_str:
            current_traits_str = current_traits_str.decode() if isinstance(current_traits_str, bytes) else current_traits_str
            current_traits = json.loads(current_traits_str) if current_traits_str else {}
        else:
            current_traits = {}
        
        current_traits.update(traits)
        self.redis.hset(profile_key, "personality_traits", json.dumps(current_traits, ensure_ascii=False))
        print(f"✅ 更新用户性格特征: {user_id[:8]} -> {current_traits}")
    
    def get_chat_context_prompt(self, user_id: str) -> str:
        """生成个性化聊天上下文提示"""
        profile = self.get_user_profile(user_id)
        
        if not profile:
            return ""
        
        context_parts = []
        
        relationship = profile.get('relationship_level', '陌生人')
        context_parts.append(f"你和主人的关系是：{relationship}")
        
        interests = profile.get('interests', [])
        if interests:
            context_parts.append(f"主人的兴趣爱好包括：{', '.join(interests[:5])}")
        
        traits = profile.get('personality_traits', {})
        if traits:
            trait_desc = ', '.join([f"{k}({v})" for k, v in list(traits.items())[:3]])
            context_parts.append(f"主人的性格特点：{trait_desc}")
        
        intimacy = int(profile.get('intimacy_score', 0))
        if intimacy > 50:
            context_parts.append("你们已经比较熟悉了，可以更亲密和随意一些")
        
        if not context_parts:
            return ""
        
        return "【用户画像】\n" + "\n".join(context_parts) + "\n\n请根据这些信息，以更个性化的方式回复主人。"
    
    async def update_profile_from_llm_analysis(self, user_id: str, analysis: Dict):
        """根据LLM分析结果更新用户画像"""
        try:
            if 'interests' in analysis and analysis['interests']:
                self.add_interest_tags(user_id, analysis['interests'])
            
            if 'personality' in analysis and analysis['personality']:
                self.update_personality_traits(user_id, analysis['personality'])
            
            if 'preferences' in analysis and analysis['preferences']:
                profile_key = f"user:{user_id}:profile"
                current_prefs_str = self.redis.hget(profile_key, "preferences")
                if current_prefs_str:
                    current_prefs_str = current_prefs_str.decode() if isinstance(current_prefs_str, bytes) else current_prefs_str
                    current_prefs = json.loads(current_prefs_str) if current_prefs_str else {}
                else:
                    current_prefs = {}
                
                current_prefs.update(analysis['preferences'])
                self.redis.hset(profile_key, "preferences", json.dumps(current_prefs, ensure_ascii=False))
            
            print(f"✅ LLM画像更新完成: {user_id[:8]}")
            
        except Exception as e:
            print(f"❌ LLM画像更新失败: {str(e)}")
