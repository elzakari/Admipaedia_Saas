/**
 * cacheService.ts
 * A centralized service for managing persistent application state.
 * Supports TTL (Time To Live), namespacing, and error handling.
 */

export interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    namespace?: string;
}

const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_PREFIX = 'admi_cache_';

export const cacheService = {
    /**
     * Set a value in the cache
     */
    set: <T>(key: string, data: T, options: CacheOptions = {}): void => {
        try {
            const { ttl = DEFAULT_TTL, namespace = '' } = options;
            const cacheKey = `${CACHE_PREFIX}${namespace}${key}`;
            const entry = {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + ttl,
            };
            localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (error) {
            console.error(`Error setting cache for key: ${key}`, error);
        }
    },

    /**
     * Get a value from the cache
     */
    get: <T>(key: string, namespace: string = ''): T | null => {
        try {
            const cacheKey = `${CACHE_PREFIX}${namespace}${key}`;
            const rawEntry = localStorage.getItem(cacheKey);

            if (!rawEntry) return null;

            const entry = JSON.parse(rawEntry);

            // Check for expiration
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            return entry.data as T;
        } catch (error) {
            console.error(`Error getting cache for key: ${key}`, error);
            return null;
        }
    },

    /**
     * Remove a specific key from the cache
     */
    remove: (key: string, namespace: string = ''): void => {
        const cacheKey = `${CACHE_PREFIX}${namespace}${key}`;
        localStorage.removeItem(cacheKey);
    },

    /**
     * Clear all items with the cache prefix
     */
    clear: (namespace?: string): void => {
        const searchPrefix = namespace ? `${CACHE_PREFIX}${namespace}` : CACHE_PREFIX;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(searchPrefix)) {
                localStorage.removeItem(key);
            }
        });
    },

    /**
     * Get all keys in a namespace
     */
    getKeys: (namespace: string = ''): string[] => {
        const searchPrefix = `${CACHE_PREFIX}${namespace}`;
        return Object.keys(localStorage)
            .filter(key => key.startsWith(searchPrefix))
            .map(key => key.replace(searchPrefix, ''));
    }
};

export default cacheService;
