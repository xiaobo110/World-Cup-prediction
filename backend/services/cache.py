"""Simple JSON file-based cache service."""
import json
import time
import logging
import os
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class CacheService:
    """File-based cache with TTL support."""

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: dict = {}

    def _get_path(self, key: str) -> Path:
        safe_key = key.replace("/", "_").replace("\\", "_").replace(" ", "_")
        return self.cache_dir / f"{safe_key}.json"

    def get(self, key: str) -> Optional[Any]:
        """Get cached data. Returns None if not found or expired."""
        # Check memory cache first
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if time.time() < entry.get("expires_at", 0):
                return entry["data"]
            else:
                del self._memory_cache[key]

        # Check file cache
        path = self._get_path(key)
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    entry = json.load(f)
                if time.time() < entry.get("expires_at", 0):
                    self._memory_cache[key] = entry
                    return entry["data"]
                else:
                    path.unlink(missing_ok=True)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Cache read error for {key}: {e}")
                path.unlink(missing_ok=True)

        return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """Cache data with TTL in seconds."""
        entry = {
            "data": value,
            "expires_at": time.time() + ttl,
            "created_at": time.time(),
        }

        # Store in memory
        self._memory_cache[key] = entry

        # Store on disk
        path = self._get_path(key)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(entry, f, ensure_ascii=False)
        except OSError as e:
            logger.warning(f"Cache write error for {key}: {e}")

    def clear(self) -> None:
        """Clear all cached data."""
        self._memory_cache.clear()
        for f in self.cache_dir.glob("*.json"):
            try:
                f.unlink()
            except OSError:
                pass
        logger.info("Cache cleared")

    def delete(self, key: str) -> None:
        """Delete a specific cache entry."""
        self._memory_cache.pop(key, None)
        path = self._get_path(key)
        path.unlink(missing_ok=True)
