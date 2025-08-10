import { renderHook, act } from '@testing-library/react'
import { useSearchModalIntegration } from '@/hooks/use-search-modal-integration'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')

const mockModalStore = {
  isTenantModalOpen: false,
  isHouseModalOpen: false,
  isWohnungModalOpen: false,
  isFinanceModalOpen: false,
  isAufgabeModalOpen: false,
  isTenantModalDirty: false,
  isHouseModalDirty: false,
  isWohnungModalDirty: false,
  isFinanceModalDirty: false,
  isAufgabeModalDirty: false,
}

describe('useSearchModalIntegration', () => {
  beforeEach(() => {
    ;(useModalStore as jest.Mock).mockReturnValue(mockModalStore)
  })

  it('should call onEntityUpdated when modal is closed after successful operation', () => {
    const onEntityUpdated = jest.fn()
    const onCacheInvalidate = jest.fn()

    const { rerender } = renderHook(() =>
      useSearchModalIntegration({
        onEntityUpdated,
        onCacheInvalidate,
      })
    )

    // Simulate modal opening
    ;(useModalStore as jest.Mock).mockReturnValue({
      ...mockModalStore,
      isTenantModalOpen: true,
      isTenantModalDirty: true,
    })

    rerender()

    // Simulate modal closing after successful operation (not dirty)
    ;(useModalStore as jest.Mock).mockReturnValue({
      ...mockModalStore,
      isTenantModalOpen: false,
      isTenantModalDirty: false,
    })

    rerender()

    expect(onEntityUpdated).toHaveBeenCalledWith('mieter', 'Mieter')
    expect(onCacheInvalidate).toHaveBeenCalledWith('mieter')
  })

  it('should not call callbacks when modal is closed while dirty', () => {
    const onEntityUpdated = jest.fn()
    const onCacheInvalidate = jest.fn()

    const { rerender } = renderHook(() =>
      useSearchModalIntegration({
        onEntityUpdated,
        onCacheInvalidate,
      })
    )

    // Simulate modal opening
    ;(useModalStore as jest.Mock).mockReturnValue({
      ...mockModalStore,
      isTenantModalOpen: true,
      isTenantModalDirty: true,
    })

    rerender()

    // Simulate modal closing while still dirty (cancelled)
    ;(useModalStore as jest.Mock).mockReturnValue({
      ...mockModalStore,
      isTenantModalOpen: false,
      isTenantModalDirty: true,
    })

    rerender()

    expect(onEntityUpdated).not.toHaveBeenCalled()
    expect(onCacheInvalidate).not.toHaveBeenCalled()
  })

  it('should provide triggerEntityUpdate function', () => {
    const onEntityUpdated = jest.fn()
    const onCacheInvalidate = jest.fn()

    const { result } = renderHook(() =>
      useSearchModalIntegration({
        onEntityUpdated,
        onCacheInvalidate,
      })
    )

    act(() => {
      result.current.triggerEntityUpdate('mieter', 'Mieter')
    })

    expect(onEntityUpdated).toHaveBeenCalledWith('mieter', 'Mieter')
    expect(onCacheInvalidate).toHaveBeenCalledWith('mieter')
  })
})