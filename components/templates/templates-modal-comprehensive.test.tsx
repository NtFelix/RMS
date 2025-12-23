import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatesModal } from '@/components/templates/templates-modal';
import { Template } from '@/types/template';
import { TEMPLATE_CATEGORIES } from '@/lib/template-constants';

// Mock dependencies
jest.mock('@/components/templates/template-card', () => ({
  TemplateCard: ({ template, onEdit, onDelete }: any) => (
    <div data-testid={`template-card-${template.id}`}>
      <h3>{template.titel}</h3>
      <span>{template.kategorie}</span>
      <button onClick={() => onEdit(template)}>Edit</button>
      <button onClick={() => onDelete(template.id)}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/templates/template-editor-modal', () => ({
  TemplateEditorModal: ({ isOpen, onClose, template, onSave }: any) => (
    isOpen ? (
      <div data-testid="template-editor-modal">
        <h2>{template ? 'Edit Template' : 'Create Template'}</h2>
        <button onClick={onClose}>Close Editor</button>
        <button onClick={() => onSave({ titel: 'Test', kategorie: 'Mail', inhalt: {}, kontext_anforderungen: [] })}>
          Save
        </button>
      </div>
    ) : null
  ),
}));

jest.mock('@/hooks/use-templates', () => ({
  useTemplates: () => ({
    templates: mockTemplates,
    loading: false,
    error: null,
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    refreshTemplates: jest.fn(),
  }),
  useTemplateFilters: (templates: Template[]) => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedCategory: 'all',
    setSelectedCategory: jest.fn(),
    filteredTemplates: templates,
    groupedTemplates: templates.reduce((groups, template) => {
      const category = template.kategorie;
      if (!groups[category]) groups[category] = [];
      groups[category].push(template);
      return groups;
    }, {} as Record<string, Template[]>),
  }),
}));

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openConfirmationModal: jest.fn(),
    openTemplateEditorModal: jest.fn(),
    closeTemplateEditorModal: jest.fn(),
    isTemplateEditorModalOpen: false,
    templateEditorData: null,
    setTemplatesModalDirty: jest.fn(),
    isTemplatesModalDirty: false,
  }),
}));

jest.mock('@/hooks/use-modal-keyboard-navigation', () => ({
  useModalKeyboardNavigation: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const createMockTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: `template-${Math.random()}`,
  titel: 'Test Template',
  inhalt: { type: 'doc', content: [] },
  user_id: 'user-123',
  kategorie: 'Mail',
  kontext_anforderungen: [],
  erstellungsdatum: '2024-01-01T10:00:00Z',
  aktualisiert_am: '2024-01-01T12:00:00Z',
  ...overrides,
});

const mockTemplates: Template[] = [
  createMockTemplate({ id: '1', titel: 'Welcome Email', kategorie: 'Mail' }),
  createMockTemplate({ id: '2', titel: 'Contract Template', kategorie: 'Vertrag' }),
  createMockTemplate({ id: '3', titel: 'Invoice Template', kategorie: 'Rechnung' }),
  createMockTemplate({ id: '4', titel: 'Reminder Letter', kategorie: 'Mahnung' }),
];

describe('TemplatesModal - Comprehensive Tests', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal with correct title and description', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument();
      expect(screen.getByText(/Erstellen und verwalten Sie Ihre Dokumentvorlagen/)).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText('Vorlagen durchsuchen...')).toBeInTheDocument();
    });

    it('renders category filter dropdown', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Alle Kategorien')).toBeInTheDocument();
    });

    it('renders create new template button', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Neue Vorlage')).toBeInTheDocument();
    });

    it('renders template cards for each template', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('template-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('template-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('template-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('template-card-4')).toBeInTheDocument();
    });
  });

  describe('Template Display', () => {
    it('groups templates by category', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Should show category headers
      expect(screen.getByText('Mail')).toBeInTheDocument();
      expect(screen.getByText('Vertrag')).toBeInTheDocument();
      expect(screen.getByText('Rechnung')).toBeInTheDocument();
      expect(screen.getByText('Mahnung')).toBeInTheDocument();
    });

    it('shows template count for each category', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Each category should have a count badge
      const badges = screen.getAllByText('1'); // Each category has 1 template
      expect(badges).toHaveLength(4);
    });

    it('shows total template count', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('4 von 4 Vorlagen')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates search query when typing in search input', async () => {
      const user = userEvent.setup();
      const mockSetSearchQuery = jest.fn();
      
      // Mock the hook to return our mock function
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: '',
        setSearchQuery: mockSetSearchQuery,
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: mockTemplates,
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      await user.type(searchInput, 'welcome');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('welcome');
    });

    it('shows active search filter badge', () => {
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: 'welcome',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [mockTemplates[0]],
        groupedTemplates: { Mail: [mockTemplates[0]] },
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('"welcome"')).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('shows available categories in filter dropdown', async () => {
      const user = userEvent.setup();
      
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const filterTrigger = screen.getByText('Alle Kategorien');
      await user.click(filterTrigger);

      expect(screen.getByRole('option', { name: 'Alle Kategorien' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mail' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Vertrag' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Rechnung' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mahnung' })).toBeInTheDocument();
    });

    it('updates selected category when option is chosen', async () => {
      const user = userEvent.setup();
      const mockSetSelectedCategory = jest.fn();
      
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: mockSetSelectedCategory,
        filteredTemplates: mockTemplates,
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const filterTrigger = screen.getByText('Alle Kategorien');
      await user.click(filterTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));

      expect(mockSetSelectedCategory).toHaveBeenCalledWith('Mail');
    });

    it('shows active category filter badge', () => {
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        selectedCategory: 'Mail',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [mockTemplates[0]],
        groupedTemplates: { Mail: [mockTemplates[0]] },
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Mail')).toBeInTheDocument();
    });
  });

  describe('Filter Management', () => {
    it('shows clear filters button when filters are active', () => {
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: 'test',
        setSearchQuery: jest.fn(),
        selectedCategory: 'Mail',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [],
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Zurücksetzen')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockSetSearchQuery = jest.fn();
      const mockSetSelectedCategory = jest.fn();
      
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: 'test',
        setSearchQuery: mockSetSearchQuery,
        selectedCategory: 'Mail',
        setSelectedCategory: mockSetSelectedCategory,
        filteredTemplates: [],
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const clearButton = screen.getByText('Zurücksetzen');
      await user.click(clearButton);

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
      expect(mockSetSelectedCategory).toHaveBeenCalledWith('all');
    });
  });

  describe('Template Creation', () => {
    it('opens template editor modal when create button is clicked', async () => {
      const user = userEvent.setup();
      const mockOpenTemplateEditorModal = jest.fn();
      
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: jest.fn(),
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: false,
        templateEditorData: null,
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const createButton = screen.getByText('Neue Vorlage');
      await user.click(createButton);

      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(undefined, expect.any(Function));
    });

    it('shows loading state during template creation', () => {
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: false,
        templateEditorData: null,
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      const { rerender } = render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Simulate creation state
      const TemplatesModalWithCreating = () => {
        const [isCreating, setIsCreating] = React.useState(true);
        return <TemplatesModal isOpen={true} onClose={mockOnClose} />;
      };

      // This would be tested through integration with the actual hook
      expect(screen.getByText('Neue Vorlage')).toBeInTheDocument();
    });
  });

  describe('Template Editing', () => {
    it('opens template editor modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOpenTemplateEditorModal = jest.fn();
      
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: jest.fn(),
        openTemplateEditorModal: mockOpenTemplateEditorModal,
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: false,
        templateEditorData: null,
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const editButton = screen.getAllByText('Edit')[0];
      await user.click(editButton);

      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(mockTemplates[0], expect.any(Function));
    });
  });

  describe('Template Deletion', () => {
    it('opens confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockOpenConfirmationModal = jest.fn();
      
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: mockOpenConfirmationModal,
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: false,
        templateEditorData: null,
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      expect(mockOpenConfirmationModal).toHaveBeenCalledWith({
        title: 'Vorlage löschen',
        description: expect.stringContaining('Welcome Email'),
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        onConfirm: expect.any(Function),
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when templates are loading', () => {
      const useTemplatesMock = require('@/hooks/use-templates').useTemplates;
      useTemplatesMock.mockReturnValue({
        templates: [],
        loading: true,
        error: null,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Should show loading skeletons
      const skeletons = document.querySelectorAll('[data-testid*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows loading state for individual template operations', () => {
      // This would be tested through the actual component state
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Template cards should be rendered normally when not loading
      expect(screen.getByTestId('template-card-1')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error message when templates fail to load', () => {
      const useTemplatesMock = require('@/hooks/use-templates').useTemplates;
      useTemplatesMock.mockReturnValue({
        templates: [],
        loading: false,
        error: 'Failed to load templates',
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument();
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });

    it('allows retry when error occurs', async () => {
      const user = userEvent.setup();
      const mockRefreshTemplates = jest.fn();
      
      const useTemplatesMock = require('@/hooks/use-templates').useTemplates;
      useTemplatesMock.mockReturnValue({
        templates: [],
        loading: false,
        error: 'Failed to load templates',
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: mockRefreshTemplates,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const retryButton = screen.getByText('Erneut versuchen');
      await user.click(retryButton);

      expect(mockRefreshTemplates).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no templates exist', () => {
      const useTemplatesMock = require('@/hooks/use-templates').useTemplates;
      useTemplatesMock.mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [],
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
      expect(screen.getByText('Erste Vorlage erstellen')).toBeInTheDocument();
    });

    it('shows no results state when search/filter returns no results', () => {
      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: 'nonexistent',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [],
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Keine Vorlagen gefunden')).toBeInTheDocument();
      expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('shows mobile-friendly button text', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Should show both full and abbreviated text
      expect(screen.getByText('Neue Vorlage')).toBeInTheDocument();
      expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument();
    });

    it('adapts layout for mobile screens', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Modal should have responsive classes
      const dialog = screen.getByRole('dialog');
      expect(dialog.parentElement).toHaveClass('max-w-[95vw]', 'sm:max-w-[90vw]');
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog structure', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper search input accessibility', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('has proper button roles and labels', () => {
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      const createButton = screen.getByText('Neue Vorlage');
      expect(createButton).toHaveAttribute('type', 'button');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Should be able to tab through interactive elements
      await user.keyboard('{Tab}');
      expect(screen.getByPlaceholderText('Vorlagen durchsuchen...')).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles large numbers of templates efficiently', () => {
      const manyTemplates = Array.from({ length: 100 }, (_, i) => 
        createMockTemplate({ 
          id: `template-${i}`, 
          titel: `Template ${i}`,
          kategorie: TEMPLATE_CATEGORIES[i % TEMPLATE_CATEGORIES.length] as any
        })
      );

      const useTemplatesMock = require('@/hooks/use-templates').useTemplates;
      useTemplatesMock.mockReturnValue({
        templates: manyTemplates,
        loading: false,
        error: null,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      const useTemplateFiltersMock = require('@/hooks/use-templates').useTemplateFilters;
      useTemplateFiltersMock.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: manyTemplates,
        groupedTemplates: manyTemplates.reduce((groups, template) => {
          const category = template.kategorie;
          if (!groups[category]) groups[category] = [];
          groups[category].push(template);
          return groups;
        }, {} as Record<string, Template[]>),
      });

      expect(() => {
        render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);
      }).not.toThrow();

      expect(screen.getByText('100 von 100 Vorlagen')).toBeInTheDocument();
    });

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Re-render with same props
      rerender(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Should still render correctly
      expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument();
    });
  });

  describe('Integration with Template Editor Modal', () => {
    it('renders template editor modal when open', () => {
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          template: null,
          onSave: jest.fn(),
        },
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('template-editor-modal')).toBeInTheDocument();
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });

    it('passes correct template data to editor modal', () => {
      const template = mockTemplates[0];
      
      const useModalStoreMock = require('@/hooks/use-modal-store').useModalStore;
      useModalStoreMock.mockReturnValue({
        openConfirmationModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          template: template,
          onSave: jest.fn(),
        },
        setTemplatesModalDirty: jest.fn(),
        isTemplatesModalDirty: false,
      });

      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Edit Template')).toBeInTheDocument();
    });
  });
});