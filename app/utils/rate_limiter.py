"""
Thread-safe in-process sliding window rate limiter for sensitive authentication endpoints.
"""

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple


class SlidingWindowRateLimiter:
    """Tracks request timestamps per key over a rolling time window."""

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check_and_record(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Checks whether `key` is within `max_requests` in the last `window_seconds`.
        If allowed, records the current timestamp and returns (True, 0).
        If rate-limited, returns (False, retry_after_seconds).
        """
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                retry_after = max(1, int(bucket[0] + window_seconds - now) + 1)
                return False, retry_after

            bucket.append(now)
            return True, 0

    def clear(self) -> None:
        """Clears all recorded rate-limit state (primarily for automated tests)."""
        with self._lock:
            self._buckets.clear()


auth_rate_limiter = SlidingWindowRateLimiter()

