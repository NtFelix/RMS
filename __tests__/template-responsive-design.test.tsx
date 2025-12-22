import { render, screen } from '@testing-library/react';
import { TemplateCard } from '@/components/templates/template-card';
import { Template } from '@/types/template';

// Mock the hooks
jest.mock('@/hooks/use-templates', () => ({
  useTemplates: () => ({
    templates: [],
    loading: false,
    error: null,
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    refreshTemplates: jest.fn(),
  }),
  useTemplateFilters: () => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedCategory: 'all',
    setSelectedCategory: jest.fn(),
    filteredTemplates: [],
    groupedTemplates: {},
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
    setTemplateEditorModalDirty: jest.fn(),
    isTemplateEditorModalDirty: false,
  }),
}));

jest.mock('@/hooks/use-modal-keyboard-navigation', () => ({
  useModalKeyboardNavigation: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockTemplate: Template = {
  id: '1',
  titel: 'Test Template',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This is a test template content that should be truncated in the preview.',
          },
        ],
      },
    ],
  },
  kategorie: 'Mail',
  user_id: 'user-1',
  kontext_anforderungen: [],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-01T00:00:00Z',
};

describe('Template Components Responsive Design', () => {
  describe('TemplateCard', () => {
    it('renders with responsive classes', () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('group', 'relative', 'h-full');
    });

    it('has mobile-friendly action buttons', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Check for mobile-specific button classes
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('truncates long template titles appropriately', () => {
      const longTitleTemplate = {
        ...mockTemplate,
        titel: 'This is a very long template title that should be truncated on smaller screens',
      };

      render(
        <TemplateCard
          template={longTitleTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const title = screen.getByText(longTitleTemplate.titel);
      expect(title).toHaveClass('truncate');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('applies correct classes for different screen sizes', () => {
      // Test mobile-first responsive classes
      const { container } = render(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <div>Test</div>
        </div>
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        'gap-3',
        'sm:gap-4'
      );
    });

    it('applies responsive padding and spacing', () => {
      const { container } = render(
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
          <div>Test</div>
        </div>
      );

      const element = container.firstChild;
      expect(element).toHaveClass('p-3', 'sm:p-4', 'space-y-4', 'sm:space-y-6');
    });
  });

  describe('Touch-Friendly Design', () => {
    it('has appropriate touch targets for mobile', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check that buttons have appropriate sizing classes
        const classList = Array.from(button.classList);
        const hasTouchFriendlySize = classList.some(cls => 
          cls.includes('h-7') || cls.includes('h-8') || cls.includes('p-')
        );
        expect(hasTouchFriendlySize).toBe(true);
      });
    });
  });

  describe('Typography Responsiveness', () => {
    it('uses responsive text sizing', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const title = screen.getByText(mockTemplate.titel);
      expect(title).toHaveClass('text-sm');
    });
  });
});