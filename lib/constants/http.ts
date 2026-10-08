/**
 * HTTP-related constants for consistent caching and security headers
 */

// Cache-control headers to prevent CDN caching of user-specific responses
// Private directive ensures shared caches (CDNs) don't store authenticated responses
// 'no-store' is the primary directive to ensure data is never written to disk/memory in any cache
export const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
};
