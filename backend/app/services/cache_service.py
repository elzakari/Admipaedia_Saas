"""
Redis Caching Service for ADMIPAEDIA
Provides centralized caching functionality for frequently accessed data
"""

import json
import pickle
import redis
from datetime import timedelta
from typing import Any, Optional, Dict, List, Union
from functools import wraps
import logging
from flask import current_app

logger = logging.getLogger(__name__)

class CacheService:
    """
    Centralized caching service using Redis
    """
    
    def __init__(self, redis_url: str = None):
        """
        Initialize cache service
        
        Args:
            redis_url: Redis connection URL
        """
        # Use provided URL or default, avoiding current_app during module import
        self.redis_url = redis_url or 'redis://localhost:6379/0'
        self._redis_client = None
        
        # Cache TTL settings (in seconds)
        self.DEFAULT_TTL = 3600  # 1 hour
        self.SHORT_TTL = 300     # 5 minutes
        self.LONG_TTL = 86400    # 24 hours
        
        # Cache key prefixes
        self.PREFIXES = {
            'user': 'user:',
            'student': 'student:',
            'teacher': 'teacher:',
            'parent': 'parent:',
            'class': 'class:',
            'subject': 'subject:',
            'exam': 'exam:',
            'grade': 'grade:',
            'attendance': 'attendance:',
            'analytics': 'analytics:',
            'dashboard': 'dashboard:',
            'notification': 'notification:',
            'session': 'session:',
            'permission': 'permission:'
        }
    
    @property
    def redis_client(self):
        """Get Redis client instance"""
        if self._redis_client is None:
            try:
                # Try to get Redis URL from Flask config if available, otherwise use default
                redis_url = self.redis_url
                try:
                    from flask import current_app
                    if current_app:
                        redis_url = current_app.config.get('REDIS_URL', self.redis_url)
                except RuntimeError:
                    # No application context, use default URL
                    pass
                
                self._redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self._redis_client.ping()
                logger.info("Redis connection established successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {str(e)}")
                # Return a mock client for development
                self._redis_client = MockRedisClient()
        return self._redis_client
    
    def _serialize_data(self, data: Any) -> str:
        """
        Serialize data for caching
        
        Args:
            data: Data to serialize
            
        Returns:
            Serialized data string
        """
        try:
            if isinstance(data, (dict, list, str, int, float, bool)):
                return json.dumps(data, default=str)
            else:
                # Use pickle for complex objects
                return pickle.dumps(data).hex()
        except Exception as e:
            logger.error(f"Failed to serialize data: {str(e)}")
            return json.dumps(str(data))
    
    def _deserialize_data(self, data: str) -> Any:
        """
        Deserialize cached data
        
        Args:
            data: Serialized data string
            
        Returns:
            Deserialized data
        """
        try:
            # Try JSON first
            return json.loads(data)
        except json.JSONDecodeError:
            try:
                # Try pickle
                return pickle.loads(bytes.fromhex(data))
            except Exception as e:
                logger.error(f"Failed to deserialize data: {str(e)}")
                return data
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        try:
            data = self.redis_client.get(key)
            if data is not None:
                return self._deserialize_data(data)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {str(e)}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            ttl = ttl or self.DEFAULT_TTL
            serialized_data = self._serialize_data(value)
            return self.redis_client.setex(key, ttl, serialized_data)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {str(e)}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete keys matching pattern
        
        Args:
            pattern: Pattern to match (e.g., 'user:*')
            
        Returns:
            Number of keys deleted
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for pattern {pattern}: {str(e)}")
            return 0
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        
        Args:
            key: Cache key
            
        Returns:
            True if key exists, False otherwise
        """
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {str(e)}")
            return False
    
    def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment numeric value in cache
        
        Args:
            key: Cache key
            amount: Amount to increment
            
        Returns:
            New value after increment
        """
        try:
            return self.redis_client.incr(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {str(e)}")
            return 0
    
    def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration time for key
        
        Args:
            key: Cache key
            ttl: Time to live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            return bool(self.redis_client.expire(key, ttl))
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {str(e)}")
            return False
    
    # Specialized caching methods
    def cache_user_data(self, user_id: int, user_data: Dict, ttl: int = None) -> bool:
        """Cache user data"""
        key = f"{self.PREFIXES['user']}{user_id}"
        return self.set(key, user_data, ttl or self.DEFAULT_TTL)
    
    def get_user_data(self, user_id: int) -> Optional[Dict]:
        """Get cached user data"""
        key = f"{self.PREFIXES['user']}{user_id}"
        return self.get(key)
    
    def cache_user_permissions(self, user_id: int, permissions: List[str], ttl: int = None) -> bool:
        """Cache user permissions"""
        key = f"{self.PREFIXES['permission']}{user_id}"
        return self.set(key, permissions, ttl or self.DEFAULT_TTL)
    
    def get_user_permissions(self, user_id: int) -> Optional[List[str]]:
        """Get cached user permissions"""
        key = f"{self.PREFIXES['permission']}{user_id}"
        return self.get(key)
    
    def cache_dashboard_stats(self, user_id: int, stats: Dict, ttl: int = None) -> bool:
        """Cache dashboard statistics"""
        key = f"{self.PREFIXES['dashboard']}{user_id}"
        return self.set(key, stats, ttl or self.SHORT_TTL)
    
    def get_dashboard_stats(self, user_id: int) -> Optional[Dict]:
        """Get cached dashboard statistics"""
        key = f"{self.PREFIXES['dashboard']}{user_id}"
        return self.get(key)
    
    def cache_class_data(self, class_id: int, class_data: Dict, ttl: int = None) -> bool:
        """Cache class data"""
        key = f"{self.PREFIXES['class']}{class_id}"
        return self.set(key, class_data, ttl or self.LONG_TTL)
    
    def get_class_data(self, class_id: int) -> Optional[Dict]:
        """Get cached class data"""
        key = f"{self.PREFIXES['class']}{class_id}"
        return self.get(key)
    
    def cache_analytics_data(self, analytics_key: str, data: Dict, ttl: int = None) -> bool:
        """Cache analytics data"""
        key = f"{self.PREFIXES['analytics']}{analytics_key}"
        return self.set(key, data, ttl or self.SHORT_TTL)
    
    def get_analytics_data(self, analytics_key: str) -> Optional[Dict]:
        """Get cached analytics data"""
        key = f"{self.PREFIXES['analytics']}{analytics_key}"
        return self.get(key)
    
    def invalidate_user_cache(self, user_id: int):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"{self.PREFIXES['user']}{user_id}*",
            f"{self.PREFIXES['permission']}{user_id}*",
            f"{self.PREFIXES['dashboard']}{user_id}*",
            f"{self.PREFIXES['session']}{user_id}*"
        ]
        
        for pattern in patterns:
            self.delete_pattern(pattern)
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        try:
            info = self.redis_client.info()
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', '0B'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(info.get('keyspace_hits', 0), info.get('keyspace_misses', 0))
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {str(e)}")
            return {}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate"""
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0


class MockRedisClient:
    """Mock Redis client for development/testing"""
    
    def __init__(self):
        self._data = {}
    
    def get(self, key):
        return self._data.get(key)
    
    def setex(self, key, ttl, value):
        self._data[key] = value
        return True
    
    def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self._data:
                del self._data[key]
                count += 1
        return count
    
    def exists(self, key):
        return key in self._data
    
    def keys(self, pattern):
        import fnmatch
        return [key for key in self._data.keys() if fnmatch.fnmatch(key, pattern)]
    
    def incr(self, key, amount=1):
        current = int(self._data.get(key, 0))
        self._data[key] = str(current + amount)
        return current + amount
    
    def expire(self, key, ttl):
        return key in self._data
    
    def ping(self):
        return True
    
    def info(self):
        return {
            'connected_clients': 1,
            'used_memory_human': '1MB',
            'keyspace_hits': 100,
            'keyspace_misses': 10
        }


# Caching decorators
def cached(ttl: int = 3600, key_prefix: str = ''):
    """
    Decorator for caching function results
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = CacheService()
            
            # Generate cache key
            key_parts = [key_prefix or func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            cache_key = ':'.join(key_parts)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for key: {cache_key}, result cached")
            
            return result
        return wrapper
    return decorator


def cache_invalidate(key_pattern: str):
    """
    Decorator for invalidating cache entries
    
    Args:
        key_pattern: Pattern for keys to invalidate
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # Invalidate cache after successful execution
            cache = CacheService()
            cache.delete_pattern(key_pattern)
            logger.debug(f"Cache invalidated for pattern: {key_pattern}")
            
            return result
        return wrapper
    return decorator


# Global cache instance
# Initialize cache service without application context
cache_service = None

def get_cache_service():
    """Get or create cache service instance"""
    global cache_service
    if cache_service is None:
        cache_service = CacheService()
    return cache_service