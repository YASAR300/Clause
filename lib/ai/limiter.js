export class TokenRateLimiter {
  constructor({ tokensPerMinute = 6000 } = {}) {
    this.tokensPerMinute = tokensPerMinute;
    this.history = []; // Array of { timestamp: number, tokens: number }
    this.queue = Promise.resolve();
  }

  prune(now = Date.now()) {
    const windowStart = now - 60000;
    this.history = this.history.filter((entry) => entry.timestamp > windowStart);
  }

  getUsedTokens(now = Date.now()) {
    this.prune(now);
    return this.history.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  calculateWaitMs(requiredTokens, now = Date.now()) {
    this.prune(now);
    const currentUsed = this.getUsedTokens(now);
    if (currentUsed + requiredTokens <= this.tokensPerMinute) {
      return 0;
    }

    let tokensToFree = currentUsed + requiredTokens - this.tokensPerMinute;
    for (const entry of this.history) {
      tokensToFree -= entry.tokens;
      if (tokensToFree <= 0) {
        const timeToExpiry = entry.timestamp + 60000 - now;
        return Math.max(0, timeToExpiry);
      }
    }

    return 60000;
  }

  recordUsage(tokens, timestamp = Date.now()) {
    this.history.push({ timestamp, tokens });
    this.prune(timestamp);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  parseRetryAfter(error) {
    let retryAfterHeader = null;

    if (error?.headers) {
      if (typeof error.headers.get === "function") {
        retryAfterHeader = error.headers.get("retry-after");
      } else if (error.headers["retry-after"]) {
        retryAfterHeader = error.headers["retry-after"];
      }
    } else if (error?.response?.headers) {
      if (typeof error.response.headers.get === "function") {
        retryAfterHeader = error.response.headers.get("retry-after");
      } else {
        retryAfterHeader = error.response.headers["retry-after"];
      }
    }

    if (!retryAfterHeader) {
      return 5;
    }

    const parsedSeconds = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
      return Math.min(parsedSeconds, 30);
    }

    const dateParsed = Date.parse(retryAfterHeader);
    if (!Number.isNaN(dateParsed)) {
      const diffSec = Math.ceil((dateParsed - Date.now()) / 1000);
      return Math.max(1, Math.min(diffSec, 30));
    }

    return 5;
  }

  async execute(task, { estimatedTokens = 800, onWait, maxRetries = 3 } = {}) {
    let attempt = 0;

    const runAttempt = async () => {
      let waitMs = this.calculateWaitMs(estimatedTokens, Date.now());
      if (waitMs > 0) {
        const waitSec = Math.ceil(waitMs / 1000);
        if (typeof onWait === "function") {
          onWait({
            type: "rate_limit",
            message: `Waiting for the model's rate limit, retrying in ${waitSec}s`,
            retryIn: waitSec,
          });
        }
        await this.sleep(waitMs);
      }

      try {
        const result = await task();
        this.recordUsage(estimatedTokens, Date.now());
        return result;
      } catch (error) {
        const isRateLimit =
          error?.status === 429 ||
          error?.response?.status === 429 ||
          error?.code === 429 ||
          /rate[ -]?limit|429/i.test(error?.message || "");

        if (isRateLimit && attempt < maxRetries) {
          attempt += 1;
          const retrySec = this.parseRetryAfter(error);
          if (typeof onWait === "function") {
            onWait({
              type: "rate_limit",
              message: `Waiting for the model's rate limit, retrying in ${retrySec}s`,
              retryIn: retrySec,
            });
          }
          await this.sleep(retrySec * 1000);
          return runAttempt();
        }

        throw error;
      }
    };

    // Serialize queue to avoid simultaneous bursts exceeding limits
    const currentQueue = this.queue;
    let release;
    this.queue = new Promise((resolve) => {
      release = resolve;
    });

    try {
      await currentQueue;
      return await runAttempt();
    } finally {
      release();
    }
  }
}

export const globalRateLimiter = new TokenRateLimiter({
  tokensPerMinute: process.env.AI_TOKENS_PER_MINUTE
    ? parseInt(process.env.AI_TOKENS_PER_MINUTE, 10)
    : 6000,
});
