/**
 * In-memory sliding window rate limiter.
 *
 * Uses a Map keyed by identifier to track request timestamps within a rolling
 * window.  Expired entries are pruned automatically every 60 seconds to
 * prevent unbounded memory growth.
 *
 * No external dependencies required -- works entirely in-process.
 */

// ---------------------------------------------------------------------------
// Internal storage
// ---------------------------------------------------------------------------

/** Each entry stores the list of request timestamps (epoch ms) for a window. */
interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// ---------------------------------------------------------------------------
// Periodic cleanup of expired entries
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 60_000; // 60 seconds

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove timestamps older than the largest reasonable window (10 min).
      // Individual calls also prune per their own window, but this sweep
      // catches entries that are no longer being accessed at all.
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < 10 * 60 * 1000
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is still running.
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

startCleanup();

// ---------------------------------------------------------------------------
// Core rate-limit function
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
  /** Unix epoch (seconds) when the current window resets. */
  reset: number;
}

/**
 * Check and record a request against the sliding window rate limit.
 *
 * @param identifier  Unique key -- typically an IP address or user ID.
 * @param limit       Maximum number of requests allowed in the window.
 * @param window      Window duration in **seconds**.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  window: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = window * 1000;
  const windowStart = now - windowMs;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Prune timestamps outside the current window.
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Determine earliest timestamp to compute reset time.
  const reset =
    entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0] + windowMs) / 1000)
      : Math.ceil((now + windowMs) / 1000);

  if (entry.timestamps.length >= limit) {
    return {
      success: false,
      remaining: 0,
      reset,
    };
  }

  // Record the current request.
  entry.timestamps.push(now);

  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Middleware helper for Next.js API route handlers
// ---------------------------------------------------------------------------

export interface RateLimitMiddlewareOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in seconds. */
  window: number;
  /**
   * Optional function to derive the identifier from the request.
   * Defaults to the `x-forwarded-for` header or `"unknown"`.
   */
  identifierFn?: (request: Request) => string;
}

/**
 * Create a rate-limit checker scoped to the given options.
 *
 * Usage:
 * ```ts
 * const limiter = rateLimitMiddleware({ limit: 10, window: 60 });
 *
 * export async function POST(request: Request) {
 *   const result = await limiter(request);
 *   if (!result.success) {
 *     return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export function rateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const { limit, window: windowSec, identifierFn } = options;

  return async (request: Request): Promise<RateLimitResult> => {
    const identifier = identifierFn
      ? identifierFn(request)
      : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";

    return rateLimit(identifier, limit, windowSec);
  };
}
