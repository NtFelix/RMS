# Template Editor Usage Summary

## Quick Start Guide

### 1. Basic Implementation

```tsx
import { TemplateEditor } from '@/components/template-editor';

function MyComponent() {
  const [content, setContent] = useState('');

  return (
    <TemplateEditor
      content={content}
      onChange={(html) => setContent(html)}
      placeholder="Beginnen Sie mit der Eingabe... @ für Variablen"
    />
  );
}
```

### 2. Using Mention Suggestions

1. **Type `@`** in the editor to open the suggestion modal
2. **Type to filter** - suggestions update as you type
3. **Navigate with arrows** - use ↑/↓ to select items
4. **Press Enter or Tab** to insert the selected variable
5. **Press Escape** to close without inserting

### 3. Available Variables

| Category | Variables | Examples |
|----------|-----------|----------|
| **Mieter** | Name, Email, Telefon | `@Mieter.Name`, `@Mieter.Email` |
| **Wohnung** | Adresse, Zimmer, Größe | `@Wohnung.Adresse`, `@Wohnung.Zimmer` |
| **Haus** | Name, Adresse | `@Haus.Name`, `@Haus.Adresse` |
| **Datum** | Heute, Monat, Jahr | `@Datum.Heute`, `@Datum.Jahr` |
| **Vermieter** | Name, Adresse, Kontakt | `@Vermieter.Name`, `@Vermieter.Email` |

## Common Use Cases

### Modal Integration
```tsx
<Dialog>
  <DialogContent className="max-w-4xl">
    <TemplateEditor
      content={template.content}
      onChange={handleContentChange}
      className="min-h-[400px]"
    />
  </DialogContent>
</Dialog>
```

### Form Integration
```tsx
<Controller
  name="content"
  control={control}
  render={({ field }) => (
    <TemplateEditor
      content={field.value}
      onChange={field.onChange}
    />
  )}
/>
```

### Read-Only Display
```tsx
<TemplateEditor
  content={template.content}
  readOnly={true}
  className="border-0"
/>
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `@` | Open suggestions |
| `↑/↓` | Navigate suggestions |
| `Enter/Tab` | Select variable |
| `Escape` | Close suggestions |
| `Ctrl+B` | Bold text |
| `Ctrl+I` | Italic text |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

## Accessibility Features

- **Screen Reader Support**: Full ARIA implementation
- **Keyboard Navigation**: Complete keyboard accessibility
- **High Contrast**: Sufficient color contrast ratios
- **Focus Management**: Clear focus indicators
- **Mobile Optimized**: Touch-friendly interface

## Troubleshooting

### Suggestions Not Appearing
1. Check console for JavaScript errors
2. Verify all dependencies are installed
3. Ensure editor is focused before typing `@`

### Performance Issues
1. Check if debouncing is working (150ms delay)
2. Limit suggestion count if needed
3. Monitor memory usage for leaks

### Styling Problems
1. Verify CSS import order
2. Check for Tailwind conflicts
3. Ensure proper z-index for modals

## Best Practices

### Performance
- Use debounced filtering for large variable sets
- Implement proper cleanup in useEffect hooks
- Monitor render performance with React DevTools

### Accessibility
- Always provide aria-label for editors
- Use aria-describedby for help text
- Test with screen readers regularly

### User Experience
- Provide clear placeholder text
- Show loading states for async operations
- Handle errors gracefully with user-friendly messages

## Integration Patterns

### Template Management System
```tsx
// Create new template
const handleCreateTemplate = async (data) => {
  const response = await fetch('/api/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

// Use in component
<TemplateEditor
  onChange={(html) => setTemplateContent(html)}
  placeholder="Erstellen Sie Ihre Vorlage..."
/>
```

### Email Composer
```tsx
// Process variables for email sending
const processEmailContent = (content, tenant, apartment) => {
  return content
    .replace(/@Mieter\.Name/g, tenant.name)
    .replace(/@Wohnung\.Adresse/g, apartment.address);
};
```

### Document Generation
```tsx
// Generate PDF from template
const generatePDF = async (content) => {
  const response = await fetch('/api/documents/generate-pdf', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return response.blob();
};
```

## Documentation Links

- **[Complete Setup Guide](./template-editor-setup.md)** - Full implementation details
- **[Troubleshooting Guide](./template-editor-troubleshooting.md)** - Common issues and solutions
- **[Integration Examples](./template-editor-integration-examples.md)** - Real-world usage examples
- **[Accessibility Summary](./template-accessibility-summary.md)** - Accessibility compliance details

## Support

For additional help:
1. Check the troubleshooting guide for common issues
2. Review integration examples for implementation patterns
3. Test in isolation to identify specific problems
4. Verify all dependencies are properly installed and up to date