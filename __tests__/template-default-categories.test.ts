/**
 * Test for default categories functionality
 * Verifies that users always have categories available for template creation
 */

import { templateService } from '@/lib/template-service'

// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            // Mock empty result - no existing templates
            data: [],
            error: null
          })
        })
      })
    })
  })
}))

describe('Template Default Categories', () => {
  it('should return default categories when user has no existing templates', async () => {
    const userId = 'test-user-123'
    
    const categories = await templateService.getUserCategories(userId)
    
    // Should return default categories
    expect(categories).toContain('Mietverträge')
    expect(categories).toContain('Kündigungen')
    expect(categories).toContain('Nebenkostenabrechnungen')
    expect(categories).toContain('Mängelanzeigen')
    expect(categories).toContain('Schriftverkehr')
    expect(categories).toContain('Sonstiges')
    
    // Should have at least 6 default categories
    expect(categories.length).toBeGreaterThanOrEqual(6)
  })

  it('should combine existing and default categories without duplicates', async () => {
    // Mock existing categories that include some defaults
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              data: [
                { kategorie: 'Mietverträge' }, // Duplicate with default
                { kategorie: 'Custom Category' }, // User-created category
                { kategorie: 'Kündigungen' } // Another duplicate with default
              ],
              error: null
            })
          })
        })
      })
    }

    // Temporarily replace the supabase client
    const originalSupabase = (templateService as any).supabase
    ;(templateService as any).supabase = mockSupabase

    try {
      const userId = 'test-user-456'
      const categories = await templateService.getUserCategories(userId)
      
      // Should contain all defaults
      expect(categories).toContain('Mietverträge')
      expect(categories).toContain('Kündigungen')
      expect(categories).toContain('Nebenkostenabrechnungen')
      expect(categories).toContain('Sonstiges')
      
      // Should contain user's custom category
      expect(categories).toContain('Custom Category')
      
      // Should not have duplicates
      const uniqueCategories = [...new Set(categories)]
      expect(categories.length).toBe(uniqueCategories.length)
      
      // Should have at least 7 categories (6 defaults + 1 custom)
      expect(categories.length).toBeGreaterThanOrEqual(7)
    } finally {
      // Restore original supabase client
      ;(templateService as any).supabase = originalSupabase
    }
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      })
    }

    const originalSupabase = (templateService as any).supabase
    ;(templateService as any).supabase = mockSupabase

    try {
      const userId = 'test-user-789'
      
      await expect(templateService.getUserCategories(userId)).rejects.toThrow(
        'Failed to get user categories: Database connection failed'
      )
    } finally {
      ;(templateService as any).supabase = originalSupabase
    }
  })
})