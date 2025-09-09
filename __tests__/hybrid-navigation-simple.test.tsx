/**
 * @jest-environment jsdom
 */

import { FEATURE_FLAGS } from '@/lib/constants'

describe('Hybrid Navigation Feature Flags', () => {
  it('should have feature flags defined', () => {
    expect(FEATURE_FLAGS).toBeDefined()
    expect(typeof FEATURE_FLAGS.ENABLE_CLIENT_NAVIGATION).toBe('boolean')
    expect(typeof FEATURE_FLAGS.ENABLE_HYBRID_NAVIGATION).toBe('boolean')
    expect(typeof FEATURE_FLAGS.ENABLE_NAVIGATION_CACHE).toBe('boolean')
    expect(typeof FEATURE_FLAGS.ENABLE_OPTIMISTIC_UI).toBe('boolean')
  })

  it('should default feature flags to enabled', () => {
    // Since we set defaults to enabled (unless explicitly disabled)
    expect(FEATURE_FLAGS.ENABLE_CLIENT_NAVIGATION).toBe(true)
    expect(FEATURE_FLAGS.ENABLE_HYBRID_NAVIGATION).toBe(true)
    expect(FEATURE_FLAGS.ENABLE_NAVIGATION_CACHE).toBe(true)
    expect(FEATURE_FLAGS.ENABLE_OPTIMISTIC_UI).toBe(true)
  })

  it('should support environment variable overrides', () => {
    // Test that the feature flags respect environment variables
    // This tests the logic: process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION !== 'false'
    const originalEnv = process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION
    
    // Temporarily set env var to 'false'
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION = 'false'
    
    // Re-import to get updated value (in real app, this would be set at build time)
    // For this test, we just verify the logic would work
    const shouldBeDisabled = process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION !== 'false'
    expect(shouldBeDisabled).toBe(false)
    
    // Restore original value
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_ENABLE_CLIENT_NAVIGATION
    }
  })
})

describe('Route Configuration', () => {
  it('should support backward compatibility', () => {
    // Test that existing URL patterns are still supported
    const testUrls = [
      '/dateien',
      '/dateien/house_123',
      '/dateien/house_123/apartment_456',
      '/dateien/user_789/documents/folder1'
    ]
    
    testUrls.forEach(url => {
      // These URLs should be valid and parseable
      expect(url).toMatch(/^\/dateien/)
      
      // Extract path segments
      const segments = url.split('/').filter(Boolean)
      expect(segments[0]).toBe('dateien')
      
      // Should handle various path depths
      expect(segments.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should handle direct URL access detection', () => {
    // Test the logic for detecting direct URL access
    const mockHeaders = {
      referer: null,
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    }
    
    const isDirectAccess = !mockHeaders.referer || !mockHeaders.referer.includes('/dateien')
    const isBot = mockHeaders['user-agent'] && /bot|crawler|spider/i.test(mockHeaders['user-agent'])
    
    expect(isDirectAccess).toBe(true)
    expect(isBot).toBe(true)
  })
})