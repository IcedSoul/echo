"""
Wavecho Backend API 主应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.mongodb import MongoDB
from app.api.routes import auth, analyze, ocr, asr, situation_judge, expression_helper, chat

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：连接数据库
    logger.info("正在连接 MongoDB...")
    await MongoDB.connect()
    logger.info("MongoDB 连接成功")
    
    # 创建索引
    logger.info("正在创建数据库索引...")
    await MongoDB.create_indexes()
    logger.info("数据库索引创建完成")
    
    yield
    
    # 关闭时：断开数据库连接
    logger.info("正在断开 MongoDB 连接...")
    await MongoDB.close()
    logger.info("MongoDB 连接已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="Wavecho API",
    description="基于大模型的矛盾复盘与沟通辅助应用",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 配置 CORS
# 开发环境允许所有来源，生产环境需要配置具体域名
if settings.app_env == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # 允许所有来源时不能使用 credentials
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(analyze.router, prefix="/api", tags=["分析"])
app.include_router(ocr.router, prefix="/api", tags=["OCR"])
app.include_router(asr.router, prefix="/api", tags=["语音识别"])
app.include_router(situation_judge.router, prefix="/api", tags=["情况评理"])
app.include_router(expression_helper.router, prefix="/api", tags=["表达助手"])
app.include_router(chat.router, prefix="/api", tags=["AI聊天"])


@app.get("/")
async def root():
    """根路径 - 健康检查"""
    return {
        "message": "Wavecho API is running",
        "version": "0.1.0",
        "docs": "/docs",
        "environment": settings.app_env
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        db_status = "connected" if MongoDB.db is not None else "disconnected"
        
        return {
            "status": "healthy",
            "database": db_status,
            "environment": settings.app_env
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
