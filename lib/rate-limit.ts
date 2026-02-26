/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window counter per (userId + routeKey).
 * Limits reset automatically after the window expires.
 *
 * Note: In-memory store resets on deploy/restart — acceptable for
 * single-instance Vercel deployments. For multi-instance, swap
 * to Upstash Redis (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets */
  retryAfter: number;
}

/**
 * Check and consume a rate limit token.
 *
 * @param userId - Authenticated user ID
 * @param routeKey - Unique key for the route (e.g. "analyze", "meals:post")
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed + metadata for headers
 */
export function rateLimit(
  userId: string,
  routeKey: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const key = `${userId}:${routeKey}`;
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      retryAfter: 0,
    };
  }

  // Within window — check count
  if (entry.count < config.limit) {
    entry.count++;
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - entry.count,
      retryAfter: 0,
    };
  }

  // Exceeded
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return {
    allowed: false,
    limit: config.limit,
    remaining: 0,
    retryAfter,
  };
}

/**
 * Pre-configured rate limits per route.
 *
 * AI-powered routes (analyze, score, weekly report) have strict limits
 * because each call costs API tokens. CRUD routes are more generous.
 */
export const RATE_LIMITS = {
  // AI routes — expensive
  analyze:        { limit: 20,  windowSeconds: 86400 },  // 20/day
  score:          { limit: 30,  windowSeconds: 86400 },  // 30/day
  weeklyReport:   { limit: 5,   windowSeconds: 86400 },  // 5/day

  // CRUD routes — moderate
  mealsRead:      { limit: 120, windowSeconds: 3600 },   // 120/hour
  mealsWrite:     { limit: 60,  windowSeconds: 3600 },   // 60/hour
  mealsDelete:    { limit: 30,  windowSeconds: 3600 },   // 30/hour
  profileRead:    { limit: 120, windowSeconds: 3600 },   // 120/hour
  profileWrite:   { limit: 30,  windowSeconds: 3600 },   // 30/hour
  measurements:   { limit: 60,  windowSeconds: 3600 },   // 60/hour
  templates:      { limit: 60,  windowSeconds: 3600 },   // 60/hour
} as const;

/**
 * Build rate-limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfter);
  }
  return headers;
}
