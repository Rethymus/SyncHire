"""
Rate Limiting Tests

Tests for the Redis-based rate limiting middleware.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from app.middleware.rate_limit import (
    RateLimiter,
    RateLimitType,
    RateLimitConfig,
    rate_limit,
)


class TestRateLimiter:
    """Test RateLimiter class"""

    @pytest.mark.asyncio
    async def test_check_rate_limit_under_limit(self):
        """Test rate limiting when under the limit"""
        identifier = "test_user_123"
        limit_type = RateLimitType.SEARCH

        # Mock Redis client
        with patch('app.middleware.rate_limit.redis_client') as mock_redis:
            mock_redis.incr = AsyncMock(return_value=1)
            mock_redis.expire = AsyncMock(return_value=True)

            # Check rate limit
            is_allowed, retry_after = await RateLimiter.check_rate_limit(
                identifier, limit_type
            )

            # Should be allowed
            assert is_allowed is True
            assert retry_after is None
            mock_redis.incr.assert_called_once()
            mock_redis.expire.assert_called_once()

    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeded(self):
        """Test rate limiting when limit is exceeded"""
        identifier = "test_user_456"
        limit_type = RateLimitType.AUTH

        # Mock Redis client
        with patch('app.middleware.rate_limit.redis_client') as mock_redis:
            # Return count exceeding limit
            mock_redis.incr = AsyncMock(return_value=11)  # Exceeds AUTH limit of 10
            mock_redis.expire = AsyncMock(return_value=True)
            mock_redis.redis.ttl = AsyncMock(return_value=60)

            # Check rate limit
            is_allowed, retry_after = await RateLimiter.check_rate_limit(
                identifier, limit_type
            )

            # Should not be allowed
            assert is_allowed is False
            assert retry_after == 60

    @pytest.mark.asyncio
    async def test_check_rate_limit_redis_error(self):
        """Test rate limiting fails open when Redis is unavailable"""
        identifier = "test_user_789"
        limit_type = RateLimitType.GENERAL

        # Mock Redis client that raises exception
        with patch('app.middleware.rate_limit.redis_client') as mock_redis:
            mock_redis.incr = AsyncMock(side_effect=Exception("Redis connection error"))

            # Check rate limit - should fail open
            is_allowed, retry_after = await RateLimiter.check_rate_limit(
                identifier, limit_type
            )

            # Should be allowed despite Redis error
            assert is_allowed is True
            assert retry_after is None

    @pytest.mark.asyncio
    async def test_get_identifier_with_user(self):
        """Test identifier extraction with authenticated user"""
        # Mock request with user
        request = Mock()
        request.state.user_id = "user_123"
        request.client.host = "192.168.1.1"
        request.headers = {}

        # Get identifier
        identifier = RateLimiter._get_identifier(request, RateLimitType.SEARCH)

        # Should use user ID
        assert identifier == "user:user_123"

    @pytest.mark.asyncio
    async def test_get_identifier_without_user(self):
        """Test identifier extraction without authenticated user"""
        # Mock request without user
        request = Mock()
        request.state = Mock(spec=[])  # No user_id attribute
        request.client.host = "192.168.1.1"
        request.headers = {}

        # Get identifier
        identifier = RateLimiter._get_identifier(request, RateLimitType.SEARCH)

        # Should use IP address
        assert identifier == "ip:192.168.1.1"

    @pytest.mark.asyncio
    async def test_get_identifier_with_proxy(self):
        """Test identifier extraction with proxy headers"""
        # Mock request with proxy
        request = Mock()
        request.state = Mock(spec=[])  # No user_id attribute
        request.client.host = "192.168.1.1"
        request.headers = {"X-Forwarded-For": "203.0.113.1, 198.51.100.1"}

        # Get identifier
        identifier = RateLimiter._get_identifier(request, RateLimitType.SEARCH)

        # Should use first IP from X-Forwarded-For
        assert identifier == "ip:203.0.113.1"


class TestRateLimitDecorator:
    """Test rate_limit decorator"""

    @pytest.mark.asyncio
    async def test_decorator_allows_request(self):
        """Test decorator allows requests under limit"""
        # Mock request
        request = Mock()
        request.state.user_id = "user_123"
        request.client.host = "192.168.1.1"
        request.headers = {}

        # Mock rate limit check
        with patch('app.middleware.rate_limit.RateLimiter.check_rate_limit') as mock_check:
            mock_check.return_value = (True, None)

            # Create test function with decorator
            @rate_limit(RateLimitType.SEARCH)
            async def test_function(request_arg):
                return {"status": "success"}

            # Call function
            result = await test_function(request)

            # Should succeed
            assert result == {"status": "success"}

    @pytest.mark.asyncio
    async def test_decorator_blocks_request(self):
        """Test decorator blocks requests over limit"""
        # Mock request
        request = Mock()
        request.state.user_id = "user_123"
        request.client.host = "192.168.1.1"
        request.headers = {}

        # Mock rate limit check that fails
        with patch('app.middleware.rate_limit.RateLimiter.check_rate_limit') as mock_check:
            from app.core.errors import RateLimitError
            mock_check.return_value = (False, 45)

            # Create test function with decorator
            @rate_limit(RateLimitType.SEARCH)
            async def test_function(request_arg):
                return {"status": "success"}

            # Call function - should raise RateLimitError
            with pytest.raises(RateLimitError) as exc_info:
                await test_function(request)

            # Verify error details
            assert "Rate limit exceeded" in str(exc_info.value)


class TestRateLimitConfig:
    """Test rate limit configuration"""

    def test_default_limits(self):
        """Test default rate limit values"""
        assert RateLimitConfig.LIMITS[RateLimitType.SEARCH] == 100
        assert RateLimitConfig.LIMITS[RateLimitType.AUTH] == 10
        assert RateLimitConfig.LIMITS[RateLimitType.UPLOAD] == 5
        assert RateLimitConfig.LIMITS[RateLimitType.GENERAL] == 60

    def test_window_size(self):
        """Test time window configuration"""
        assert RateLimitConfig.WINDOW_SIZE == 60  # 60 seconds

    def test_enabled_flag(self):
        """Test rate limiting can be enabled/disabled"""
        assert isinstance(RateLimitConfig.ENABLED, bool)

    def test_ip_fallback(self):
        """Test IP fallback configuration"""
        assert isinstance(RateLimitConfig.USE_IP_FALLBACK, bool)


class TestRateLimitIntegration:
    """Integration tests for rate limiting"""

    @pytest.mark.asyncio
    async def test_multiple_requests_increment_counter(self):
        """Test that multiple requests increment the counter"""
        identifier = "integration_test_user"
        limit_type = RateLimitType.GENERAL

        with patch('app.middleware.rate_limit.redis_client') as mock_redis:
            # Simulate incrementing counter
            call_count = [0]

            async def mock_incr(key):
                call_count[0] += 1
                return call_count[0]

            mock_redis.incr = AsyncMock(side_effect=mock_incr)
            mock_redis.expire = AsyncMock(return_value=True)

            # Make multiple requests
            for i in range(5):
                is_allowed, _ = await RateLimiter.check_rate_limit(
                    identifier, limit_type
                )
                assert is_allowed is True

            # Verify counter was incremented 5 times
            assert call_count[0] == 5

    @pytest.mark.asyncio
    async def test_different_limit_types_separate_counters(self):
        """Test that different limit types maintain separate counters"""
        identifier = "multi_limit_test_user"

        with patch('app.middleware.rate_limit.redis_client') as mock_redis:
            # Track which keys were incremented
            incremented_keys = []

            async def mock_incr(key):
                incremented_keys.append(key)
                return 1

            mock_redis.incr = AsyncMock(side_effect=mock_incr)
            mock_redis.expire = AsyncMock(return_value=True)

            # Make requests with different limit types
            await RateLimiter.check_rate_limit(identifier, RateLimitType.SEARCH)
            await RateLimiter.check_rate_limit(identifier, RateLimitType.AUTH)
            await RateLimiter.check_rate_limit(identifier, RateLimitType.UPLOAD)

            # Verify different keys were used
            assert len(incremented_keys) == 3
            assert any("search" in key for key in incremented_keys)
            assert any("auth" in key for key in incremented_keys)
            assert any("upload" in key for key in incremented_keys)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
