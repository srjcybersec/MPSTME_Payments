"use client";

export function shouldUseCachedMenu(updatedAtIso: string, nowMs = Date.now(), ttlMs = 5 * 60 * 1000) {
  const updatedAtMs = new Date(updatedAtIso).getTime();
  if (!Number.isFinite(updatedAtMs)) return false;
  return nowMs - updatedAtMs < ttlMs;
}
