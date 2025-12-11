"""
应用配置管理
使用 pydantic-settings 从环境变量加载配置
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """应用配置类"""
    
    # MongoDB 配置
    mongo_uri: str = "mongodb://localhost:27017/"
    mongo_db_name: str = "wavecho_dev"
    
    # JWT 配置
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 43200  # 30 天
    
    # OpenAI API 配置
    openai_api_key: str = "sk-Yy6-vrk8WuS5c2T-HPUrfg"
    openai_model: str = "qwen-flash"
    
    # 数据加密密钥
    encryption_key: str
    
    # 应用配置
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS 配置（开发环境允许所有来源）
    cors_origins: str = "*"
    
    # 日志级别
    log_level: str = "INFO"
    
    # 邮件配置 (SMTP)
    smtp_host: str = "smtp.gmail.com"  # 或 smtp.qq.com, smtp.163.com
    smtp_port: int = 587
    smtp_user: str = "xfguo20@gmail.com"  # 发件人邮箱
    smtp_password: str = "kcjnlbppvgozinvc"  # 邮箱授权码（非登录密码）
    smtp_from_name: str = "Wavecho"  # 发件人显示名称
    smtp_use_tls: bool = True
    
    # 阿里云短信配置
    aliyun_access_key_id: str = ""  # 阿里云 AccessKey ID
    aliyun_access_key_secret: str = ""  # 阿里云 AccessKey Secret
    aliyun_sms_sign_name: str = ""  # 短信签名名称
    aliyun_sms_template_code: str = ""  # 短信模板CODE
    
    # 腾讯云配置
    tencent_secret_id: str = ""  # 腾讯云 SecretId
    tencent_secret_key: str = ""  # 腾讯云 SecretKey
    tencent_ocr_region: str = "ap-guangzhou"  # OCR 服务地域
    tencent_asr_appid: str = ""  # 腾讯云 ASR AppId
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """将 CORS origins 字符串转换为列表"""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]


# 全局配置实例
settings = Settings()
