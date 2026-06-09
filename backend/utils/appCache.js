/**
 * Optional Redis cache with in-memory fallback.
 * Set REDIS_URL to share cache across multiple Node processes.
 * If Redis is unreachable, falls back to in-memory (no reconnect spam).
 */

import { createClient } from 'redis';

const memoryCache = new Map();
const MEMORY_MAX_ENTRIES = Number(process.env.APP_CACHE_MEMORY_MAX_ENTRIES || 500);

let redisClient = null;
let redisReady = false;
let redisInitAttempted = false;
let redisDisabled = false;

function pruneMemoryCache(now = Date.now()) {
    for (const [key, entry] of memoryCache.entries()) {
        if (!entry?.at || now - entry.at >= entry.ttlMs) {
            memoryCache.delete(key);
        }
    }
    if (memoryCache.size <= MEMORY_MAX_ENTRIES) return;
    const entries = [...memoryCache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
    const overflow = memoryCache.size - MEMORY_MAX_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
        memoryCache.delete(entries[i][0]);
    }
}

function disableRedis(reason) {
    if (redisDisabled) return;
    redisDisabled = true;
    redisReady = false;
    console.warn(
        `[cache] Redis unavailable (${reason}) — using in-memory cache. `
        + 'Unset REDIS_URL in .env for local dev, or start Redis.',
    );
    if (redisClient) {
        redisClient.removeAllListeners();
        redisClient.disconnect().catch(() => {});
        redisClient = null;
    }
}

export function isRedisCacheEnabled() {
    return redisReady;
}

export async function initAppCache() {
    if (redisInitAttempted) return redisReady;
    redisInitAttempted = true;

    const url = (process.env.REDIS_URL || '').trim();
    if (!url) {
        console.log('[cache] REDIS_URL not set — using in-memory cache');
        return false;
    }

    try {
        redisClient = createClient({
            url,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: () => false,
            },
        });

        redisClient.on('error', (err) => {
            disableRedis(err?.message || 'connection error');
        });

        await redisClient.connect();
        redisReady = true;
        console.log('[cache] Redis connected');
        return true;
    } catch (err) {
        disableRedis(err?.message || err);
        return false;
    }
}

export async function appCacheGet(key) {
    if (redisReady && redisClient) {
        try {
            const raw = await redisClient.get(key);
            if (raw == null) return null;
            return JSON.parse(raw);
        } catch (err) {
            disableRedis(err?.message || 'get failed');
        }
    }

    pruneMemoryCache();
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at >= entry.ttlMs) {
        memoryCache.delete(key);
        return null;
    }
    return entry.data;
}

export async function appCacheSet(key, data, ttlMs) {
    if (redisReady && redisClient) {
        try {
            const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
            await redisClient.setEx(key, ttlSec, JSON.stringify(data));
            return;
        } catch (err) {
            disableRedis(err?.message || 'set failed');
        }
    }

    pruneMemoryCache();
    memoryCache.set(key, { data, at: Date.now(), ttlMs });
}

export async function appCacheDel(key) {
    if (redisReady && redisClient) {
        try {
            await redisClient.del(key);
        } catch (err) {
            disableRedis(err?.message || 'del failed');
        }
    }
    memoryCache.delete(key);
}

export async function appCacheDelByPrefix(prefix) {
    if (redisReady && redisClient) {
        try {
            const keys = [];
            for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
                keys.push(key);
            }
            if (keys.length > 0) await redisClient.del(keys);
        } catch (err) {
            disableRedis(err?.message || 'prefix del failed');
        }
    }
    for (const key of [...memoryCache.keys()]) {
        if (key.startsWith(prefix)) memoryCache.delete(key);
    }
}

export async function closeAppCache() {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            // ignore
        }
    }
    redisClient = null;
    redisReady = false;
}
