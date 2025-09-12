# Template Editor Setup Documentation

## Overview

This document describes the TipTap editor setup with mention extension for the template management system. The editor allows users to create rich text templates with dynamic variable insertion using the `@` symbol.

## Installed Dependencies

The following packages have been installed for the template editor functionality:

```json
{
  "@tiptap/core": "^3.4.2",
  "@tiptap/extension-mention": "^3.4.2", 
  "@tiptap/react": "^3.4.2",
  "@tiptap/starter-kit": "^3.4.2",
  "@tiptap/suggestion": "^3.4.2",
  "tippy.js": "^6.3.7"
}
```

## File Structure

```
components/
├── template-editor.tsx              # Main TipTap editor component
├── template-editor-demo.tsx         # Demo component for testing
└── __tests__/
    └── template-editor.test.tsx     # Unit tests

lib/
├── template-constants.ts            # Template categories and mention variables
└── __tests__/
    └── template-constants.test.ts   # Unit tests for constants

types/
└── template.ts                      # TypeScript interfaces for templates

styles/
└── template-editor.css              # CSS styles for editor and mentions
```

## Key Features

### 1. Mention Extension Configuration

The editor is configured with a mention extension that provides:

- **Trigger**: `@` symbol to activate mention dropdown
- **Variables**: German property management specific variables
- **Styling**: Blue highlighted mentions with hover effects
- **Dropdown**: Searchable dropdown with descriptions

### 2. Mention Variables

The system includes comprehensive mention variables for German property management:

#### Mieter (Tenant) Variables
- `@Mieter.Name` - Vollständiger Name des Mieters
- `@Mieter.Vorname` - Vorname des Mieters
- `@Mieter.Nachname` - Nachname des Mieters
- `@Mieter.Email` - E-Mail-Adresse des Mieters
- `@Mieter.Telefon` - Telefonnummer des Mieters

#### Wohnung (Apartment) Variables
- `@Wohnung.Adresse` - Vollständige Adresse der Wohnung
- `@Wohnung.Straße` - Straße der Wohnung
- `@Wohnung.Hausnummer` - Hausnummer der Wohnung
- `@Wohnung.PLZ` - Postleitzahl der Wohnung
- `@Wohnung.Ort` - Ort der Wohnung
- `@Wohnung.Zimmer` - Anzahl der Zimmer
- `@Wohnung.Größe` - Größe der Wohnung in m²

#### Haus (House) Variables
- `@Haus.Name` - Name des Hauses
- `@Haus.Adresse` - Adresse des Hauses

#### Datum (Date) Variables
- `@Datum.Heute` - Heutiges Datum (DD.MM.YYYY)
- `@Datum.Monat` - Aktueller Monat
- `@Datum.Jahr` - Aktuelles Jahr

#### Vermieter (Landlord) Variables
- `@Vermieter.Name` - Name des Vermieters
- `@Vermieter.Adresse` - Adresse des Vermieters
- `@Vermieter.Telefon` - Telefonnummer des Vermieters
- `@Vermieter.Email` - E-Mail-Adresse des Vermieters

### 3. Template Categories

Predefined categories for organizing templates:

- `Mail` - E-Mail templates
- `Brief` - Letter templates
- `Vertrag` - Contract templates
- `Rechnung` - Invoice templates
- `Mahnung` - Reminder templates
- `Kündigung` - Termination templates
- `Sonstiges` - Miscellaneous templates

## Usage Examples

### Basic Editor Usage

```tsx
import { TemplateEditor } from '@/components/template-editor';

function MyComponent() {
  const [content, setContent] = useState('');
  const [jsonContent, setJsonContent] = useState(null);

  const handleChange = (html: string, json: JSONContent) => {
    setContent(html);
    setJsonContent(json);
  };

  return (
    <TemplateEditor
      content={content}
      onChange={handleChange}
      placeholder="Beginnen Sie mit der Eingabe..."
    />
  );
}
```

### Read-Only Mode

```tsx
<TemplateEditor
  content={existingContent}
  readOnly={true}
  className="border-0"
/>
```

### Using Template Constants

```tsx
import { TEMPLATE_CATEGORIES, MENTION_VARIABLES } from '@/lib/template-constants';

// Get variables by category
const mieterVariables = getMentionVariablesByCategory('mieter');

// Find specific variable
const mieterName = getMentionVariableById('mieter.name');
```

## Testing

The setup includes comprehensive tests:

```bash
# Run template-related tests
npm test -- --testPathPatterns="template"

# Run all tests
npm test
```

Test coverage includes:
- Editor component rendering
- Mention variables structure
- Template constants validation
- Helper function behavior

## Styling

The editor uses Tailwind CSS classes with custom styles defined in `styles/template-editor.css`:

- **Mentions**: Blue background with rounded corners
- **Editor**: Clean prose styling with proper spacing
- **Dropdown**: Styled with Tailwind utilities and Tippy.js

## Demo Component

A demo component is available for testing the editor functionality:

```tsx
import { TemplateEditorDemo } from '@/components/template-editor-demo';

// Use in a page or component to test the editor
<TemplateEditorDemo />
```

## Next Steps

This setup provides the foundation for:

1. **Template Creation Modal** - Integration with category selection
2. **Template Management** - CRUD operations with Supabase
3. **Variable Resolution** - Converting mentions to actual data
4. **Template Rendering** - Displaying templates with resolved variables

## Requirements Fulfilled

This implementation satisfies the following requirements:

- **4.1**: TipTap editor with mention extension enabled ✅
- **4.2**: `@` trigger shows available mention options ✅  
- **4.3**: Dynamic content references with proper highlighting ✅

The base configuration is complete and ready for integration with the template management system.