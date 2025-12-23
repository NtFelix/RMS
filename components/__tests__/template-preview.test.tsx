import { render, screen } from '@testing-library/react';
import { TemplatePreview } from '@/components/templates/template-preview';

describe('TemplatePreview', () => {
  it('renders plain text content correctly', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is plain text content.' },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    expect(screen.getByText('This is plain text content.')).toBeInTheDocument();
  });

  it('renders content with highlighted mentions', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              attrs: { id: 'mieter.name', label: 'Mieter.Name' },
            },
            { type: 'text', text: ', welcome!' },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('@Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText(', welcome!')).toBeInTheDocument();

    // Check that mention has proper styling classes
    const mentionElement = screen.getByText('@Mieter.Name');
    expect(mentionElement).toHaveClass('bg-primary/10', 'text-primary', 'px-1', 'py-0.5', 'rounded', 'font-medium');
  });

  it('renders multiple mentions correctly', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Dear ' },
            {
              type: 'mention',
              attrs: { id: 'mieter.name', label: 'Mieter.Name' },
            },
            { type: 'text', text: ', your apartment at ' },
            {
              type: 'mention',
              attrs: { id: 'wohnung.adresse', label: 'Wohnung.Adresse' },
            },
            { type: 'text', text: ' is ready.' },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    expect(screen.getByText('Dear')).toBeInTheDocument();
    expect(screen.getByText('@Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText(', your apartment at')).toBeInTheDocument();
    expect(screen.getByText('@Wohnung.Adresse')).toBeInTheDocument();
    expect(screen.getByText('is ready.')).toBeInTheDocument();
  });

  it('truncates long content correctly', () => {
    const longText = 'A'.repeat(150);
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: longText },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} maxLength={50} />);

    const displayedText = screen.getByText(/A+\.\.\./);
    expect(displayedText.textContent).toMatch(/\.\.\.$/);
    expect(displayedText.textContent!.length).toBeLessThanOrEqual(53); // 50 + '...'
  });

  it('handles empty content gracefully', () => {
    const content = { type: 'doc', content: [] };

    render(<TemplatePreview content={content} />);

    expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
  });

  it('handles null/undefined content gracefully', () => {
    render(<TemplatePreview content={null} />);

    expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
  });

  it('uses custom fallback text', () => {
    const content = { type: 'doc', content: [] };

    render(<TemplatePreview content={content} fallbackText="Custom fallback message" />);

    expect(screen.getByText('Custom fallback message')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Test content' },
          ],
        },
      ],
    };

    const { container } = render(
      <TemplatePreview content={content} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles complex nested content structures', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'First paragraph with ' },
            {
              type: 'mention',
              attrs: { id: 'mieter.name', label: 'Mieter.Name' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Second paragraph.' },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    expect(screen.getByText('First paragraph with')).toBeInTheDocument();
    expect(screen.getByText('@Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('provides proper tooltip for mentions', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'mieter.email', label: 'Mieter.Email' },
            },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    const mentionElement = screen.getByText('@Mieter.Email');
    expect(mentionElement).toHaveAttribute('title', 'Variable: mieter.email');
  });

  it('handles mentions without label gracefully', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'mieter.name' }, // No label
            },
          ],
        },
      ],
    };

    render(<TemplatePreview content={content} />);

    // When no label is provided, it should use the ID
    expect(screen.getByText('@mieter.name')).toBeInTheDocument();
  });

  it('handles malformed content gracefully', () => {
    const malformedContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          // Missing content property
        } as any,
      ],
    };

    render(<TemplatePreview content={malformedContent} />);

    expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
  });
});