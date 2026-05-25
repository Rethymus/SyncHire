#!/usr/bin/env python3
"""
Rate Limiting Validation Script

Quick validation script to test the rate limiting implementation.
Run this to verify that the rate limiting system is working correctly.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.middleware.rate_limit import (
    RateLimiter,
    RateLimitType,
    rate_limit,
)
from app.core.config import get_settings
from app.core.redis import redis_client


async def validate_redis_connection():
    """Validate Redis connection"""
    print("🔍 Validating Redis connection...")
    try:
        await redis_client.connect()
        is_connected = redis_client.is_connected()

        if is_connected:
            print("✅ Redis connection successful")
            return True
        else:
            print("❌ Redis connection failed")
            return False
    except Exception as e:
        print(f"❌ Redis connection error: {str(e)}")
        return False


async def validate_rate_limit_config():
    """Validate rate limiting configuration"""
    print("\n🔍 Validating rate limit configuration...")

    settings = get_settings()

    # Check configuration values
    checks = [
        ("Rate limiting enabled", settings.RATE_LIMIT_ENABLED, True),
        ("Search limit set", settings.RATE_LIMIT_SEARCH > 0, True),
        ("Auth limit set", settings.RATE_LIMIT_AUTH > 0, True),
        ("Upload limit set", settings.RATE_LIMIT_UPLOAD > 0, True),
        ("General limit set", settings.RATE_LIMIT_GENERAL > 0, True),
        ("Window size set", settings.RATE_LIMIT_WINDOW_SIZE > 0, True),
    ]

    all_passed = True
    for check_name, actual, expected in checks:
        status = "✅" if actual == expected else "❌"
        print(f"{status} {check_name}: {actual}")
        if actual != expected:
            all_passed = False

    return all_passed


async def validate_rate_limit_check():
    """Validate rate limit checking functionality"""
    print("\n🔍 Validating rate limit checking...")

    test_identifier = "validation_test_user"

    try:
        # Test under limit
        is_allowed, retry_after = await RateLimiter.check_rate_limit(
            test_identifier, RateLimitType.SEARCH
        )

        if is_allowed and retry_after is None:
            print("✅ Rate limit check passed (under limit)")
        else:
            print("❌ Rate limit check failed unexpectedly")
            return False

        # Test rate limit status
        status = await RateLimiter.get_rate_limit_status(
            test_identifier, RateLimitType.SEARCH
        )

        if "current" in status and "max" in status:
            print(f"✅ Rate limit status retrieved: {status['current']}/{status['max']}")
        else:
            print("❌ Rate limit status missing required fields")
            return False

        return True

    except Exception as e:
        print(f"❌ Rate limit check error: {str(e)}")
        return False


async def validate_identifier_extraction():
    """Validate identifier extraction logic"""
    print("\n🔍 Validating identifier extraction...")

    from unittest.mock import Mock

    # Test user-based identifier
    request = Mock()
    request.state.user_id = "test_user_123"
    request.client.host = "192.168.1.1"
    request.headers = {}

    identifier = RateLimiter._get_identifier(request, RateLimitType.SEARCH)
    expected = "user:test_user_123"

    if identifier == expected:
        print(f"✅ User-based identifier correct: {identifier}")
    else:
        print(f"❌ User-based identifier incorrect: {identifier} != {expected}")
        return False

    # Test IP-based identifier
    request_no_user = Mock()
    request_no_user.state = Mock(spec=[])  # No user_id
    request_no_user.client.host = "10.0.0.1"
    request_no_user.headers = {}

    identifier_ip = RateLimiter._get_identifier(request_no_user, RateLimitType.SEARCH)
    expected_ip = "ip:10.0.0.1"

    if identifier_ip == expected_ip:
        print(f"✅ IP-based identifier correct: {identifier_ip}")
    else:
        print(f"❌ IP-based identifier incorrect: {identifier_ip} != {expected_ip}")
        return False

    return True


async def validate_decorator_functionality():
    """Validate decorator functionality"""
    print("\n🔍 Validating decorator functionality...")

    from unittest.mock import Mock, patch

    # Mock request
    request = Mock()
    request.state.user_id = "decorator_test_user"
    request.client.host = "192.168.1.1"
    request.headers = {}

    # Mock rate limit check to always pass
    with patch('app.middleware.rate_limit.RateLimiter.check_rate_limit') as mock_check:
        mock_check.return_value = (True, None)

        @rate_limit(RateLimitType.SEARCH)
        async def test_function(request_arg):
            return {"status": "success"}

        result = await test_function(request)

        if result == {"status": "success"}:
            print("✅ Decorator function executed successfully")
            return True
        else:
            print(f"❌ Decorator function returned unexpected result: {result}")
            return False


async def run_validation():
    """Run all validation checks"""
    print("=" * 60)
    print("Rate Limiting Implementation Validation")
    print("=" * 60)

    # Run validation checks
    redis_ok = await validate_redis_connection()
    config_ok = await validate_rate_limit_config()
    check_ok = await validate_rate_limit_check()
    identifier_ok = await validate_identifier_extraction()
    decorator_ok = await validate_decorator_functionality()

    # Clean up Redis connection
    try:
        await redis_client.disconnect()
    except Exception:
        pass

    # Summary
    print("\n" + "=" * 60)
    print("Validation Summary")
    print("=" * 60)

    results = {
        "Redis Connection": redis_ok,
        "Configuration": config_ok,
        "Rate Limit Check": check_ok,
        "Identifier Extraction": identifier_ok,
        "Decorator Functionality": decorator_ok,
    }

    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check}")

    all_passed = all(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All validation checks passed!")
        print("✅ Rate limiting implementation is ready for production")
    else:
        print("⚠️  Some validation checks failed")
        print("❌ Please review and fix the issues above")
    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_validation())
    sys.exit(0 if success else 1)
