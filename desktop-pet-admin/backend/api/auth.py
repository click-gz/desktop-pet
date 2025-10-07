"""
认证相关 API
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt

from config import config
from api.models import LoginRequest, LoginResponse, ApiResponse

router = APIRouter(prefix="/api/auth", tags=["认证"])
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str) -> bool:
    """验证令牌"""
    # 简单令牌验证
    if token == config.ADMIN_TOKEN:
        return True
    
    # JWT 令牌验证
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=["HS256"])
        return payload.get("admin") == True
    except JWTError:
        return False


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """获取当前管理员（依赖注入）"""
    token = credentials.credentials
    if not verify_token(token):
        raise HTTPException(status_code=403, detail="无效的令牌")
    return token


# 简化的认证依赖（支持查询参数）
async def verify_admin_token(token: Optional[str] = Header(None)):
    """验证管理员令牌（Header）"""
    if not token:
        raise HTTPException(status_code=401, detail="缺少认证令牌")
    
    if not verify_token(token):
        raise HTTPException(status_code=403, detail="无效的令牌")
    
    return token


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """管理员登录"""
    # 验证用户名和密码
    if (request.username == config.ADMIN_USERNAME and 
        request.password == config.ADMIN_PASSWORD):
        
        # 生成 JWT 令牌
        token = create_access_token(
            data={"sub": request.username, "admin": True},
            expires_delta=timedelta(hours=24)
        )
        
        return LoginResponse(
            success=True,
            token=token,
            message="登录成功"
        )
    
    raise HTTPException(status_code=401, detail="用户名或密码错误")


@router.post("/verify")
async def verify(token: str = Depends(verify_admin_token)):
    """验证令牌有效性"""
    return ApiResponse(
        success=True,
        message="令牌有效"
    )

