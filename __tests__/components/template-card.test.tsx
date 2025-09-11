import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCard } from '@/components/template-card'
import type { Template } from '@/types/template'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock confirm dialog
const mockConfirm = jest.fn()
global.confirm = mockConfirm

describe('TemplateCard', () => {
  const mockTemplate: Template = {
    id: 'test-template-1',
    titel: 'Test Template',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a test template content with some sample text.',
            },
          ],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Test Category',
    kontext_anforderungen: ['variable1', 'variable2'],
    aktualisiert_am: '2024-01-20T15:30:00Z',
  }

  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  it('should render template information correctly', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    // Check title
    expect(screen.getByText('Test Template')).toBeInTheDocument()

    // Check category badge
    expect(screen.getByText('Test Category')).toBeInTheDocument()

    // Check variables badge
    expect(screen.getByText('2 Variablen')).toBeInTheDocument()

    // Check content preview
    expect(screen.getByText(/This is a test template content/)).toBeInTheDocument()

    // Check dates
    expect(screen.getByText(/Erstellt: 15\.01\.2024/)).toBeInTheDocument()
    expect(screen.getByText(/Geändert: 20\.01\.2024/)).toBeInTheDocument()
  })

  it('should handle template without category', () => {
    const templateWithoutCategory = {
      ...mockTemplate,
      kategorie: null,
    }

    render(
      <TemplateCard
        template={templateWithoutCategory}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument()
  })

  it('should handle template without variables', () => {
    const templateWithoutVariables = {
      ...mockTemplate,
      kontext_anforderungen: [],
    }

    render(
      <TemplateCard
        template={templateWithoutVariables}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.queryByText(/Variablen/)).not.toBeInTheDocument()
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const editButton = screen.getByRole('button', { name: /bearbeiten/i })
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('should show dropdown menu on more actions button click', async () => {
    const user = userEvent.setup()
    
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const moreButton = screen.getByRole('button', { name: /aktionen.*vorlage/i })
    await user.click(moreButton)

    expect(screen.getByRole('menuitem', { name: /bearbeiten/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /löschen/i })).toBeInTheDocument()
  })

  it('should call onEdit when edit menu item is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const moreButton = screen.getByRole('button', { name: /aktionen.*vorlage/i })
    await user.click(moreButton)

    const editMenuItem = screen.getByRole('menuitem', { name: /bearbeiten/i })
    await user.click(editMenuItem)

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('should call onDelete when delete menu item is clicked', async () => {
    const user = userEvent.setup()
    mockOnDelete.mockResolvedValue(undefined)
    
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const moreButton = screen.getByRole('button', { name: /aktionen.*vorlage/i })
    await user.click(moreButton)

    const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
    await user.click(deleteMenuItem)
    
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('test-template-1')
    })
  })

  it('should handle delete errors gracefully', async () => {
    const user = userEvent.setup()
    const deleteError = new Error('Delete failed')
    mockOnDelete.mockRejectedValue(deleteError)
    
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const moreButton = screen.getByRole('button', { name: /aktionen.*vorlage/i })
    await user.click(moreButton)

    const deleteMenuItem = screen.getByRole('menuitem', { name: /löschen/i })
    await user.click(deleteMenuItem)

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('test-template-1')
    })
    
    // Should not crash the component
    expect(screen.getByText('Test Template')).toBeInTheDocument()
  })



  it('should generate proper content preview from Tiptap JSON', () => {
    const complexTemplate = {
      ...mockTemplate,
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'First paragraph with ' },
              { type: 'text', text: 'bold text', marks: [{ type: 'bold' }] },
              { type: 'text', text: '.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Second paragraph with more content.' },
            ],
          },
        ],
      },
    }

    render(
      <TemplateCard
        template={complexTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText(/First paragraph with bold text\. Second paragraph/)).toBeInTheDocument()
  })

  it('should handle single variable correctly', () => {
    const singleVariableTemplate = {
      ...mockTemplate,
      kontext_anforderungen: ['variable1'],
    }

    render(
      <TemplateCard
        template={singleVariableTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('1 Variable')).toBeInTheDocument()
  })
})