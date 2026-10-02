/**
 * In-memory sliding-window IP rate limiter.
 * Protects public and compute-heavy endpoints against bursts and abuse.
 */

const ipBuckets = new Map();

/**
 * Checks whether an incoming request from an IP is allowed under the rate limit.
 *
 * @param {string} ip - Client IP address
 * @param {object} options
 * @param {number} options.max - Maximum allowed requests in the time window (default: 30)
 * @param {number} options.windowMs - Sliding window duration in milliseconds (default: 60,000)
 * @returns {{ allowed: boolean, remaining: number, resetInMs: number, limit: number }}
 */
export function checkIpRateLimit(ip, { max = 30, windowMs = 60 * 1000 } = {}) {
  const safeIp = ip || "127.0.0.1";
  const now = Date.now();
  let timestamps = ipBuckets.get(safeIp) || [];

  // Filter timestamps within the sliding window
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    const oldest = timestamps[0];
    const resetInMs = Math.max(0, oldest + windowMs - now);
    ipBuckets.set(safeIp, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetInMs,
      limit: max,
    };
  }

  timestamps.push(now);
  ipBuckets.set(safeIp, timestamps);

  return {
    allowed: true,
    remaining: max - timestamps.length,
    resetInMs: windowMs,
    limit: max,
  };
}

/**
 * Extracts client IP from standard reverse proxy and cloud headers.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  if (!request?.headers) return "127.0.0.1";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}
