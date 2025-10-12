"""
管理后台主程序
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn

from config import config
from services.redis_service import RedisService
from api import admin, auth, pet

# 创建 FastAPI 应用
app = FastAPI(
    title="桌面宠物管理系统",
    description="Redis 数据库管理后台",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(pet.router)


@app.on_event("startup")
async def startup_event():
    """启动时的初始化"""
    print("\n" + "="*60)
    print("🚀 桌面宠物管理系统启动中...")
    print("="*60)
    
    # 打印配置信息
    config.print_config()
    
    # 测试 Redis 连接
    try:
        RedisService.get_client()
        print("\n✅ 系统就绪！")
        print(f"📡 API文档: http://{config.SERVER_HOST}:{config.SERVER_PORT}/docs")
        print(f"🌐 管理面板: 在浏览器中打开 frontend/index.html")
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n❌ 启动失败: {e}")
        print("="*60 + "\n")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """关闭时的清理"""
    print("\n🛑 正在关闭服务...")
    RedisService.close()
    print("✅ 服务已关闭\n")


@app.get("/")
async def root():
    """根路径重定向到文档"""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """健康检查"""
    try:
        client = RedisService.get_client()
        client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "status": "running",
        "redis": redis_status,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        log_level=config.LOG_LEVEL.lower()
    )

