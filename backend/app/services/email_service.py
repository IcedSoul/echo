"""
邮件发送服务
支持 SMTP 方式发送验证码邮件
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """邮件发送服务"""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_name = settings.smtp_from_name
        self.use_tls = settings.smtp_use_tls
    
    def _is_configured(self) -> bool:
        """检查邮件服务是否已配置"""
        return bool(self.smtp_user and self.smtp_password)
    
    async def send_verification_code(
        self,
        to_email: str,
        code: str,
        expires_minutes: int = 5
    ) -> bool:
        """
        发送验证码邮件
        
        Args:
            to_email: 收件人邮箱
            code: 验证码
            expires_minutes: 过期时间（分钟）
            
        Returns:
            bool: 发送是否成功
        """
        if not self._is_configured():
            logger.warning("邮件服务未配置，验证码将打印到日志")
            logger.info(f"验证码: {code} -> {to_email}")
            return True
        
        subject = f"【{self.from_name}】您的验证码"
        
        # HTML 邮件内容
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #6366F1;
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .title {{
                    font-size: 20px;
                    color: #1a1a1a;
                    text-align: center;
                    margin-bottom: 20px;
                }}
                .code-box {{
                    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 30px 0;
                }}
                .code {{
                    font-size: 36px;
                    font-weight: bold;
                    color: #ffffff;
                    letter-spacing: 8px;
                }}
                .tip {{
                    font-size: 14px;
                    color: #666666;
                    text-align: center;
                    line-height: 1.6;
                }}
                .warning {{
                    font-size: 12px;
                    color: #999999;
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eeeeee;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🎯 {self.from_name}</div>
                <div class="title">邮箱验证码</div>
                <div class="code-box">
                    <div class="code">{code}</div>
                </div>
                <div class="tip">
                    请在 <strong>{expires_minutes} 分钟</strong>内使用此验证码完成验证。<br>
                    如果这不是您本人的操作，请忽略此邮件。
                </div>
                <div class="warning">
                    此邮件由系统自动发送，请勿直接回复。
                </div>
            </div>
        </body>
        </html>
        """
        
        # 纯文本备用内容
        text_content = f"""
        {self.from_name} - 邮箱验证码
        
        您的验证码是: {code}
        
        验证码将在 {expires_minutes} 分钟后过期。
        
        如果这不是您本人的操作，请忽略此邮件。
        """
        
        return await self._send_email(to_email, subject, html_content, text_content)
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        发送邮件
        
        Args:
            to_email: 收件人邮箱
            subject: 邮件主题
            html_content: HTML 内容
            text_content: 纯文本内容（可选）
            
        Returns:
            bool: 发送是否成功
        """
        try:
            # 创建邮件对象
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = f"{self.from_name} <{self.smtp_user}>"
            msg['To'] = to_email
            
            # 添加纯文本版本
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # 添加 HTML 版本
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # 连接 SMTP 服务器并发送
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            
            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.smtp_user, [to_email], msg.as_string())
            server.quit()
            
            logger.info(f"验证码邮件发送成功: {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP 认证失败: {e}")
            raise Exception("邮件服务认证失败，请检查配置")
        except smtplib.SMTPException as e:
            logger.error(f"SMTP 错误: {e}")
            raise Exception(f"邮件发送失败: {str(e)}")
        except Exception as e:
            logger.error(f"发送邮件失败: {e}", exc_info=True)
            raise


# 全局邮件服务实例
email_service = EmailService()

