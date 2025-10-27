/**
 * Client-side rate limiting utility
 * Prevents abuse and improves UX by throttling authentication attempts
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.storage = new Map();
    this.config = config;
  }

  /**
   * Check if an action is allowed for a given key
   * @param key - Unique identifier (e.g., email, IP, action type)
   * @returns Object with isAllowed flag and optional error message
   */
  check(key: string): { isAllowed: boolean; remainingAttempts?: number; retryAfter?: number; message?: string } {
    const now = Date.now();
    const entry = this.storage.get(key);

    // No previous attempts
    if (!entry) {
      this.storage.set(key, {
        attempts: 1,
        firstAttemptTime: now,
      });
      return {
        isAllowed: true,
        remainingAttempts: this.config.maxAttempts - 1
      };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        isAllowed: false,
        retryAfter,
        message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
      };
    }

    // Check if window has expired - reset counter
    if (now - entry.firstAttemptTime > this.config.windowMs) {
      this.storage.set(key, {
        attempts: 1,
        firstAttemptTime: now,
      });
      return {
        isAllowed: true,
        remainingAttempts: this.config.maxAttempts - 1
      };
    }

    // Increment attempts within window
    entry.attempts += 1;

    // Check if exceeded max attempts
    if (entry.attempts > this.config.maxAttempts) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      this.storage.set(key, entry);
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
      return {
        isAllowed: false,
        retryAfter,
        message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
      };
    }

    // Still within limits
    this.storage.set(key, entry);
    return {
      isAllowed: true,
      remainingAttempts: this.config.maxAttempts - entry.attempts
    };
  }

  /**
   * Reset rate limit for a specific key (e.g., after successful authentication)
   */
  reset(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.storage.clear();
  }

  /**
   * Clean up expired entries (optional periodic cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      // Remove entries that are no longer blocked and past the window
      if (
        (!entry.blockedUntil || now > entry.blockedUntil) &&
        now - entry.firstAttemptTime > this.config.windowMs
      ) {
        this.storage.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters for different actions
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5, // 5 login attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
});

export const signupRateLimiter = new RateLimiter({
  maxAttempts: 3, // 3 signup attempts
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
});

export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3, // 3 reset attempts
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
});

// Periodic cleanup (runs every 30 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    authRateLimiter.cleanup();
    signupRateLimiter.cleanup();
    passwordResetRateLimiter.cleanup();
  }, 30 * 60 * 1000);
}
