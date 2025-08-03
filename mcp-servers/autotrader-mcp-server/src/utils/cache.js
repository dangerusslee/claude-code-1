/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  constructor(defaultTTL = 30 * 60 * 1000) { // 30 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    // Clean expired entries
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }

  generateKey(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
}

export const cache = new Cache();