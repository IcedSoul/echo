# Wavecho Backend Dockerfile
# 使用 Python 3.11 slim 镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# 安装系统依赖和 uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install uv

# 创建非 root 用户（在安装依赖前创建，避免后续 chown 大量文件）
RUN useradd --create-home --shell /bin/bash appuser && \
    chown appuser:appuser /app

# 复制依赖文件并设置权限
COPY --chown=appuser:appuser pyproject.toml uv.lock README.md ./

# 复制应用代码
COPY --chown=appuser:appuser app/ ./app/

# 切换到非 root 用户
USER appuser

# 安装 Python 依赖（以 appuser 身份安装，文件自动归属 appuser）
RUN uv sync --frozen --no-dev

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

