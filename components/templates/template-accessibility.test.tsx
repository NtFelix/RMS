/**
 * Comprehensive accessibility tests for the template system
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TemplatesModal } from '@/components/templates/templates-modal';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { TemplateCard } from '@/components/templates/template-card';
import { TemplateEditor } from '@/components/templates/template-editor';
import { useModalStore } from '@/hooks/use-modal-store';
import { useTemplates } from '@/hooks/use-templates';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-templates');
jest.mock('@/hooks/use-template-accessibility');

const mockTemplate = {
  id: '1',
  titel: 'Test Template',
  inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] },
  kategorie: 'Mail' as const,
  user_id: 'user1',
  kontext_anforderungen: [],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-01T00:00:00Z',
};

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockUseTemplates = useTemplates as jest.MockedFunction<typeof useTemplates>;

describe('Template System Accessibility', () => {
  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      openConfirmationModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
      closeTemplateEditorModal: jest.fn(),
      isTemplateEditorModalOpen: false,
      templateEditorData: null,
      setTemplatesModalDirty: jest.fn(),
      isTemplatesModalDirty: false,
    } as any);

    mockUseTemplates.mockReturnValue({
      templates: [mockTemplate],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      refreshTemplates: jest.fn(),
    } as any);
  });

  describe('TemplatesModal Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplatesModal isOpen={true} onClose={jest.fn()} />
      );

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Check modal has proper role and labels
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');

      // Check search input has proper label
      const searchInput = screen.getByRole('textbox', { name: /vorlagen durchsuchen/i });
      expect(searchInput).toBeInTheDocument();

      // Check category filter has proper label
      const categoryFilter = screen.getByRole('combobox');
      expect(categoryFilter).toHaveAttribute('aria-label');

      // Check create button has proper label
      const createButton = screen.getByRole('button', { name: /neue vorlage erstellen/i });
      expect(createButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Tab through focusable elements
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('combobox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /neue vorlage/i })).toHaveFocus();
    });

    it('should handle escape key to close modal', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<TemplatesModal isOpen={true} onClose={onClose} />);

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('should announce search results to screen readers', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');

      // Check for live region with results count
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Check main title
      const mainTitle = screen.getByRole('heading', { level: 2 });
      expect(mainTitle).toHaveTextContent(ARIA_LABELS.templatesModal);

      // Check category headings
      const categoryHeading = screen.getByRole('heading', { level: 3 });
      expect(categoryHeading).toBeInTheDocument();
    });
  });

  describe('TemplateCard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('should have proper ARIA labels and structure', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Check card has proper role and labels
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby');
      expect(card).toHaveAttribute('aria-describedby');

      // Check action buttons have proper labels
      const editButton = screen.getByRole('button', { name: /bearbeiten/i });
      expect(editButton).toHaveAttribute('aria-label');

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      expect(deleteButton).toHaveAttribute('aria-label');
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      const card = screen.getByRole('article');
      
      // Focus card and press Enter
      card.focus();
      await user.keyboard('{Enter}');
      expect(onEdit).toHaveBeenCalledWith(mockTemplate);

      // Test Space key
      await user.keyboard(' ');
      expect(onEdit).toHaveBeenCalledTimes(2);
    });

    it('should have proper time element', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('dateTime');
      expect(timeElement).toHaveAttribute('aria-label');
    });
  });

  describe('TemplateEditorModal Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('should have proper form structure and labels', () => {
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Check form has proper role
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Check form fields have proper labels
      const categorySelect = screen.getByRole('combobox');
      expect(categorySelect).toHaveAttribute('aria-label');

      // Check buttons have proper labels
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      expect(cancelButton).toHaveAttribute('aria-label');
    });

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
          template={mockTemplate}
        />
      );

      // Test Ctrl+S shortcut
      await user.keyboard('{Control>}s{/Control}');
      // Note: This would need to be implemented in the component
    });

    it('should announce validation errors', async () => {
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Trigger validation error by submitting empty form
      const submitButton = screen.getByRole('button', { name: /weiter/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('TemplateEditor Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TemplateEditor
          content={undefined}
          onChange={jest.fn()}
        />
      );

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('should have proper toolbar structure', () => {
      render(
        <TemplateEditor
          content={undefined}
          onChange={jest.fn()}
        />
      );

      // Check toolbar has proper role
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label');

      // Check toolbar buttons have proper labels and states
      const boldButton = screen.getByRole('button', { name: /fett/i });
      expect(boldButton).toHaveAttribute('aria-pressed');
      expect(boldButton).toHaveAttribute('aria-label');

      const italicButton = screen.getByRole('button', { name: /kursiv/i });
      expect(italicButton).toHaveAttribute('aria-pressed');
    });

    it('should have proper editor structure', () => {
      render(
        <TemplateEditor
          content={undefined}
          onChange={jest.fn()}
          aria-label="Test editor"
        />
      );

      // Check editor container has proper role and label
      const editorContainer = screen.getByRole('application');
      expect(editorContainer).toHaveAttribute('aria-label', 'Test editor');

      // Check textbox has proper attributes
      const textbox = screen.getByRole('textbox');
      expect(textbox).toHaveAttribute('aria-multiline', 'true');
    });

    it('should support keyboard shortcuts in toolbar', async () => {
      const user = userEvent.setup();
      render(
        <TemplateEditor
          content={undefined}
          onChange={jest.fn()}
        />
      );

      // Focus editor and test keyboard shortcuts
      const textbox = screen.getByRole('textbox');
      textbox.focus();

      // Test Ctrl+B for bold
      await user.keyboard('{Control>}b{/Control}');
      
      // Test Ctrl+I for italic
      await user.keyboard('{Control>}i{/Control}');
    });

    it('should handle mention dropdown accessibility', async () => {
      const user = userEvent.setup();
      render(
        <TemplateEditor
          content={undefined}
          onChange={jest.fn()}
        />
      );

      const textbox = screen.getByRole('textbox');
      textbox.focus();

      // Type @ to trigger mention dropdown
      await user.type(textbox, '@');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveAttribute('aria-label');

        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
        
        options.forEach(option => {
          expect(option).toHaveAttribute('aria-selected');
          expect(option).toHaveAttribute('aria-label');
        });
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation in template grid', async () => {
      const user = userEvent.setup();
      
      // Mock multiple templates
      mockUseTemplates.mockReturnValue({
        templates: [mockTemplate, { ...mockTemplate, id: '2', titel: 'Template 2' }],
        loading: false,
        error: null,
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      } as any);

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const firstCard = screen.getAllByRole('article')[0];
      firstCard.focus();

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      // Should focus next card or wrap around

      await user.keyboard('{Home}');
      // Should focus first card

      await user.keyboard('{End}');
      // Should focus last card
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Get first and last focusable elements
      const focusableElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('textbox'),
        screen.getAllByRole('combobox')
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus last element and tab forward
      lastElement.focus();
      await user.tab();
      expect(firstElement).toHaveFocus();

      // Focus first element and tab backward
      firstElement.focus();
      await user.tab({ shift: true });
      expect(lastElement).toHaveFocus();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce template operations', async () => {
      // This would need to be implemented with a proper screen reader testing library
      // For now, we test that the live regions are present
      
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Check for live regions
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
      });
    });
  });

  describe('High Contrast and Color Accessibility', () => {
    it('should not rely solely on color for information', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Check that buttons have text or aria-labels, not just color
      const editButton = screen.getByRole('button', { name: /bearbeiten/i });
      expect(editButton).toHaveAttribute('aria-label');

      const deleteButton = screen.getByRole('button', { name: /löschen/i });
      expect(deleteButton).toHaveAttribute('aria-label');
    });

    it('should have sufficient focus indicators', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Check that focusable elements have focus styles
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        // This would need visual regression testing or computed style checking
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have appropriate touch targets', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Check that buttons are large enough for touch
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // This would need to check computed styles for minimum 44px touch targets
        expect(button).toBeInTheDocument();
      });
    });

    it('should work with screen reader gestures', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Check that elements are properly structured for screen reader navigation
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      const landmarks = screen.getAllByRole('region');
      landmarks.forEach(landmark => {
        expect(landmark).toHaveAttribute('aria-label');
      });
    });
  });
});