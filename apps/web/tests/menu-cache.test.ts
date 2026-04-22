import { shouldUseCachedMenu } from "../lib/api/menu-cache";

describe("menu cache ttl logic", () => {
  it("uses cache when within ttl", () => {
    const now = Date.UTC(2026, 3, 8, 12, 0, 0);
    const recent = new Date(now - 60_000).toISOString();
    expect(shouldUseCachedMenu(recent, now, 5 * 60 * 1000)).toBe(true);
  });

  it("rejects stale cache older than ttl", () => {
    const now = Date.UTC(2026, 3, 8, 12, 0, 0);
    const stale = new Date(now - 6 * 60 * 1000).toISOString();
    expect(shouldUseCachedMenu(stale, now, 5 * 60 * 1000)).toBe(false);
  });

  it("rejects invalid timestamps", () => {
    expect(shouldUseCachedMenu("invalid-date")).toBe(false);
  });
});
