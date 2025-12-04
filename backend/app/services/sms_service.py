"""
短信发送服务
使用阿里云 SMS 服务发送验证码
"""
import logging
import json
import hmac
import hashlib
import base64
import urllib.parse
import uuid
from datetime import datetime
from typing import Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class AliyunSmsService:
    """阿里云短信服务"""
    
    def __init__(self):
        self.access_key_id = settings.aliyun_access_key_id
        self.access_key_secret = settings.aliyun_access_key_secret
        self.sign_name = settings.aliyun_sms_sign_name
        self.template_code = settings.aliyun_sms_template_code
        self.endpoint = "https://dysmsapi.aliyuncs.com"
    
    def _is_configured(self) -> bool:
        """检查短信服务是否已配置"""
        return bool(
            self.access_key_id and 
            self.access_key_secret and 
            self.sign_name and 
            self.template_code
        )
    
    def _percent_encode(self, s: str) -> str:
        """URL编码"""
        return urllib.parse.quote(s, safe='')
    
    def _sign(self, params: dict) -> str:
        """生成签名"""
        # 按参数名排序
        sorted_params = sorted(params.items())
        
        # 构造待签名字符串
        query_string = '&'.join([
            f"{self._percent_encode(k)}={self._percent_encode(str(v))}"
            for k, v in sorted_params
        ])
        
        string_to_sign = f"GET&%2F&{self._percent_encode(query_string)}"
        
        # 使用 HMAC-SHA1 签名
        key = f"{self.access_key_secret}&"
        signature = hmac.new(
            key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha1
        ).digest()
        
        return base64.b64encode(signature).decode('utf-8')
    
    async def send_verification_code(
        self,
        phone_number: str,
        code: str,
        expires_minutes: int = 5
    ) -> bool:
        """
        发送验证码短信
        
        Args:
            phone_number: 手机号码
            code: 验证码
            expires_minutes: 过期时间（分钟），仅用于日志
            
        Returns:
            bool: 发送是否成功
        """
        if not self._is_configured():
            logger.warning("短信服务未配置，验证码将打印到日志")
            logger.info(f"[SMS] 验证码: {code} -> {phone_number}")
            print(f"\n{'='*50}")
            print(f"SMS VERIFICATION CODE")
            print(f"Phone: {phone_number}")
            print(f"Code: {code}")
            print(f"Expires in: {expires_minutes} minutes")
            print(f"{'='*50}\n")
            return True
        
        try:
            # 构造请求参数
            params = {
                "AccessKeyId": self.access_key_id,
                "Action": "SendSms",
                "Format": "JSON",
                "PhoneNumbers": phone_number,
                "RegionId": "cn-hangzhou",
                "SignName": self.sign_name,
                "SignatureMethod": "HMAC-SHA1",
                "SignatureNonce": str(uuid.uuid4()),
                "SignatureVersion": "1.0",
                "TemplateCode": self.template_code,
                "TemplateParam": json.dumps({"code": code}),
                "Timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "Version": "2017-05-25",
            }
            
            # 添加签名
            params["Signature"] = self._sign(params)
            
            # 发送请求
            async with httpx.AsyncClient() as client:
                response = await client.get(self.endpoint, params=params)
                result = response.json()
            
            if result.get("Code") == "OK":
                logger.info(f"短信发送成功: {phone_number}")
                return True
            else:
                logger.error(f"短信发送失败: {result}")
                raise Exception(f"短信发送失败: {result.get('Message', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"发送短信失败: {e}", exc_info=True)
            raise


# 全局短信服务实例
sms_service = AliyunSmsService()

