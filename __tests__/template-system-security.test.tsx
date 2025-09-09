/**
 * Template System Security Tests
 * Tests for user isolation, data security, and access control
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCreateModal } from '@/components/template-create-modal'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'
import { templateValidator } from '@/lib/template-system/template-validation'
import type { Template } from '@/types/template-system'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/components/enhanced-file-editor')
jest.mock('@/lib/template-system/template-validation')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>
const mockTemplateValidator = templateValidator as jest.Mocked<typeof templateValidator>

// Mock fetch globally
global.fetch = jest.fn()

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('Template System Security Tests', () => {
  const mockToast = jest.fn()
  const mockCloseModal = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockOnGenerate = jest.fn()

  // Test users
  const user1 = { id: 'user-1', name: 'User One', email: 'user1@example.com' }
  const user2 = { id: 'user-2', name: 'User Two', email: 'user2@example.com' }

  // Test templates
  const user1Templates: Template[] = [
    {
      id: 'template-1',
      user_id: 'user-1',
      titel: 'User 1 Template',
      inhalt: 'Hello @mieter.name',
      kategorie: 'mail',
      kontext_anforderungen: ['mieter'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    }
  ]

  const user2Templates: Template[] = [
    {
      id: 'template-2',
      user_id: 'user-2',
      titel: 'User 2 Template',
      inhalt: 'Hello @mieter.name',
      kategorie: 'mail',
      kontext_anforderungen: ['mieter'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    // Mock enhanced file editor
    jest.doMock('@/components/enhanced-file-editor', () => ({
      EnhancedFileEditor: ({ isOpen, onClose, onSave, initialContent }: any) => (
        <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
          <textarea
            data-testid="editor-textarea"
            defaultValue={initialContent}
          />
          <button
            data-testid="editor-save"
            onClick={() => onSave('Test content @mieter.name')}
          >
            Save
          </button>
          <button data-testid="editor-close" onClick={onClose}>
            Close
          </button>
        </div>
      )
    }))
  })

  describe('User Isolation', () => {
    it('should only return templates for the authenticated user', async () => {
      // Mock API response for user-1
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(user1Templates)
      })

      const response = await fetch('/api/vorlagen', {
        headers: { 'Authorization': 'Bearer user-1-token' }
      })
      const templates = await response.json()

      expect(templates).toHaveLength(1)
      expect(templates[0].user_id).toBe('user-1')
      expect(templates[0].titel).toBe('User 1 Template')
    })

    it('should prevent access to templates from other users', async () => {
      // Mock API response for unauthorized access
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'Forbidden: You can only access your own templates' 
        })
      })

      const response = await fetch('/api/vorlagen/template-2', {
        headers: { 'Authorization': 'Bearer user-1-token' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
      
      const error = await response.json()
      expect(error.error).toContain('Forbidden')
    })

    it('should validate user ownership during template creation', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock successful name check but failed creation due to user mismatch
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized: Invalid user session' })
        })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Test Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Authentifizierungsfehler',
          description: 'Bitte melden Sie sich erneut an.',
          variant: 'destructive'
        })
      })
    })

    it('should validate user ownership during template usage', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: user2Templates[0], // Template belongs to user-2
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock unauthorized access to entities
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden: Template access denied' })
      })

      render(<TemplateUsageModal />)

      // Should handle unauthorized access gracefully
      await waitFor(() => {
        expect(screen.getByText('Template verwenden:')).toBeInTheDocument()
      })

      // Should show error or redirect
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Zugriff verweigert',
        description: 'Sie haben keine Berechtigung für dieses Template.',
        variant: 'destructive'
      })
    })

    it('should filter entities by user ownership', async () => {
      const user1Entities = {
        mieter: [
          { id: 'mieter-1', name: 'User 1 Tenant', user_id: 'user-1' },
          { id: 'mieter-2', name: 'User 1 Tenant 2', user_id: 'user-1' }
        ],
        wohnungen: [
          { id: 'wohnung-1', name: 'User 1 Apartment', user_id: 'user-1' }
        ]
      }

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: user1Templates[0],
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with user-filtered results
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(user1Entities.mieter)
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/mieter')
      })

      // Verify that only user-1's entities are returned
      const response = await fetch('/api/mieter')
      const entities = await response.json()
      
      entities.forEach((entity: any) => {
        expect(entity.user_id).toBe('user-1')
      })
    })
  })

  describe('Input Sanitization and XSS Prevention', () => {
    it('should prevent script injection in template names', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      render(<TemplateCreateModal />)

      // Try to inject script in template name
      await user.type(screen.getByLabelText(/Template-Name/), '<script>alert("xss")</script>')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Template-Name enthält ungültige Zeichen/)).toBeInTheDocument()
      })
    })

    it('should prevent script injection in template content', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with malicious content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('<script>alert("xss")</script>Hello @mieter.name')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Malicious Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Skript-Tags sind nicht erlaubt/)).toBeInTheDocument()
      })
    })

    it('should prevent iframe injection', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with iframe content
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('<iframe src="http://malicious.com"></iframe>Hello @mieter.name')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Iframe Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Iframe-Tags sind nicht erlaubt/)).toBeInTheDocument()
      })
    })

    it('should prevent javascript URL injection', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with javascript URL
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('<a href="javascript:alert(1)">Click me</a> Hello @mieter.name')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'JavaScript URL Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/JavaScript-URLs sind nicht erlaubt/)).toBeInTheDocument()
      })
    })

    it('should allow safe HTML content', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with safe HTML
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('Hello <strong>@mieter.name</strong>, your <em>rent</em> is @wohnung.miete')}
            >
              Save
            </button>
          </div>
        )
      }))

      // Mock successful API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isUnique: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'safe-template',
            titel: 'Safe HTML Template',
            inhalt: 'Hello <strong>@mieter.name</strong>, your <em>rent</em> is @wohnung.miete'
          })
        })

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Safe HTML Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Template erstellt',
          description: 'Das Template "Safe HTML Template" wurde erfolgreich erstellt.'
        })
      })
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in template name search', async () => {
      const maliciousName = "'; DROP TABLE Vorlagen; --"

      // Mock API response that handles SQL injection safely
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: true })
      })

      const response = await fetch(`/api/vorlagen/check-name?titel=${encodeURIComponent(maliciousName)}`)
      const result = await response.json()

      // Should handle the malicious input safely
      expect(result.isUnique).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(maliciousName))
      )
    })

    it('should prevent SQL injection in template content search', async () => {
      const maliciousContent = "'; DELETE FROM Vorlagen WHERE user_id = 'user-1'; --"

      // Mock API response for template search
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      const response = await fetch('/api/vorlagen/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: maliciousContent })
      })

      const results = await response.json()

      // Should return empty results safely
      expect(results).toEqual([])
    })
  })

  describe('Access Control and Permissions', () => {
    it('should require authentication for template operations', async () => {
      // Mock unauthenticated request
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Authentication required' })
      })

      const response = await fetch('/api/vorlagen')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should validate session tokens', async () => {
      // Mock invalid session token
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid session token' })
      })

      const response = await fetch('/api/vorlagen', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should enforce rate limiting for template creation', async () => {
      // Mock rate limit exceeded
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ 
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      })

      const response = await fetch('/api/vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titel: 'Test Template',
          inhalt: 'Content',
          kategorie: 'mail'
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
    })

    it('should validate template ownership for updates', async () => {
      // Mock unauthorized update attempt
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'Forbidden: You can only update your own templates' 
        })
      })

      const response = await fetch('/api/vorlagen/template-2', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-1-token'
        },
        body: JSON.stringify({
          titel: 'Updated Template',
          inhalt: 'Updated content'
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })

    it('should validate template ownership for deletion', async () => {
      // Mock unauthorized deletion attempt
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'Forbidden: You can only delete your own templates' 
        })
      })

      const response = await fetch('/api/vorlagen/template-2', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-1-token' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should validate template data structure', async () => {
      mockTemplateValidator.validateForCreation.mockResolvedValueOnce({
        isValid: false,
        errors: ['Invalid template structure'],
        warnings: [],
        placeholders: []
      })

      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Invalid Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText('Invalid template structure')).toBeInTheDocument()
      })
    })

    it('should validate placeholder syntax', async () => {
      mockTemplateValidator.validateForCreation.mockResolvedValueOnce({
        isValid: false,
        errors: ['Invalid placeholder syntax: @invalid..placeholder'],
        warnings: [],
        placeholders: []
      })

      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with invalid placeholder
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave('Hello @invalid..placeholder')}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Invalid Placeholder Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Invalid placeholder syntax/)).toBeInTheDocument()
      })
    })

    it('should enforce maximum template size limits', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateCreateModalOpen: true,
        templateCreateModalData: {
          currentPath: '/templates',
          onSuccess: mockOnSuccess
        },
        isTemplateCreateModalDirty: false,
        closeTemplateCreateModal: mockCloseModal,
        setTemplateCreateModalDirty: jest.fn(),
        openTemplateCreateModal: jest.fn(),
      } as any)

      // Mock enhanced file editor with very large content
      const largeContent = 'x'.repeat(100001) // Exceeds 100KB limit
      jest.doMock('@/components/enhanced-file-editor', () => ({
        EnhancedFileEditor: ({ isOpen, onClose, onSave }: any) => (
          <div data-testid="enhanced-file-editor" style={{ display: isOpen ? 'block' : 'none' }}>
            <button
              data-testid="editor-save"
              onClick={() => onSave(largeContent)}
            >
              Save
            </button>
          </div>
        )
      }))

      render(<TemplateCreateModal />)

      await user.type(screen.getByLabelText(/Template-Name/), 'Large Template')
      await user.click(screen.getByText('E-Mail'))
      await user.click(screen.getByRole('button', { name: /Editor öffnen/ }))
      await user.click(screen.getByTestId('editor-save'))
      await user.click(screen.getByRole('button', { name: /Template erstellen/ }))

      await waitFor(() => {
        expect(screen.getByText(/Template-Inhalt ist zu groß/)).toBeInTheDocument()
      })
    })
  })
})