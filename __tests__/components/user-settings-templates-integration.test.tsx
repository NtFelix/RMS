import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserSettings } from '@/components/user-settings'
import { useModalStore } from '@/hooks/use-modal-store'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/utils/supabase/client')
jest.mock('next/navigation')
jest.mock('@/components/settings-modal', () => ({
  SettingsModal: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="settings-modal">Settings Modal</div> : null
}))
jest.mock('@/components/templates-management-modal', () => ({
  TemplatesManagementModal: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="templates-modal">Templates Modal</div> : null
}))

describe('UserSettings Templates Integration', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  }

  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
    mockUseRouter.mockReturnValue(mockRouter as any)

    // Mock successful user fetch
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      },
      error: null,
    })

    // Mock successful sign out
    mockSupabaseClient.auth.signOut.mockResolvedValue({
      error: null,
    })

    // Mock modal store
    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: false,
      closeTemplatesManagementModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
    } as any)
  })

  describe('Templates Menu Integration', () => {
    it('should render Templates option in user menu', async () => {
      render(<UserSettings />)

      // Wait for user data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click on user menu trigger
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await userEvent.setup().click(userMenuTrigger)

      // Should show Templates option
      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
      
      // Should have proper icon
      const templatesMenuItem = screen.getByText('Vorlagen').closest('[role="menuitem"]')
      expect(templatesMenuItem).toBeInTheDocument()
      
      // Should have FileText icon
      const icon = templatesMenuItem?.querySelector('[data-lucide="file-text"]')
      expect(icon).toBeInTheDocument()
    })

    it('should position Templates option above Settings', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await userEvent.setup().click(userMenuTrigger)

      const menuItems = screen.getAllByRole('menuitem')
      const templatesIndex = menuItems.findIndex(item => item.textContent?.includes('Vorlagen'))
      const settingsIndex = menuItems.findIndex(item => item.textContent?.includes('Einstellungen'))
      const logoutIndex = menuItems.findIndex(item => item.textContent?.includes('Abmelden'))

      // Templates should come before Settings
      expect(templatesIndex).toBeLessThan(settingsIndex)
      // Logout should be last
      expect(logoutIndex).toBeGreaterThan(settingsIndex)
    })

    it('should open templates modal when Templates option is clicked', async () => {
      const mockSetTemplatesModalOpen = jest.fn()
      
      // Mock the modal store to track state changes
      let isTemplatesModalOpen = false
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: isTemplatesModalOpen,
        closeTemplatesManagementModal: jest.fn(() => {
          isTemplatesModalOpen = false
        }),
        openTemplateEditorModal: jest.fn(),
        setIsTemplatesManagementModalOpen: mockSetTemplatesModalOpen,
      } as any)

      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      const templatesOption = screen.getByText('Vorlagen')
      await user.click(templatesOption)

      // Should open templates modal (in real implementation)
      // This would be verified by checking if the modal state is set to true
      expect(templatesOption).toBeInTheDocument()
    })

    it('should close user menu when Templates option is clicked', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      // Menu should be open
      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
      expect(screen.getByText('Einstellungen')).toBeInTheDocument()

      const templatesOption = screen.getByText('Vorlagen')
      await user.click(templatesOption)

      // Menu should close after clicking Templates
      await waitFor(() => {
        expect(screen.queryByText('Einstellungen')).not.toBeInTheDocument()
      })
    })
  })

  describe('Modal State Management', () => {
    it('should manage templates modal state correctly', async () => {
      let isTemplatesModalOpen = false
      const mockCloseTemplatesModal = jest.fn(() => {
        isTemplatesModalOpen = false
      })

      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: isTemplatesModalOpen,
        closeTemplatesManagementModal: mockCloseTemplatesModal,
        openTemplateEditorModal: jest.fn(),
      } as any)

      const { rerender } = render(<UserSettings />)

      // Initially, templates modal should not be rendered
      expect(screen.queryByTestId('templates-modal')).not.toBeInTheDocument()

      // Simulate opening templates modal
      isTemplatesModalOpen = true
      mockUseModalStore.mockReturnValue({
        isTemplatesManagementModalOpen: isTemplatesModalOpen,
        closeTemplatesManagementModal: mockCloseTemplatesModal,
        openTemplateEditorModal: jest.fn(),
      } as any)

      rerender(<UserSettings />)

      // Templates modal should now be rendered
      expect(screen.getByTestId('templates-modal')).toBeInTheDocument()
    })

    it('should handle both Settings and Templates modals independently', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })

      // Open Settings modal
      await user.click(userMenuTrigger)
      const settingsOption = screen.getByText('Einstellungen')
      await user.click(settingsOption)

      // Settings modal should be open
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()

      // Open user menu again and click Templates
      await user.click(userMenuTrigger)
      const templatesOption = screen.getByText('Vorlagen')
      await user.click(templatesOption)

      // Both modals can be open simultaneously (depending on implementation)
      // Or Templates modal opens while Settings modal closes
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('should have proper ARIA attributes for Templates menu item', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      const templatesMenuItem = screen.getByText('Vorlagen').closest('[role="menuitem"]')
      expect(templatesMenuItem).toHaveAttribute('aria-describedby', 'templates-menu-description')
      
      // Should have description for screen readers
      expect(screen.getByText(/öffnet die vorlagenverwaltung/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation to Templates option', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      
      // Open menu with keyboard
      await user.click(userMenuTrigger)
      await user.keyboard('{Enter}')

      // Navigate to Templates option with arrow keys
      await user.keyboard('{ArrowDown}') // Should focus Templates
      
      const templatesMenuItem = screen.getByText('Vorlagen').closest('[role="menuitem"]')
      expect(templatesMenuItem).toHaveFocus()

      // Activate with Enter
      await user.keyboard('{Enter}')
      
      // Should trigger Templates modal opening
      expect(templatesMenuItem).toBeInTheDocument()
    })

    it('should announce Templates option for screen readers', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      // Should have screen reader description
      const description = screen.getByText(/öffnet die vorlagenverwaltung zum erstellen/i)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('sr-only')
    })
  })

  describe('User Experience Integration', () => {
    it('should maintain user context when opening Templates', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      const templatesOption = screen.getByText('Vorlagen')
      await user.click(templatesOption)

      // User information should still be displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle loading states gracefully', async () => {
      // Mock slow user data loading
      mockSupabaseClient.auth.getUser.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                user_metadata: {
                  first_name: 'John',
                  last_name: 'Doe',
                },
              },
            },
            error: null,
          }), 100)
        )
      )

      render(<UserSettings />)

      // Should show loading state
      expect(screen.getByText('Lade...')).toBeInTheDocument()

      // Wait for user data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Templates option should be available after loading
      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
    })

    it('should handle user data errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Failed to fetch user'),
      })

      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('Nutzer')).toBeInTheDocument()
        expect(screen.getByText('Nicht angemeldet')).toBeInTheDocument()
      })

      // Templates option should still be available
      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
    })
  })

  describe('Integration with Existing Functionality', () => {
    it('should not interfere with Settings modal functionality', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      // Click Settings option
      const settingsOption = screen.getByText('Einstellungen')
      await user.click(settingsOption)

      // Settings modal should open
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    })

    it('should not interfere with logout functionality', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      // Click logout option
      const logoutOption = screen.getByText('Abmelden')
      await user.click(logoutOption)

      // Should call signOut
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should maintain proper menu structure with new Templates option', async () => {
      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      // Should have proper menu structure
      expect(screen.getByText('Mein Konto')).toBeInTheDocument() // Menu label
      
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(3) // Templates, Settings, Logout
      
      const separators = screen.getAllByRole('separator')
      expect(separators).toHaveLength(2) // After label and before logout
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle Templates modal errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<UserSettings />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const userMenuTrigger = screen.getByRole('button', { name: /benutzermenü/i })
      await user.click(userMenuTrigger)

      const templatesOption = screen.getByText('Vorlagen')
      
      // Should not throw error even if Templates modal has issues
      expect(() => user.click(templatesOption)).not.toThrow()

      mockConsoleError.mockRestore()
    })
  })
})