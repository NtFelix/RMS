import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Toaster } from '@/components/ui/toaster'

// Mock toast hook for tests
const mockToast = jest.fn()

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: jest.fn(),
    toasts: []
  })
}))

// Test wrapper that provides necessary context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, mockToast }