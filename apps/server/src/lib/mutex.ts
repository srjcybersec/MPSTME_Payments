import { redis } from "./redis.js";

export async function withMutex<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const lockValue = crypto.randomUUID();
  const acquired = await redis.set(key, lockValue, "PX", ttlMs, "NX");
  if (acquired !== "OK") {
    throw new Error("RESOURCE_LOCKED");
  }

  try {
    return await fn();
  } finally {
    const current = await redis.get(key);
    if (current === lockValue) {
      await redis.del(key);
    }
  }
}
