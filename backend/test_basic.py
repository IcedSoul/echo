"""
Phase 1 基础功能测试脚本
用于验证 API 是否正常工作
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    print("PASS: Health check")
    print(f"   Response: {json.dumps(data)}\n")


def test_analyze_conflict():
    """Test conflict analysis API"""
    print("Testing analyze-conflict API...")
    payload = {
        "conversation_text": "We had an argument yesterday about the necklace. I was in a hurry and she felt I was impatient.",
        "context_description": "We were rushing to go out",
        "user_id": "test-user-123"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/analyze-conflict",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "session_id" in data
    assert "status" in data
    assert "risk_level" in data
    assert "analysis_result" in data
    
    print("PASS: Analyze-conflict API")
    print(f"   Session ID: {data['session_id']}")
    print(f"   Risk Level: {data['risk_level']}")
    print(f"   Status: {data['status']}\n")


def test_send_verification_code():
    """Test send verification code (supports phone or email)"""
    print("Testing send-code API...")
    
    # 测试邮箱
    payload = {
        "account": "test@example.com"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/auth/send-code",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["account_type"] == "email"
    print("PASS: Send verification code (email)")
    print(f"   Response: {data['message']}")
    print(f"   Account Type: {data['account_type']}")
    print("   NOTE: Check terminal output for the verification code\n")
    
    # 测试手机号
    payload = {
        "account": "13800138000"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/auth/send-code",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["account_type"] == "phone"
    print("PASS: Send verification code (phone)")
    print(f"   Response: {data['message']}")
    print(f"   Account Type: {data['account_type']}")
    print("   NOTE: Check terminal output for the verification code\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Wavecho Backend - Phase 1 Basic Tests")
    print("=" * 60)
    print()
    
    try:
        test_health_check()
        test_analyze_conflict()
        test_send_verification_code()
        
        print("=" * 60)
        print("All tests passed! Phase 1 completed!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Visit Swagger docs: http://localhost:8000/docs")
        print("  2. Start Phase 2: Integrate real LLM")
        print()
        
    except AssertionError as e:
        print(f"\nFAIL: Test failed - {e}")
    except requests.exceptions.ConnectionError:
        print(f"\nFAIL: Cannot connect to server. Make sure backend is running.")
        print(f"   Start command: npm run backend:dev")
    except Exception as e:
        print(f"\nFAIL: Error occurred - {e}")

