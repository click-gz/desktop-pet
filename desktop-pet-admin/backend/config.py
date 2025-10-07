"""
配置管理模块
从环境变量读取配置
"""

import os
from typing import Optional
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()


class Config:
    """配置类"""
    
    # ==================== Redis 配置 ====================
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", None)
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # ==================== 服务器配置 ====================
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8080"))
    
    # ==================== 安全配置 ====================
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "your_secret_admin_token_here")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your_jwt_secret_key_here")
    
    # ==================== CORS 配置 ====================
    ALLOW_ORIGINS: str = os.getenv("ALLOW_ORIGINS", "*")
    
    @property
    def cors_origins(self) -> list:
        """返回 CORS 允许的源列表"""
        if self.ALLOW_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOW_ORIGINS.split(",")]
    
    # ==================== 日志配置 ====================
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/admin.log")
    
    # ==================== 功能开关 ====================
    ENABLE_DANGEROUS_OPERATIONS: bool = os.getenv("ENABLE_DANGEROUS_OPERATIONS", "true").lower() == "true"
    ENABLE_DATA_EXPORT: bool = os.getenv("ENABLE_DATA_EXPORT", "true").lower() == "true"
    
    # ==================== 其他配置 ====================
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "20"))
    SESSION_EXPIRE_TIME: int = int(os.getenv("SESSION_EXPIRE_TIME", "3600"))
    
    @property
    def redis_url(self) -> str:
        """生成 Redis 连接 URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    def print_config(self):
        """打印配置信息（隐藏敏感信息）"""
        print("=" * 60)
        print("📋 管理系统配置")
        print("=" * 60)
        print(f"🔧 Redis: {self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}")
        print(f"🌐 服务器: {self.SERVER_HOST}:{self.SERVER_PORT}")
        print(f"🔐 认证: {'已配置' if self.ADMIN_TOKEN != 'your_secret_admin_token_here' else '⚠️ 使用默认Token（不安全）'}")
        print(f"📊 CORS: {self.ALLOW_ORIGINS}")
        print(f"⚙️ 危险操作: {'启用' if self.ENABLE_DANGEROUS_OPERATIONS else '禁用'}")
        print("=" * 60)


# 全局配置实例
config = Config()
