"""
会话管理服务
管理短期对话上下文和长期用户画像的分离
"""

import redis
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import uuid


class SessionManager:
    """会话管理器 - 区分短期上下文和长期画像"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        
    # ==================== 会话生命周期管理 ====================
    
    def create_session(self, user_id: str) -> str:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        session_key = f"session:{session_id}"
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "start_time": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat(),
            "message_count": "0",
            "status": "active"  # active, ended, summarized
        }
        
        self.redis.hset(session_key, mapping=session_data)
        self.redis.expire(session_key, 24 * 3600)  # 24小时过期
        
        # 关联用户的活跃会话
        self.redis.set(f"user:{user_id}:active_session", session_id, ex=24*3600)
        
        return session_id
    
    def get_active_session(self, user_id: str) -> Optional[str]:
        """获取用户的活跃会话"""
        session_id = self.redis.get(f"user:{user_id}:active_session")
        if session_id:
            return session_id.decode() if isinstance(session_id, bytes) else session_id
        return None
    
    def get_or_create_session(self, user_id: str) -> str:
        """获取或创建会话"""
        session_id = self.get_active_session(user_id)
        
        if session_id:
            # 检查会话是否过期（超过30分钟无活动）
            last_active = self.get_session_last_active(session_id)
            if last_active:
                inactive_time = datetime.now() - datetime.fromisoformat(last_active)
                if inactive_time.total_seconds() > 1800:  # 30分钟
                    # 会话过期，结束并创建新会话
                    self.end_session(session_id)
                    return self.create_session(user_id)
            return session_id
        
        return self.create_session(user_id)
    
    def update_session_activity(self, session_id: str):
        """更新会话活跃时间"""
        session_key = f"session:{session_id}"
        self.redis.hset(session_key, "last_active", datetime.now().isoformat())
        self.redis.hincrby(session_key, "message_count", 1)
    
    def get_session_last_active(self, session_id: str) -> Optional[str]:
        """获取会话最后活跃时间"""
        session_key = f"session:{session_id}"
        last_active = self.redis.hget(session_key, "last_active")
        if last_active:
            return last_active.decode() if isinstance(last_active, bytes) else last_active
        return None
    
    def end_session(self, session_id: str):
        """结束会话"""
        session_key = f"session:{session_id}"
        self.redis.hset(session_key, "status", "ended")
        self.redis.hset(session_key, "end_time", datetime.now().isoformat())
        
        # 移除活跃会话标记
        session_data = self.get_session_data(session_id)
        if session_data:
            user_id = session_data.get('user_id')
            self.redis.delete(f"user:{user_id}:active_session")
    
    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """获取会话数据"""
        session_key = f"session:{session_id}"
        data = self.redis.hgetall(session_key)
        
        if not data:
            return None
        
        return {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }
    
    # ==================== 短期上下文管理 ====================
    
    def add_message_to_session(self, session_id: str, role: str, content: str):
        """添加消息到会话上下文"""
        context_key = f"session:{session_id}:context"
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        self.redis.rpush(context_key, json.dumps(message))
        self.redis.expire(context_key, 24 * 3600)
        
        self.update_session_activity(session_id)
    
    def get_session_context(self, session_id: str, limit: int = 20) -> List[Dict]:
        """获取会话上下文（最近N条消息）"""
        context_key = f"session:{session_id}:context"
        messages = self.redis.lrange(context_key, -limit, -1)
        
        return [json.loads(msg) for msg in messages]
    
    def get_full_session_context(self, session_id: str) -> List[Dict]:
        """获取完整会话上下文"""
        context_key = f"session:{session_id}:context"
        messages = self.redis.lrange(context_key, 0, -1)
        
        return [json.loads(msg) for msg in messages]
    
    # ==================== 会话总结标记 ====================
    
    def mark_session_for_summary(self, session_id: str):
        """标记会话需要总结（异步任务会处理）"""
        summary_queue_key = "session:summary_queue"
        
        summary_task = {
            "session_id": session_id,
            "queued_at": datetime.now().isoformat(),
            "status": "pending"
        }
        
        # 添加到总结队列（去重）
        self.redis.sadd(summary_queue_key, json.dumps(summary_task))
    
    def get_sessions_to_summarize(self) -> List[Dict]:
        """获取待总结的会话列表"""
        summary_queue_key = "session:summary_queue"
        tasks = self.redis.smembers(summary_queue_key)
        
        return [json.loads(task) for task in tasks]
    
    def remove_from_summary_queue(self, session_id: str):
        """从总结队列中移除"""
        summary_queue_key = "session:summary_queue"
        tasks = self.redis.smembers(summary_queue_key)
        
        for task in tasks:
            task_data = json.loads(task)
            if task_data.get("session_id") == session_id:
                self.redis.srem(summary_queue_key, task)
                break
    
    def save_session_summary(self, session_id: str, summary: Dict):
        """保存会话总结"""
        summary_key = f"session:{session_id}:summary"
        
        summary_data = {
            **summary,
            "summarized_at": datetime.now().isoformat()
        }
        
        # 将嵌套字典转换为JSON字符串
        flat_summary = {}
        for k, v in summary_data.items():
            if isinstance(v, (dict, list)):
                flat_summary[k] = json.dumps(v, ensure_ascii=False)
            else:
                flat_summary[k] = str(v)
        
        self.redis.hset(summary_key, mapping=flat_summary)
        self.redis.expire(summary_key, 30 * 24 * 3600)  # 保留30天
        
        # 更新会话状态
        self.redis.hset(f"session:{session_id}", "status", "summarized")
    
    def get_session_summary(self, session_id: str) -> Optional[Dict]:
        """获取会话总结"""
        summary_key = f"session:{session_id}:summary"
        data = self.redis.hgetall(summary_key)
        
        if not data:
            return None
        
        result = {}
        for k, v in data.items():
            k_str = k.decode() if isinstance(k, bytes) else k
            v_str = v.decode() if isinstance(v, bytes) else v
            
            # 尝试解析JSON
            try:
                result[k_str] = json.loads(v_str)
            except:
                result[k_str] = v_str
        
        return result
    
    # ==================== 会话触发条件检查 ====================
    
    def should_trigger_summary(self, session_id: str) -> bool:
        """检查是否应该触发总结"""
        session_data = self.get_session_data(session_id)
        
        if not session_data:
            return False
        
        message_count = int(session_data.get('message_count', 0))
        
        # 条件1: 消息数达到10/20/30条
        if message_count > 0 and message_count % 10 == 0:
            return True
        
        return False
    
    def should_trigger_profile_update(self, user_id: str) -> bool:
        """检查是否应该触发用户画像更新"""
        # 检查最后更新时间
        last_update_key = f"user:{user_id}:last_profile_update"
        last_update = self.redis.get(last_update_key)
        
        if not last_update:
            return True
        
        last_update_time = datetime.fromisoformat(
            last_update.decode() if isinstance(last_update, bytes) else last_update
        )
        
        # 超过1小时未更新
        if (datetime.now() - last_update_time).total_seconds() > 3600:
            return True
        
        return False
    
    def mark_profile_updated(self, user_id: str):
        """标记画像已更新"""
        last_update_key = f"user:{user_id}:last_profile_update"
        self.redis.set(last_update_key, datetime.now().isoformat(), ex=24*3600)