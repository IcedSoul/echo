#!/usr/bin/env python3
"""
将用户提升为管理员的脚本
使用方法：
    python backend/script/promote_user_to_admin.py <user_id|email|phone>

示例：
    python backend/script/promote_user_to_admin.py user_123456
    python backend/script/promote_user_to_admin.py user@example.com
    python backend/script/promote_user_to_admin.py 13800138000
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """配置加载"""
    mongo_uri: str = "mongodb://localhost:27017/"
    mongo_db_name: str = "wavecho_dev"

    model_config = SettingsConfigDict(
        env_file=str(project_root / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


async def promote_user_to_admin(identifier: str):
    """
    将用户提升为管理员

    Args:
        identifier: 用户标识（user_id、email 或 phone）
    """
    settings = Settings()

    # 连接数据库
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]
    users_collection = db["users"]

    try:
        # 测试数据库连接
        await client.admin.command('ping')
        print(f"✓ 已连接到数据库: {settings.mongo_db_name}")

        # 根据不同标识符查找用户
        query = {
            "$or": [
                {"user_id": identifier},
                {"email": identifier},
                {"phone": identifier}
            ]
        }

        user = await users_collection.find_one(query)

        if not user:
            print(f"✗ 未找到用户: {identifier}")
            print("提示：请确保输入正确的 user_id、email 或 phone")
            return False

        # 显示用户信息
        print(f"\n找到用户:")
        print(f"  User ID: {user.get('user_id')}")
        print(f"  昵称: {user.get('nickname', '未设置')}")
        print(f"  邮箱: {user.get('email', '未设置')}")
        print(f"  手机: {user.get('phone', '未设置')}")
        print(f"  当前角色: {user.get('role', 'user')}")

        # 检查是否已经是管理员
        if user.get('role') == 'admin':
            print(f"\n该用户已经是管理员，无需更改")
            return True

        # 更新为管理员
        result = await users_collection.update_one(
            {"user_id": user['user_id']},
            {
                "$set": {
                    "role": "admin",
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count > 0:
            print(f"\n✓ 成功将用户提升为管理员！")
            print(f"  User ID: {user['user_id']}")
            print(f"  角色: user -> admin")
            return True
        else:
            print(f"\n✗ 更新失败，请检查数据库权限")
            return False

    except Exception as e:
        print(f"\n✗ 操作失败: {e}")
        return False
    finally:
        client.close()
        print("\n数据库连接已关闭")


async def list_all_admins():
    """列出所有管理员用户"""
    settings = Settings()

    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]
    users_collection = db["users"]

    try:
        await client.admin.command('ping')

        admins = await users_collection.find({"role": "admin"}).to_list(None)

        if not admins:
            print("当前没有管理员用户")
            return

        print(f"\n当前管理员列表 (共 {len(admins)} 人):")
        print("-" * 80)
        for admin in admins:
            print(f"User ID: {admin.get('user_id')}")
            print(f"  昵称: {admin.get('nickname', '未设置')}")
            print(f"  邮箱: {admin.get('email', '未设置')}")
            print(f"  手机: {admin.get('phone', '未设置')}")
            print(f"  创建时间: {admin.get('created_at', '未知')}")
            print("-" * 80)

    except Exception as e:
        print(f"获取管理员列表失败: {e}")
    finally:
        client.close()


def print_usage():
    """打印使用说明"""
    print("""
使用方法:
    python backend/script/promote_user_to_admin.py <user_id|email|phone>
    python backend/script/promote_user_to_admin.py --list

命令说明:
    <user_id|email|phone>  - 要提升为管理员的用户标识
    --list                 - 列出所有管理员用户

示例:
    python backend/script/promote_user_to_admin.py user_123456
    python backend/script/promote_user_to_admin.py user@example.com
    python backend/script/promote_user_to_admin.py 13800138000
    python backend/script/promote_user_to_admin.py --list
""")


async def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    arg = sys.argv[1]

    if arg in ['--list', '-l']:
        await list_all_admins()
    elif arg in ['--help', '-h']:
        print_usage()
    else:
        identifier = arg
        success = await promote_user_to_admin(identifier)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
