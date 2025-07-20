import { createClient } from '@/utils/supabase/server'
import { updateKautionAction, getSuggestedKautionAmount } from '../mieter-actions'

// Mock the supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Kaution Actions', () => {
  const mockFrom = jest.fn().mockReturnThis()
  const mockSelect = jest.fn().mockReturnThis()
  const mockEq = jest.fn().mockReturnThis()
  const mockSingle = jest.fn()
  const mockUpdate = jest.fn().mockReturnThis()

  const mockSupabase = {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    update: mockUpdate,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('updateKautionAction', () => {
    const formData = new FormData()
    formData.append('tenantId', 'tenant-1')
    formData.append('amount', '1500')
    formData.append('paymentDate', '2024-01-15')
    formData.append('status', 'Erhalten')

    it('should update kaution data successfully', async () => {
      // Mock successful response
      mockSingle.mockResolvedValueOnce({ data: { kaution: null }, error: null })
      mockUpdate.mockResolvedValueOnce({ error: null })

      const result = await updateKautionAction(formData)

      expect(result).toEqual({ success: true })
      expect(mockFrom).toHaveBeenCalledWith('Mieter')
      expect(mockUpdate).toHaveBeenCalledWith({
        kaution: expect.objectContaining({
          amount: 1500,
          paymentDate: '2024-01-15',
          status: 'Erhalten',
        })
      })
      expect(mockEq).toHaveBeenCalledWith('id', 'tenant-1')
    })

    it('should handle validation errors', async () => {
      const invalidFormData = new FormData()
      invalidFormData.append('tenantId', '')
      invalidFormData.append('amount', 'invalid')
      invalidFormData.append('status', 'InvalidStatus')

      const result = await updateKautionAction(invalidFormData)

      expect(result).toEqual({
        success: false,
        error: { message: 'Betrag muss eine positive Zahl sein' }
      })
    })

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValueOnce({ data: { kaution: null }, error: null })
      mockUpdate.mockResolvedValueOnce({ 
        error: { message: 'Database error' } 
      })

      const result = await updateKautionAction(formData)

      expect(result).toEqual({
        success: false,
        error: { message: 'Database error' }
      })
    })

    it('should preserve createdAt when updating existing kaution', async () => {
      const existingKaution = {
        amount: 1200,
        paymentDate: '2023-01-01',
        status: 'Ausstehend',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }

      mockSingle.mockResolvedValueOnce({ 
        data: { kaution: existingKaution }, 
        error: null 
      })
      mockUpdate.mockResolvedValueOnce({ error: null })

      await updateKautionAction(formData)

      expect(mockUpdate).toHaveBeenCalledWith({
        kaution: expect.objectContaining({
          amount: 1500,
          paymentDate: '2024-01-15',
          status: 'Erhalten',
          createdAt: existingKaution.createdAt,
        })
      })
    })

    it('should handle invalid payment date format', async () => {
      const invalidFormData = new FormData()
      invalidFormData.append('tenantId', 'tenant-1')
      invalidFormData.append('amount', '1500')
      invalidFormData.append('paymentDate', 'invalid-date')
      invalidFormData.append('status', 'Erhalten')

      const result = await updateKautionAction(invalidFormData)

      expect(result).toEqual({
        success: false,
        error: { message: 'Ungültiges Datum' }
      })
    })

    it('should handle missing status', async () => {
      const invalidFormData = new FormData()
      invalidFormData.append('tenantId', 'tenant-1')
      invalidFormData.append('amount', '1500')
      invalidFormData.append('paymentDate', '2024-01-15')
      // No status provided

      const result = await updateKautionAction(invalidFormData)

      expect(result).toEqual({
        success: false,
        error: { message: 'Ungültiger Status' }
      })
    })
  })

  describe('getSuggestedKautionAmount', () => {
    it('should return suggested amount based on rent', async () => {
      const tenantId = 'tenant-1'
      const rent = 500
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { 
            wohnung_id: 'wohnung-1',
            Wohnungen: [{ miete: rent }]
          },
          error: null
        })
      })

      const result = await getSuggestedKautionAmount(tenantId)

      expect(result).toEqual({
        success: true,
        suggestedAmount: rent * 3
      })
    })

    it('should handle missing rent data', async () => {
      const tenantId = 'tenant-1'
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { 
            wohnung_id: 'wohnung-1',
            Wohnungen: [{}] // No miete field
          },
          error: null
        })
      })

      const result = await getSuggestedKautionAmount(tenantId)

      expect(result).toEqual({
        success: true,
        suggestedAmount: undefined
      })
    })

    it('should handle missing apartment', async () => {
      const tenantId = 'tenant-1'
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { 
            wohnung_id: null, // No apartment
            Wohnungen: []
          },
          error: null
        })
      })

      const result = await getSuggestedKautionAmount(tenantId)

      expect(result).toEqual({
        success: true,
        suggestedAmount: undefined
      })
    })

    it('should handle database errors', async () => {
      const tenantId = 'tenant-1'
      const errorMessage = 'Database error'
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: errorMessage }
        })
      })

      const result = await getSuggestedKautionAmount(tenantId)

      expect(result).toEqual({
        success: false,
        error: { message: 'Fehler beim Laden der Mieterdaten' }
      })
    })
  })
})
