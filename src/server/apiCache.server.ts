// Fix B: In-memory LRU cache for the auth hot-path.
//
// Every authenticated request does:
//   1) SELECT from api_keys WHERE key_hash = $1
//   2) SELECT from profiles WHERE id = $1
// These rarely change (only on rotate / revoke / plan update), so a
// short-lived in-process cache eliminates ~99% of these round-trips
// for hot keys.
//
// WIRING (you must do this in apiAuth.server.ts):
//   import { authCache } from "./apiCache.server";
//
//   async function authenticate(request: Request): Promise<AuthedKey | null> {
//     const key = extractBearer(request);
//     if (!key || !key.startsWith("sk_")) return null;
//     const hash = createHash("sha256").update(key).digest("hex");
//
//     const cached = authCache.get(hash);
//     if (cached) return cached;
//
//     // ... existing two queries (or the new single-join query) ...
//     const result: AuthedKey = { ... };
//     authCache.set(hash, result);
//     return result;
//   }
//
// Invalidate on key revoke/rotate and on profile updates:
//   authCache.invalidateByHash(hash)            // when a specific key changes
//   authCache.invalidateByUser(user_id)         // when a user's plan changes
//   authCache.clear()                           // hard reset
//
// CAVEATS:
// - This is per-process. In a multi-instance deployment, each instance
//   has its own cache; stale reads can persist up to TTL_MS after a
//   revoke. For Cloudflare Workers / Lovable serverless, that's usually
//   acceptable for short TTLs. If not, replace with Redis-backed cache
//   (see rateLimiter.server.ts for the same pattern).

import type { AuthedKey } from "./apiAuth.server";

const TTL_MS = 60_000;          // 1 minute. Tradeoff: staleness vs. DB load.
const MAX_ENTRIES = 10_000;      // Cap memory. ~200 bytes/entry => ~2 MB max.

type Entry = {
  value: AuthedKey;
  expiresAt: number;
};

class LruCache {
  private map = new Map<string, Entry>();

  get(hash: string): AuthedKey | null {
    const entry = this.map.get(hash);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(hash);
      return null;
    }
    // LRU bump: re-insert to move to end of Map insertion order.
    this.map.delete(hash);
    this.map.set(hash, entry);
    return entry.value;
  }

  set(hash: string, value: AuthedKey): void {
    if (this.map.size >= MAX_ENTRIES) {
      // Evict oldest (first inserted).
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(hash, { value, expiresAt: Date.now() + TTL_MS });
  }

  invalidateByHash(hash: string): void {
    this.map.delete(hash);
  }

  invalidateByUser(userId: string): void {
    for (const [hash, entry] of this.map) {
      if (entry.value.user_id === userId) this.map.delete(hash);
    }
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

export const authCache = new LruCache();
