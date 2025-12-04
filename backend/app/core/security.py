"""
安全工具模块
包含 JWT 生成/验证、密码加密、数据加密等功能
"""
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings


# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 JWT access token
    
    Args:
        data: 要编码的数据（通常包含 user_id 等）
        expires_delta: 过期时间增量
    
    Returns:
        JWT token 字符串
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    解码并验证 JWT token
    
    Args:
        token: JWT token 字符串
    
    Returns:
        解码后的数据，如果验证失败返回 None
    """
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


# 数据加密/解密（AES-256-GCM，通过 Fernet）
class DataEncryptor:
    """数据加密工具类"""
    
    def __init__(self):
        # 确保密钥是有效的 Fernet 密钥（32 字节 base64 编码）
        try:
            # 如果配置的密钥不是有效的 Fernet 密钥，生成一个（仅用于演示）
            if len(settings.encryption_key) < 32:
                # 开发环境：生成临时密钥并警告
                import warnings
                warnings.warn("ENCRYPTION_KEY 过短，使用临时生成的密钥（仅开发环境）")
                self.cipher = Fernet(Fernet.generate_key())
            else:
                # 尝试直接使用配置的密钥（假设已经是 base64 编码）
                try:
                    key_bytes = settings.encryption_key.encode()
                    self.cipher = Fernet(key_bytes)
                except Exception:
                    # 如果不是有效的 Fernet 密钥，从字符串派生
                    import hashlib
                    derived_key = hashlib.sha256(settings.encryption_key.encode()).digest()
                    encoded_key = base64.urlsafe_b64encode(derived_key)
                    self.cipher = Fernet(encoded_key)
        except Exception as e:
            raise ValueError(f"无法初始化加密器: {e}")
    
    def encrypt(self, plaintext: str) -> str:
        """
        加密文本
        
        Args:
            plaintext: 明文字符串
        
        Returns:
            Base64 编码的密文
        """
        encrypted_bytes = self.cipher.encrypt(plaintext.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    
    def decrypt(self, ciphertext: str) -> str:
        """
        解密文本
        
        Args:
            ciphertext: Base64 编码的密文
        
        Returns:
            明文字符串
        """
        decrypted_bytes = self.cipher.decrypt(ciphertext.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')


# 全局加密器实例
encryptor = DataEncryptor()


def encrypt_text(text: str) -> str:
    """加密文本（便捷函数）"""
    return encryptor.encrypt(text)


def decrypt_text(ciphertext: str) -> str:
    """解密文本（便捷函数）"""
    return encryptor.decrypt(ciphertext)
