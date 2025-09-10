import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Test component that uses the template editor modal
const TestTemplateEditorComponent: React.FC = () => {
  const {
    isTemplateEditorModalOpen,
    templateEditorData,
    isTemplateEditorModalDirty,
    openTemplateEditorModal,
    closeTemplateEditorModal,
    setTemplateEditorModalDirty
  } = useModalStore()

  const handleOpenModal = () => {
    openTemplateEditorModal({
      isNewTemplate: true,
      initialCategory: 'Test Category',
      onSave: jest.fn(),
      onCancel: jest.fn()
    })
  }

  const handleSetDirty = () => {
    setTemplateEditorModalDirty(true)
  }

  const handleCloseModal = () => {
    closeTemplateEditorModal()
  }

  const handleForceCloseModal = () => {
    closeTemplateEditorModal({ force: true })
  }

  return (
    <div>
      <div data-testid="modal-open">{isTemplateEditorModalOpen ? 'open' : 'closed'}</div>
      <div data-testid="modal-dirty">{isTemplateEditorModalDirty ? 'dirty' : 'clean'}</div>
      <div data-testid="template-data">{templateEditorData ? JSON.stringify(templateEditorData) : 'no-data'}</div>
      <button onClick={handleOpenModal} data-testid="open-modal">Open Modal</button>
      <button onClick={handleSetDirty} data-testid="set-dirty">Set Dirty</button>
      <button onClick={handleCloseModal} data-testid="close-modal">Close Modal</button>
      <button onClick={handleForceCloseModal} data-testid="force-close-modal">Force Close Modal</button>
    </div>
  )
}

describe('useModalStore - Template Editor Modal Integration', () => {
  const mockOpenTemplateEditorModal = jest.fn()
  const mockCloseTemplateEditorModal = jest.fn()
  const mockSetTemplateEditorModalDirty = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseModalStore.mockReturnValue({
      isTemplateEditorModalOpen: false,
      templateEditorData: undefined,
      isTemplateEditorModalDirty: false,
      openTemplateEditorModal: mockOpenTemplateEditorModal,
      closeTemplateEditorModal: mockCloseTemplateEditorModal,
      setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
    } as any)
  })

  describe('Template Editor Modal State Management', () => {
    it('should initialize with closed state', () => {
      render(<TestTemplateEditorComponent />)
      
      expect(screen.getByTestId('modal-open')).toHaveTextContent('closed')
      expect(screen.getByTestId('modal-dirty')).toHaveTextContent('clean')
      expect(screen.getByTestId('template-data')).toHaveTextContent('no-data')
    })

    it('should call openTemplateEditorModal when open button is clicked', () => {
      render(<TestTemplateEditorComponent />)
      
      fireEvent.click(screen.getByTestId('open-modal'))
      
      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith({
        isNewTemplate: true,
        initialCategory: 'Test Category',
        onSave: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('should call setTemplateEditorModalDirty when set dirty button is clicked', () => {
      render(<TestTemplateEditorComponent />)
      
      fireEvent.click(screen.getByTestId('set-dirty'))
      
      expect(mockSetTemplateEditorModalDirty).toHaveBeenCalledWith(true)
    })

    it('should call closeTemplateEditorModal when close button is clicked', () => {
      render(<TestTemplateEditorComponent />)
      
      fireEvent.click(screen.getByTestId('close-modal'))
      
      expect(mockCloseTemplateEditorModal).toHaveBeenCalledWith()
    })

    it('should call closeTemplateEditorModal with force option when force close button is clicked', () => {
      render(<TestTemplateEditorComponent />)
      
      fireEvent.click(screen.getByTestId('force-close-modal'))
      
      expect(mockCloseTemplateEditorModal).toHaveBeenCalledWith({ force: true })
    })

    it('should display open state when modal is open', () => {
      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: undefined,
        isTemplateEditorModalDirty: false,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      render(<TestTemplateEditorComponent />)
      
      expect(screen.getByTestId('modal-open')).toHaveTextContent('open')
    })

    it('should display dirty state when modal is dirty', () => {
      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: false,
        templateEditorData: undefined,
        isTemplateEditorModalDirty: true,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      render(<TestTemplateEditorComponent />)
      
      expect(screen.getByTestId('modal-dirty')).toHaveTextContent('dirty')
    })
  })

  describe('Template Editor Data Handling', () => {
    it('should display template data when provided', () => {
      const mockTemplateData = {
        templateId: 'test-template-id',
        initialTitle: 'Test Template',
        initialContent: { type: 'doc', content: [] },
        initialCategory: 'Test Category',
        isNewTemplate: false,
        onSave: jest.fn(),
        onCancel: jest.fn()
      }

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: mockTemplateData,
        isTemplateEditorModalDirty: false,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      render(<TestTemplateEditorComponent />)
      
      const templateDataElement = screen.getByTestId('template-data')
      expect(templateDataElement).toHaveTextContent('test-template-id')
      expect(templateDataElement).toHaveTextContent('Test Template')
      expect(templateDataElement).toHaveTextContent('Test Category')
    })

    it('should handle minimal template data for new template', () => {
      const mockMinimalTemplateData = {
        isNewTemplate: true,
        onSave: jest.fn(),
        onCancel: jest.fn()
      }

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: mockMinimalTemplateData,
        isTemplateEditorModalDirty: false,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      render(<TestTemplateEditorComponent />)
      
      const templateDataElement = screen.getByTestId('template-data')
      expect(templateDataElement).toHaveTextContent('isNewTemplate')
      expect(templateDataElement).toHaveTextContent('true')
    })
  })

  describe('Modal State Integration', () => {
    it('should handle modal state changes correctly', () => {
      const { rerender } = render(<TestTemplateEditorComponent />)
      
      // Initially closed and clean
      expect(screen.getByTestId('modal-open')).toHaveTextContent('closed')
      expect(screen.getByTestId('modal-dirty')).toHaveTextContent('clean')

      // Update mock to simulate open and dirty state
      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test Category',
          onSave: jest.fn(),
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: true,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      rerender(<TestTemplateEditorComponent />)

      expect(screen.getByTestId('modal-open')).toHaveTextContent('open')
      expect(screen.getByTestId('modal-dirty')).toHaveTextContent('dirty')
    })

    it('should handle function calls without errors', () => {
      render(<TestTemplateEditorComponent />)
      
      // These should not throw errors
      expect(() => {
        fireEvent.click(screen.getByTestId('open-modal'))
        fireEvent.click(screen.getByTestId('set-dirty'))
        fireEvent.click(screen.getByTestId('close-modal'))
        fireEvent.click(screen.getByTestId('force-close-modal'))
      }).not.toThrow()

      // Verify all functions were called
      expect(mockOpenTemplateEditorModal).toHaveBeenCalled()
      expect(mockSetTemplateEditorModalDirty).toHaveBeenCalled()
      expect(mockCloseTemplateEditorModal).toHaveBeenCalledTimes(2) // Called twice
    })
  })

  describe('Template Editor Modal Interface Compliance', () => {
    it('should provide all required modal state properties', () => {
      render(<TestTemplateEditorComponent />)
      
      // Verify that the modal store provides all expected properties
      expect(mockUseModalStore).toHaveBeenCalled()
      
      const mockCall = mockUseModalStore.mock.results[0].value
      expect(mockCall).toHaveProperty('isTemplateEditorModalOpen')
      expect(mockCall).toHaveProperty('templateEditorData')
      expect(mockCall).toHaveProperty('isTemplateEditorModalDirty')
      expect(mockCall).toHaveProperty('openTemplateEditorModal')
      expect(mockCall).toHaveProperty('closeTemplateEditorModal')
      expect(mockCall).toHaveProperty('setTemplateEditorModalDirty')
    })

    it('should handle template editor data structure correctly', () => {
      const complexTemplateData = {
        templateId: 'complex-template-123',
        initialTitle: 'Complex Template Title',
        initialContent: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'This is a complex template with ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Tenant Name' }
                },
                { type: 'text', text: ' and other content.' }
              ]
            }
          ]
        },
        initialCategory: 'Legal Documents',
        isNewTemplate: false,
        onSave: jest.fn(),
        onCancel: jest.fn()
      }

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: complexTemplateData,
        isTemplateEditorModalDirty: false,
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: mockCloseTemplateEditorModal,
        setTemplateEditorModalDirty: mockSetTemplateEditorModalDirty,
      } as any)

      render(<TestTemplateEditorComponent />)
      
      const templateDataElement = screen.getByTestId('template-data')
      expect(templateDataElement).toHaveTextContent('complex-template-123')
      expect(templateDataElement).toHaveTextContent('Complex Template Title')
      expect(templateDataElement).toHaveTextContent('Legal Documents')
      expect(templateDataElement).toHaveTextContent('false') // isNewTemplate
    })
  })
})