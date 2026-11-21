// security.ts: Security headers, client IP resolution and per-IP rate limits.
// See SECURITY.md for the threat model and how each control is tested.

import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "./routes/common.js";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/** Sets the security headers on every response, including errors and static files. */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      c.res.headers.set(name, value);
    }
  };
}

/**
 * The client IP. With N trusted proxies in front, each appends the address it saw to
 * X-Forwarded-For, so the client is the Nth entry from the right; anything further left was
 * written by the client and cannot be trusted. With no trusted proxies the header is ignored.
 */
export function clientIp(
  forwardedFor: string | undefined,
  trustedProxies: number,
  socketAddress: string | undefined,
): string {
  if (trustedProxies > 0 && forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = hops[hops.length - trustedProxies];
    if (ip) return ip;
  }
  return socketAddress || "unknown";
}

export interface RateLimiter {
  /** Records one request; returns 0 when allowed, else the seconds until the next is allowed. */
  hit(key: string, now?: number): number;
}

/** Sliding one-minute window per key, kept in memory (one Cloud Run instance's view). */
export function createRateLimiter(limitPerMinute: number, windowMs = 60_000): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  return {
    hit(key, now = Date.now()) {
      if (now - lastSweep > windowMs) {
        // Forget idle clients so the map cannot grow without bound.
        for (const [k, times] of hits) {
          if (times[times.length - 1] <= now - windowMs) hits.delete(k);
        }
        lastSweep = now;
      }
      const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
      if (recent.length >= limitPerMinute) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      }
      recent.push(now);
      hits.set(key, recent);
      return 0;
    },
  };
}

/** Rejects with 429 and Retry-After once a client is over the limit. */
export function rateLimit(
  limiter: RateLimiter,
  ipOf: (c: Context) => string,
  bucket: string,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const retryAfter = limiter.hit(`${bucket}:${ipOf(c)}`);
    if (retryAfter <= 0) return next();
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "Too many requests", requestId: c.get("requestId") }, 429);
  };
}
