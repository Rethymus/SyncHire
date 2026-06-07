import redis.asyncio as aioredis
import inspect
from app.core.config import get_settings

settings = get_settings()


class RedisClient:
    def __init__(self):
        self.redis = None
        self._connected = False

    async def connect(self):
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        self._connected = True

    async def disconnect(self):
        if self.redis:
            close = getattr(self.redis, "aclose", self.redis.close)
            result = close()
            if inspect.isawaitable(result):
                await result
            self._connected = False

    def is_connected(self) -> bool:
        """Check if Redis client is connected"""
        return self._connected and self.redis is not None

    async def get(self, key: str) -> str | None:
        if self.redis:
            return await self.redis.get(key)
        return None

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        if self.redis:
            return await self.redis.set(key, value, ex=ex)
        return False

    async def delete(self, key: str) -> int:
        if self.redis:
            return await self.redis.delete(key)
        return 0

    async def exists(self, key: str) -> int:
        if self.redis:
            return await self.redis.exists(key)
        return 0

    async def incr(self, key: str) -> int:
        if self.redis:
            return await self.redis.incr(key)
        return 0

    async def expire(self, key: str, seconds: int) -> bool:
        if self.redis:
            return await self.redis.expire(key, seconds)
        return False


redis_client = RedisClient()
