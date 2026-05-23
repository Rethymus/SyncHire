"""
Redis Caching Strategy for SyncHire

Provides caching layer for:
- User sessions
- JD parsing results
- Match calculations
- Embedding lookups
"""

import json
import uuid
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.redis import redis_client


class CacheService:
    """Redis caching service with TTL management"""

    # TTL constants (in seconds)
    TTL_SHORT = 300  # 5 minutes - user sessions, frequently changing data
    TTL_MEDIUM = 3600  # 1 hour - parsing results, match scores
    TTL_LONG = 86400  # 24 hours - embeddings, user profiles
    TTL_EXTENDED = 604800  # 7 days - static data, templates

    @staticmethod
    def _make_key(prefix: str, identifier: str) -> str:
        """Generate consistent cache key"""
        return f"synchire:{prefix}:{identifier}"

    @staticmethod
    async def get(prefix: str, identifier: str) -> Optional[Any]:
        """Get value from cache"""
        key = CacheService._make_key(prefix, identifier)
        try:
            value = await redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    @staticmethod
    async def set(
        prefix: str, identifier: str, value: Any, ttl: int = TTL_MEDIUM
    ) -> bool:
        """Set value in cache with TTL"""
        key = CacheService._make_key(prefix, identifier)
        try:
            serialized = json.dumps(value, ensure_ascii=False)
            await redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    @staticmethod
    async def delete(prefix: str, identifier: str) -> bool:
        """Delete value from cache"""
        key = CacheService._make_key(prefix, identifier)
        try:
            await redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    @staticmethod
    async def invalidate_pattern(prefix: str, pattern: str = "*") -> int:
        """Invalidate all keys matching pattern"""
        search_pattern = CacheService._make_key(prefix, pattern)
        try:
            keys = await redis_client.keys(search_pattern)
            if keys:
                return await redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache invalidate error: {e}")
            return 0


class CachedQueries:
    """Common cached query patterns"""

    @staticmethod
    async def get_user_resumes(user_id: uuid.UUID) -> Optional[list]:
        """Get cached resume list for user"""
        return await CacheService.get("user_resumes", str(user_id))

    @staticmethod
    async def set_user_resumes(user_id: uuid.UUID, resumes: list) -> bool:
        """Cache resume list for user"""
        return await CacheService.set(
            "user_resumes", str(user_id), resumes, CacheService.TTL_SHORT
        )

    @staticmethod
    async def get_user_jds(user_id: uuid.UUID) -> Optional[list]:
        """Get cached JD list for user"""
        return await CacheService.get("user_jds", str(user_id))

    @staticmethod
    async def set_user_jds(user_id: uuid.UUID, jds: list) -> bool:
        """Cache JD list for user"""
        return await CacheService.set(
            "user_jds", str(user_id), jds, CacheService.TTL_SHORT
        )

    @staticmethod
    async def get_jd_parse_result(content_hash: str) -> Optional[dict]:
        """Get cached JD parsing result"""
        return await CacheService.get("jd_parse", content_hash)

    @staticmethod
    async def set_jd_parse_result(content_hash: str, result: dict) -> bool:
        """Cache JD parsing result"""
        return await CacheService.set(
            "jd_parse", content_hash, result, CacheService.TTL_LONG
        )

    @staticmethod
    async def get_match_score(resume_id: uuid.UUID, jd_id: uuid.UUID) -> Optional[dict]:
        """Get cached match score"""
        key = f"{resume_id}:{jd_id}"
        return await CacheService.get("match_score", key)

    @staticmethod
    async def set_match_score(
        resume_id: uuid.UUID, jd_id: uuid.UUID, score: dict
    ) -> bool:
        """Cache match score"""
        key = f"{resume_id}:{jd_id}"
        return await CacheService.set(
            "match_score", key, score, CacheService.TTL_MEDIUM
        )

    @staticmethod
    async def invalidate_user_data(user_id: uuid.UUID) -> int:
        """Invalidate all cached data for user"""
        count = 0
        count += await CacheService.invalidate_pattern("user_resumes", str(user_id))
        count += await CacheService.invalidate_pattern("user_jds", str(user_id))
        return count


# Cache decorator for service methods
def cached(prefix: str, ttl: int = CacheService.TTL_MEDIUM):
    """Decorator to cache function results"""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            key_parts = [str(arg) for arg in args if not isinstance(arg, AsyncSession)]
            cache_key = ":".join(key_parts)

            # Try to get from cache
            cached_value = await CacheService.get(prefix, cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            if result is not None:
                await CacheService.set(prefix, cache_key, result, ttl)

            return result

        return wrapper

    return decorator
