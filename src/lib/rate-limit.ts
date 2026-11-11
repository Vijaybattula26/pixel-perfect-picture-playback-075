/**
 * Best-effort in-memory sliding-window rate limiter.
 * Lives per server instance, so it resets on cold start and isn't shared
 * across instances — fine as a speed bump, not a hard quota.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return {
    /** Returns true when the request is allowed (and records it). */
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - (recent[0] ?? now))) / 1000) };
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep memory bounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}
