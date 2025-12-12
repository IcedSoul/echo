"""
测试使用限制功能
"""
import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.mongodb import MongoDB
from app.services.usage_limit_service import usage_limit_service


async def test_usage_limit():
    """测试使用限制功能"""
    print("=== 测试使用限制功能 ===\n")
    
    # 连接数据库
    print("连接数据库...")
    await MongoDB.connect()
    await MongoDB.create_indexes()
    print("✓ 数据库连接成功\n")
    
    # 测试用户ID
    test_user_id = "test_user_123"
    
    # 1. 初始化用户限制
    print("1. 初始化用户限制...")
    limits = await usage_limit_service.initialize_user_limits(test_user_id)
    print(f"✓ 用户限制已初始化")
    print(f"   - 冲突复盘限制: {limits.limits.conflict_analysis_limit}")
    print(f"   - 情况评理限制: {limits.limits.situation_judge_limit}")
    print(f"   - 表达助手限制: {limits.limits.expression_helper_limit}")
    print(f"   - AI对话限制: {limits.limits.ai_chat_limit}\n")
    
    # 2. 检查使用限制（初始状态）
    print("2. 检查初始使用限制...")
    check = await usage_limit_service.check_usage_limit(test_user_id, "conflict_analysis")
    print(f"✓ 冲突复盘: 允许={check.allowed}, 已用={check.used}, 限制={check.limit}, 剩余={check.remaining}\n")
    
    # 3. 增加使用次数
    print("3. 模拟使用功能...")
    for i in range(3):
        await usage_limit_service.increment_usage(test_user_id, "conflict_analysis")
        print(f"✓ 冲突复盘使用次数 +1 (第{i+1}次)")
    
    await usage_limit_service.increment_usage(test_user_id, "ai_chat")
    print(f"✓ AI对话使用次数 +1\n")
    
    # 4. 获取使用情况
    print("4. 获取使用情况响应...")
    usage = await usage_limit_service.get_usage_response(test_user_id)
    print(f"✓ 冲突复盘: {usage.conflict_analysis_used}/{usage.conflict_analysis_limit} (剩余 {usage.conflict_analysis_remaining})")
    print(f"✓ 情况评理: {usage.situation_judge_used}/{usage.situation_judge_limit} (剩余 {usage.situation_judge_remaining})")
    print(f"✓ 表达助手: {usage.expression_helper_used}/{usage.expression_helper_limit} (剩余 {usage.expression_helper_remaining})")
    print(f"✓ AI对话: {usage.ai_chat_used}/{usage.ai_chat_limit} (剩余 {usage.ai_chat_remaining})")
    print(f"✓ 用户等级: {usage.user_level}\n")
    
    # 5. 测试超限检查
    print("5. 测试超限情况...")
    # 使用到达限制
    for i in range(7):
        await usage_limit_service.increment_usage(test_user_id, "conflict_analysis")
    
    check_after = await usage_limit_service.check_usage_limit(test_user_id, "conflict_analysis")
    print(f"✓ 使用10次后: 允许={check_after.allowed}, 已用={check_after.used}, 剩余={check_after.remaining}")
    if not check_after.allowed:
        print(f"   提示: {check_after.message}\n")
    
    # 6. 重置使用次数
    print("6. 重置使用次数...")
    await usage_limit_service.reset_user_usage(test_user_id)
    usage_after_reset = await usage_limit_service.get_usage_response(test_user_id)
    print(f"✓ 重置后冲突复盘: {usage_after_reset.conflict_analysis_used}/{usage_after_reset.conflict_analysis_limit}\n")
    
    # 关闭数据库连接
    await MongoDB.close()
    print("=== 测试完成 ===")


if __name__ == "__main__":
    asyncio.run(test_usage_limit())

