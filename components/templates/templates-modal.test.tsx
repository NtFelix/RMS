import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatesModal } from '@/components/templates/templates-modal';
import { useTemplates, useTemplateFilters } from '@/hooks/use-templates';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the hooks
jest.mock('@/hooks/use-templates');
jest.mock('@/hooks/use-modal-store');

const mockUseTemplates = useTemplates as jest.MockedFunction<typeof useTemplates>;
const mockUseTemplateFilters = useTemplateFilters as jest.MockedFunction<typeof useTemplateFilters>;
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('TemplatesModal', () => {
  const mockTemplates = [
    {
      id: '1',
      titel: 'Test Template 1',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user-1',
      kategorie: 'Mail' as const,
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      titel: 'Test Template 2',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user-1',
      kategorie: 'Dokumente' as const,
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
    },
  ];

  const mockOpenConfirmationModal = jest.fn();

  beforeEach(() => {
    mockUseTemplates.mockReturnValue({
      templates: mockTemplates,
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplate: jest.fn(),
      refreshTemplates: jest.fn(),
    });

    mockUseTemplateFilters.mockReturnValue({
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      filteredTemplates: mockTemplates,
      groupedTemplates: {
        'Mail': [mockTemplates[0]],
        'Brief': [mockTemplates[1]],
      },
    });

    mockUseModalStore.mockReturnValue({
      openConfirmationModal: mockOpenConfirmationModal,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when open', () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Vorlagen verwalten')).toBeInTheDocument();
    expect(screen.getByText('Erstellen und verwalten Sie Ihre Dokumentvorlagen mit dynamischen Variablen.')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<TemplatesModal isOpen={false} onClose={jest.fn()} />);
    
    expect(screen.queryByText('Vorlagen verwalten')).not.toBeInTheDocument();
  });

  it('displays templates grouped by category', async () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Mail')).toHaveLength(2); // Category header + badge
      expect(screen.getAllByText('Brief')).toHaveLength(2); // Category header + badge
      expect(screen.getByText('Test Template 1')).toBeInTheDocument();
      expect(screen.getByText('Test Template 2')).toBeInTheDocument();
    });
  });

  it('shows create template button', () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Neue Vorlage')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByPlaceholderText('Vorlagen durchsuchen...')).toBeInTheDocument();
  });

  it('shows category filter dropdown', () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Alle Kategorien')).toBeInTheDocument();
  });

  it('filters templates by search query', async () => {
    // Mock filtered results for search
    mockUseTemplateFilters.mockReturnValue({
      searchQuery: 'Template 1',
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      filteredTemplates: [mockTemplates[0]], // Only first template
      groupedTemplates: {
        'Mail': [mockTemplates[0]],
      },
    });

    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Template 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Template 2')).not.toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    mockUseTemplates.mockReturnValue({
      templates: [],
      loading: true,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplate: jest.fn(),
      refreshTemplates: jest.fn(),
    });

    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    // Should show skeleton loading
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    const mockRefreshTemplates = jest.fn();
    mockUseTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: 'Test error message',
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplate: jest.fn(),
      refreshTemplates: mockRefreshTemplates,
    });

    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    // Clear all mocks first
    jest.clearAllMocks();
    
    mockUseTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplate: jest.fn(),
      refreshTemplates: jest.fn(),
    });

    // Mock useTemplateFilters to return empty results when called with empty templates array
    mockUseTemplateFilters.mockImplementation((templates) => ({
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      filteredTemplates: [],
      groupedTemplates: {},
    }));

    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
    expect(screen.getByText('Erstellen Sie Ihre erste Vorlage, um loszulegen.')).toBeInTheDocument();
    expect(screen.getByText('Erste Vorlage erstellen')).toBeInTheDocument();
  });

  it('shows template count', async () => {
    render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('2 von 2 Vorlagen')).toBeInTheDocument();
    });
  });
});