/**
 * HTTP-related constants for consistent caching and security headers
 */

// Cache-control headers to prevent CDN caching of user-specific responses
// Private directive ensures shared caches (CDNs) don't store authenticated responses
export const NO_CACHE_HEADERS = {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
};
