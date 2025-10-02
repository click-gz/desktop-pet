"""
Redis 连接管理器
"""

import redis
import os
from typing import Optional


class RedisManager:
    """Redis 连接管理器"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        """获取 Redis 客户端（单例模式）"""
        if cls._instance is None:
            # 从环境变量读取配置
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", 6379))
            redis_db = int(os.getenv("REDIS_DB", 0))
            redis_password = os.getenv("REDIS_PASSWORD", None)
            
            # 连接参数
            connection_params = {
                "host": redis_host,
                "port": redis_port,
                "db": redis_db,
                "decode_responses": False,  # 手动处理解码
                "socket_connect_timeout": 5,
                "socket_timeout": 5,
                "retry_on_timeout": True
            }
            
            if redis_password:
                connection_params["password"] = redis_password
            
            try:
                cls._instance = redis.Redis(**connection_params)
                # 测试连接
                cls._instance.ping()
                print(f"✅ Redis 连接成功: {redis_host}:{redis_port}")
            except redis.ConnectionError as e:
                print(f"❌ Redis 连接失败: {str(e)}")
                print("⚠️  将使用内存模式（数据不会持久化）")
                # 使用 fakeredis 作为备选方案
                try:
                    import fakeredis
                    cls._instance = fakeredis.FakeRedis(decode_responses=False)
                    print("✅ 使用 FakeRedis 内存模式")
                except ImportError:
                    print("⚠️  请安装 fakeredis: pip install fakeredis")
                    # 返回一个基本的假 Redis 对象
                    cls._instance = FallbackRedis()
        
        return cls._instance
    
    @classmethod
    def close(cls):
        """关闭连接"""
        if cls._instance:
            try:
                cls._instance.close()
                print("✅ Redis 连接已关闭")
            except:
                pass
            cls._instance = None


class FallbackRedis:
    """备用的内存 Redis 实现（当 Redis 不可用时）"""
    
    def __init__(self):
        self.data = {}
        self.sets = {}
        self.lists = {}
        self.sorted_sets = {}
        print("⚠️  使用内存备用模式（功能有限）")
    
    def hset(self, name, key=None, value=None, mapping=None):
        if mapping:
            if name not in self.data:
                self.data[name] = {}
            self.data[name].update(mapping)
        elif key and value:
            if name not in self.data:
                self.data[name] = {}
            self.data[name][key] = value
    
    def hget(self, name, key):
        return self.data.get(name, {}).get(key)
    
    def hgetall(self, name):
        return self.data.get(name, {})
    
    def hincrby(self, name, key, amount=1):
        if name not in self.data:
            self.data[name] = {}
        current = int(self.data[name].get(key, 0))
        self.data[name][key] = str(current + amount)
        return self.data[name][key]
    
    def exists(self, name):
        return name in self.data
    
    def lpush(self, name, *values):
        if name not in self.lists:
            self.lists[name] = []
        for value in values:
            self.lists[name].insert(0, value)
    
    def lrange(self, name, start, end):
        if name not in self.lists:
            return []
        return self.lists[name][start:end+1 if end != -1 else None]
    
    def ltrim(self, name, start, end):
        if name in self.lists:
            self.lists[name] = self.lists[name][start:end+1]
    
    def sadd(self, name, *values):
        if name not in self.sets:
            self.sets[name] = set()
        self.sets[name].update(values)
    
    def smembers(self, name):
        return self.sets.get(name, set())
    
    def zadd(self, name, mapping):
        if name not in self.sorted_sets:
            self.sorted_sets[name] = []
        for member, score in mapping.items():
            self.sorted_sets[name].append((score, member))
        self.sorted_sets[name].sort()
    
    def zrange(self, name, start, end):
        if name not in self.sorted_sets:
            return []
        items = self.sorted_sets[name][start:end+1 if end != -1 else None]
        return [item[1] for item in items]
    
    def expire(self, name, time):
        pass  # 不实现过期功能
    
    def ping(self):
        return True
    
    def close(self):
        pass

