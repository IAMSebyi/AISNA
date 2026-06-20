import asyncio
import json
import logging
import os
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_store: dict[str, dict] = {}
_locks: dict[str, asyncio.Lock] = {}
_locks_meta = asyncio.Lock()

_loaded_from_disk = False


def _cache_path(symbol: str) -> str:
    return os.path.join(settings.NEWS_CACHE_DIR, f"{symbol}.json")


def _load_disk_cache() -> None:
    global _loaded_from_disk
    if _loaded_from_disk:
        return
    _loaded_from_disk = True

    cache_dir = settings.NEWS_CACHE_DIR
    if not os.path.isdir(cache_dir):
        return

    for filename in os.listdir(cache_dir):
        if not filename.endswith(".json"):
            continue
        symbol = filename[:-5]
        try:
            with open(os.path.join(cache_dir, filename)) as f:
                entry = json.load(f)
            if "data" in entry and "fetched_at" in entry:
                _store[symbol] = entry
        except Exception:
            pass


async def _get_lock(symbol: str) -> asyncio.Lock:
    async with _locks_meta:
        if symbol not in _locks:
            _locks[symbol] = asyncio.Lock()
        return _locks[symbol]


def get(symbol: str) -> tuple[list[Any] | None, bool]:
    """Return (feed, is_stale). feed is None when not cached at all."""
    _load_disk_cache()
    entry = _store.get(symbol)
    if entry is None:
        return None, False
    age = time.time() - entry["fetched_at"]
    is_stale = age >= settings.NEWS_CACHE_TTL_SECONDS
    return entry["data"], is_stale


def set(symbol: str, feed: list[Any]) -> None:
    entry = {"data": feed, "fetched_at": time.time()}
    _store[symbol] = entry

    cache_dir = settings.NEWS_CACHE_DIR
    try:
        os.makedirs(cache_dir, exist_ok=True)
        with open(_cache_path(symbol), "w") as f:
            json.dump(entry, f)
    except Exception as e:
        logger.warning("Could not persist news cache for %s: %s", symbol, e)


async def lock(symbol: str) -> asyncio.Lock:
    return await _get_lock(symbol)


def clear(symbol: str | None = None) -> None:
    """Clear in-memory cache. Optionally for a single symbol (used in tests)."""
    global _loaded_from_disk
    if symbol is None:
        _store.clear()
        _loaded_from_disk = False
    else:
        _store.pop(symbol, None)
