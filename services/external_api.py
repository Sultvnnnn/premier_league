import os
import time
from threading import Lock

import requests

API_KEY = os.getenv("FOOTBALL_API_KEY")
HEADERS = {"X-Auth-Token": API_KEY}

CACHE_TTL_SECONDS = 15 * 60  # 15 minutes

_cache: dict[str, tuple[float, object]] = {}
_cache_lock = Lock()


def cache_get(key: str):
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            del _cache[key]
            return None
        return value


def cache_set(key: str, value: object, ttl_seconds: float = CACHE_TTL_SECONDS) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic() + ttl_seconds, value)


def fetch_json(url: str) -> dict:
    """Fetch JSON from football-data.org with a 15-minute in-memory cache."""
    cached = cache_get(url)
    if cached is not None:
        return cached

    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    data = response.json()
    cache_set(url, data)
    return data
