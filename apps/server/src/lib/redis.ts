import { Redis } from "ioredis";
import { env } from "./env.js";

/**
 * Shared client: Socket.IO redis-adapter issues subscribe commands before the stream is
 * writable; keep default offline queue enabled so startup does not crash.
 * For routes that must not hang when Redis is down, use {@link tryRedis}.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const REDIS_COMMAND_TIMEOUT_MS = 2500;

/** Run a Redis command with a ceiling wait; on timeout/error return null (callers treat as cache miss). */
export async function tryRedis<T>(fn: () => Promise<T>, timeoutMs = REDIS_COMMAND_TIMEOUT_MS): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("REDIS_COMMAND_TIMEOUT")), timeoutMs);
      })
    ]);
  } catch {
    return null;
  }
}

redis.on("error", (error) => {
  // Keep process alive when Redis is temporarily unavailable.
  console.error("Redis connection error:", error.message);
});
