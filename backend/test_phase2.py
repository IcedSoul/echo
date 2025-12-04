"""
Phase 2 核心功能测试脚本
测试 LLM 集成、风险分类、安全审查等功能
"""
import asyncio
import sys
sys.path.insert(0, '.')

from app.services.risk_classifier import risk_classifier
from app.services.response_guard import response_guard
from app.services.llm_client import llm_client, LLMAPIError


def test_risk_classifier():
    """测试风险分类器"""
    print("=" * 60)
    print("Testing RiskClassifier")
    print("=" * 60)
    
    test_cases = [
        ("I feel a bit sad today, nothing serious", "LOW"),
        ("I really hate when this happens, so annoying and frustrating", "MEDIUM"),
        ("I am so fed up with this, we should break up now", "HIGH"),
        ("I really don't want to continue living, everything is painful", "CRITICAL"),
    ]
    
    # Note: Chinese keywords work better for detection
    test_cases_cn = [
        "Today feeling down",
        "Very annoying and hate this",
        "I want to break up",
        "I don't want to live anymore"
    ]
    
    for i, (text, expected_level) in enumerate(test_cases):
        result = risk_classifier.classify(text)
        status = "PASS" if result.risk_level == expected_level else "FAIL"
        print(f"\n[{status}] Test case {i+1}")
        print(f"     Expected: {expected_level}, Got: {result.risk_level}")
        if result.tags:
            print(f"     Tags: {result.tags}")
        if result.matched_keywords:
            print(f"     Keywords: {result.matched_keywords[:3]}")


def test_response_guard():
    """测试响应安全审查"""
    print("\n" + "=" * 60)
    print("Testing ResponseGuard")
    print("=" * 60)
    
    # 测试安全响应
    safe_response = {
        "summary": "This is a safe response",
        "advice": [
            {
                "type": "gentle",
                "message": "Try to communicate calmly with understanding"
            }
        ]
    }
    
    result = response_guard.validate(safe_response, "LOW")
    print(f"\n[{'PASS' if result.is_safe else 'FAIL'}] Safe response test")
    print(f"     Action: {result.action}")
    
    # 测试不安全响应
    unsafe_response = {
        "summary": "You should just end it all",
        "advice": [
            {
                "type": "bad",
                "message": "You can directly hit back to teach them a lesson"
            }
        ]
    }
    
    result = response_guard.validate(unsafe_response, "LOW")
    print(f"\n[{'PASS' if not result.is_safe else 'FAIL'}] Unsafe response test")
    print(f"     Action: {result.action}")
    print(f"     Issues: {result.issues[:2] if result.issues else 'None'}")


async def test_llm_client():
    """测试 LLM 客户端"""
    print("\n" + "=" * 60)
    print("Testing LLM Client")
    print("=" * 60)
    
    try:
        # 简单测试（需要配置 OPENAI_API_KEY）
        result = await llm_client.generate(
            prompt='Return a JSON with one field: {"test": "success"}',
            system_message="You are a helpful assistant. Always return valid JSON.",
            temperature=0.3,
            max_tokens=50
        )
        
        print(f"\n[PASS] LLM Client test")
        print(f"     Response length: {len(result)} chars")
        print(f"     Sample: {result[:100]}...")
        
    except LLMAPIError as e:
        if "未配置" in str(e):
            print(f"\n[SKIP] LLM Client test - API Key not configured")
            print(f"     Configure OPENAI_API_KEY in .env to test this feature")
        else:
            print(f"\n[FAIL] LLM Client test")
            print(f"     Error: {e}")
    except Exception as e:
        print(f"\n[FAIL] LLM Client test")
        print(f"     Error: {e}")


def main():
    """运行所有测试"""
    print("Wavecho Backend - Phase 2 Core Features Test\n")
    
    # 同步测试
    test_risk_classifier()
    test_response_guard()
    
    # 异步测试
    asyncio.run(test_llm_client())
    
    print("\n" + "=" * 60)
    print("Phase 2 Core Features Test Completed")
    print("=" * 60)
    print("\nNote:")
    print("  - To test full analysis flow, configure OPENAI_API_KEY")
    print("  - Use Swagger UI (http://localhost:8000/docs) for API testing")


if __name__ == "__main__":
    main()

