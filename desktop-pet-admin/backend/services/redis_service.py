"""
Redis 服务封装
提供统一的 Redis 操作接口
"""

import redis
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from config import config


class RedisService:
    """Redis 服务类"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        """获取 Redis 客户端（单例模式）"""
        if cls._instance is None:
            try:
                cls._instance = redis.Redis(
                    host=config.REDIS_HOST,
                    port=config.REDIS_PORT,
                    password=config.REDIS_PASSWORD,
                    db=config.REDIS_DB,
                    decode_responses=True
                )
                # 测试连接
                cls._instance.ping()
                print(f"✅ Redis 连接成功: {config.REDIS_HOST}:{config.REDIS_PORT}")
            except redis.ConnectionError as e:
                print(f"❌ Redis 连接失败: {e}")
                raise
        return cls._instance
    
    @classmethod
    def close(cls):
        """关闭 Redis 连接"""
        if cls._instance:
            cls._instance.close()
            cls._instance = None
            print("✅ Redis 连接已关闭")
    
    # ==================== 用户相关操作 ====================
    
    @staticmethod
    def get_all_user_ids() -> List[str]:
        """获取所有用户ID"""
        client = RedisService.get_client()
        profile_keys = client.keys("user:*:profile")
        
        user_ids = []
        for key in profile_keys:
            # 从 "user:{user_id}:profile" 提取 user_id
            user_id = key.replace("user:", "").replace(":profile", "")
            user_ids.append(user_id)
        
        return user_ids
    
    @staticmethod
    def get_user_profile(user_id: str) -> Optional[Dict]:
        """获取用户画像"""
        client = RedisService.get_client()
        profile_key = f"user:{user_id}:profile"
        data = client.hgetall(profile_key)
        
        if not data:
            return None
        
        # 解析JSON字段
        profile = dict(data)
        for field in ['interests', 'personality_traits', 'preferences', 'chat_style']:
            if field in profile:
                try:
                    profile[field] = json.loads(profile[field])
                except:
                    pass
        
        return profile
    
    @staticmethod
    def update_user_profile(user_id: str, updates: Dict[str, Any]) -> bool:
        """更新用户画像"""
        client = RedisService.get_client()
        profile_key = f"user:{user_id}:profile"
        
        # 将复杂对象转为JSON字符串
        flat_updates = {}
        for k, v in updates.items():
            if isinstance(v, (dict, list)):
                flat_updates[k] = json.dumps(v, ensure_ascii=False)
            else:
                flat_updates[k] = str(v)
        
        try:
            client.hset(profile_key, mapping=flat_updates)
            return True
        except Exception as e:
            print(f"更新用户画像失败: {e}")
            return False
    
    @staticmethod
    def delete_user(user_id: str) -> int:
        """删除用户所有数据"""
        client = RedisService.get_client()
        
        keys_to_delete = [
            f"user:{user_id}:profile",
            f"user:{user_id}:chat_history",
            f"user:{user_id}:behaviors",
            f"user:{user_id}:active_session",
            f"user:{user_id}:last_profile_update",
            f"user:{user_id}:mapping"
        ]
        
        deleted_count = 0
        for key in keys_to_delete:
            if client.delete(key):
                deleted_count += 1
        
        return deleted_count
    
    @staticmethod
    def get_user_chat_history(user_id: str, limit: int = 50) -> List[Dict]:
        """获取用户聊天历史"""
        client = RedisService.get_client()
        history_key = f"user:{user_id}:chat_history"
        
        messages = client.lrange(history_key, -limit, -1)
        return [json.loads(msg) for msg in messages]
    
    @staticmethod
    def get_complete_user_profile(user_id: str) -> Optional[Dict]:
        """获取完整的用户画像（统一接口）"""
        client = RedisService.get_client()
        profile_key = f"user:{user_id}:profile"
        
        # 获取基础画像
        basic_profile = RedisService.get_user_profile(user_id)
        if not basic_profile:
            return None
        
        # 构建统一的完整画像
        from datetime import datetime
        
        complete_profile = {
            "user_id": user_id,
            "created_at": basic_profile.get("created_at"),
            "last_updated": basic_profile.get("last_seen"),
            "demographics": {},
            "interests": {
                "interest_tags": {},
                "tags": basic_profile.get("interests", []),
                "content_preferences": {},
                "peak_active_hours": []
            },
            "psychological": {
                "personality_traits": basic_profile.get("personality_traits", {}),
                "communication_style": {},
                "emotional_state": {},
                "big_five_personality": {}
            },
            "social": {
                "ai_relationship": {
                    "intimacy_score": int(basic_profile.get("intimacy_score", 0)),
                    "relationship_level": basic_profile.get("relationship_level", "陌生人"),
                    "trust_level": 0,
                    "interaction_comfort": 0
                },
                "interaction_patterns": {}
            },
            "statistics": {
                "total_interactions": int(basic_profile.get("total_interactions", 0)),
                "total_messages": 0,
                "total_sessions": 0,
                "days_since_registration": 0
            }
        }
        
        # 读取所有增强数据
        try:
            # 职业数据
            occupation_data = client.hget(profile_key, "occupation_data")
            if occupation_data:
                occ = json.loads(occupation_data)
                complete_profile["demographics"]["occupation"] = occ.get("value")
                complete_profile["demographics"]["occupation_confidence"] = occ.get("confidence", 0)
            
            # 年龄数据
            age_data = client.hget(profile_key, "age_data")
            if age_data:
                age = json.loads(age_data)
                complete_profile["demographics"]["age_range"] = age.get("value")
                complete_profile["demographics"]["age_confidence"] = age.get("confidence", 0)
            
            # 性别数据
            gender_data = client.hget(profile_key, "gender_data")
            if gender_data:
                gender = json.loads(gender_data)
                complete_profile["demographics"]["gender"] = gender.get("value")
                complete_profile["demographics"]["gender_confidence"] = gender.get("confidence", 0)
            
            # 沟通风格
            comm_style = client.hget(profile_key, "communication_style")
            if comm_style:
                complete_profile["psychological"]["communication_style"] = json.loads(comm_style)
            
            # 情感模式
            emotional = client.hget(profile_key, "emotional_pattern")
            if emotional:
                complete_profile["psychological"]["emotional_state"] = json.loads(emotional)
            
            # 当前情绪
            mood = client.hget(profile_key, "current_mood")
            if mood:
                complete_profile["psychological"]["current_mood"] = json.loads(mood)
            
            # 动机需求
            motivations = client.hget(profile_key, "motivations")
            if motivations:
                complete_profile["psychological"]["motivations"] = json.loads(motivations)
            
            # 将兴趣标签转换为带权重的格式
            if complete_profile["interests"]["tags"]:
                for tag in complete_profile["interests"]["tags"]:
                    complete_profile["interests"]["interest_tags"][tag] = {
                        "weight": 0.7,
                        "sub_tags": [],
                        "trend": "稳定"
                    }
            
            # 计算信任度和互动舒适度
            intimacy = complete_profile["social"]["ai_relationship"]["intimacy_score"]
            complete_profile["social"]["ai_relationship"]["trust_level"] = min(intimacy / 200, 1.0)
            complete_profile["social"]["ai_relationship"]["interaction_comfort"] = min(intimacy / 150, 1.0)
            
            # 计算注册天数
            if complete_profile.get("created_at"):
                created = datetime.fromisoformat(complete_profile["created_at"])
                days = (datetime.now() - created).days
                complete_profile["statistics"]["days_since_registration"] = days
        
        except Exception as e:
            print(f"读取增强数据失败: {str(e)}")
        
        return complete_profile
    
    # ==================== 会话相关操作 ====================
    
    @staticmethod
    def get_all_session_ids() -> List[str]:
        """获取所有会话ID"""
        client = RedisService.get_client()
        session_keys = client.keys("session:*")
        
        session_ids = []
        for key in session_keys:
            if key.endswith(':context') or key.endswith(':summary') or key == 'session:summary_queue':
                continue
            session_id = key.replace("session:", "")
            session_ids.append(session_id)
        
        return session_ids
    
    @staticmethod
    def get_session_data(session_id: str) -> Optional[Dict]:
        """获取会话元数据"""
        client = RedisService.get_client()
        session_key = f"session:{session_id}"
        data = client.hgetall(session_key)
        
        return dict(data) if data else None
    
    @staticmethod
    def get_session_context(session_id: str) -> List[Dict]:
        """获取会话对话内容"""
        client = RedisService.get_client()
        context_key = f"session:{session_id}:context"
        
        messages = client.lrange(context_key, 0, -1)
        return [json.loads(msg) for msg in messages]
    
    @staticmethod
    def get_session_summary(session_id: str) -> Optional[Dict]:
        """获取会话总结"""
        client = RedisService.get_client()
        summary_key = f"session:{session_id}:summary"
        data = client.hgetall(summary_key)
        
        if not data:
            return None
        
        summary = {}
        for k, v in data.items():
            try:
                summary[k] = json.loads(v)
            except:
                summary[k] = v
        
        return summary
    
    @staticmethod
    def delete_session(session_id: str) -> int:
        """删除会话所有数据"""
        client = RedisService.get_client()
        
        keys_to_delete = [
            f"session:{session_id}",
            f"session:{session_id}:context",
            f"session:{session_id}:summary"
        ]
        
        return sum(client.delete(key) for key in keys_to_delete)
    
    # ==================== 统计相关操作 ====================
    
    @staticmethod
    def get_database_stats() -> Dict:
        """获取数据库统计信息"""
        client = RedisService.get_client()
        
        total_keys = client.dbsize()
        user_profiles = len(client.keys("user:*:profile"))
        session_contexts = client.keys("session:*:context")
        total_sessions = len(session_contexts)
        
        # 计算总消息数
        total_messages = sum(client.llen(key) for key in session_contexts)
        
        # 待总结队列
        pending_summaries = client.scard("session:summary_queue")
        
        # 内存信息
        memory_info = client.info('memory')
        
        return {
            "total_keys": total_keys,
            "total_users": user_profiles,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "pending_summaries": pending_summaries,
            "memory_used": memory_info.get('used_memory_human', 'N/A'),
            "memory_peak": memory_info.get('used_memory_peak_human', 'N/A'),
            "timestamp": datetime.now().isoformat()
        }
    
    @staticmethod
    def get_redis_info() -> Dict:
        """获取 Redis 详细信息"""
        client = RedisService.get_client()
        info = client.info()
        
        return {
            "server": {
                "redis_version": info.get('redis_version'),
                "os": info.get('os'),
                "uptime_in_days": info.get('uptime_in_days')
            },
            "memory": {
                "used_memory_human": info.get('used_memory_human'),
                "used_memory_peak_human": info.get('used_memory_peak_human'),
                "mem_fragmentation_ratio": info.get('mem_fragmentation_ratio')
            },
            "stats": {
                "total_connections_received": info.get('total_connections_received'),
                "total_commands_processed": info.get('total_commands_processed'),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0)
            }
        }
    
    # ==================== 系统管理操作 ====================
    
    @staticmethod
    def cleanup_expired_sessions() -> int:
        """清理已过期的会话"""
        client = RedisService.get_client()
        cleaned = 0
        
        # 查找所有会话
        session_keys = client.keys("session:*")
        for key in session_keys:
            ttl = client.ttl(key)
            # TTL为-2表示键不存在，-1表示没有过期时间
            if ttl == -2:
                client.delete(key)
                cleaned += 1
        
        return cleaned
    
    @staticmethod
    def flush_database():
        """清空整个数据库（危险操作）"""
        client = RedisService.get_client()
        client.flushdb()

