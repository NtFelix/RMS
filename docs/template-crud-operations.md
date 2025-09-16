# Template CRUD Operations

This document describes the template CRUD (Create, Read, Update, Delete) operations implemented for the RMS template management system.

## Overview

The template CRUD operations provide a complete API for managing document templates with rich text content and mention variables. The system includes:

- RESTful API endpoints
- Client-side service layer with optimistic updates
- React hooks for easy component integration
- Comprehensive validation and error handling
- TypeScript type safety throughout

## API Endpoints

### GET /api/templates
Retrieves all templates for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "titel": "Template Title",
    "inhalt": { "type": "doc", "content": [...] },
    "kategorie": "Mail",
    "kontext_anforderungen": ["mieter", "wohnung"],
    "user_id": "uuid",
    "erstellungsdatum": "2024-01-01T00:00:00Z",
    "aktualisiert_am": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/templates
Creates a new template.

**Request Body:**
```json
{
  "titel": "New Template",
  "inhalt": { "type": "doc", "content": [...] },
  "kategorie": "Mail",
  "kontext_anforderungen": ["mieter"]
}
```

### GET /api/templates/[id]
Retrieves a specific template by ID.

### PUT /api/templates/[id]
Updates an existing template.

### DELETE /api/templates/[id]
Deletes a template.

## Service Layer

### TemplateService
Static class providing basic CRUD operations:

```typescript
// Get all templates
const templates = await TemplateService.getTemplates();

// Get single template
const template = await TemplateService.getTemplate(id);

// Create template
const newTemplate = await TemplateService.createTemplate(templateData);

// Update template
const updatedTemplate = await TemplateService.updateTemplate(id, templateData);

// Delete template
await TemplateService.deleteTemplate(id);
```

### OptimisticTemplateService
Advanced service with optimistic updates for better UX:

```typescript
const service = new OptimisticTemplateService({
  onSuccess: (message) => toast.success(message),
  onError: (error) => toast.error(error)
});

// Subscribe to changes
const unsubscribe = service.subscribe(() => {
  setTemplates(service.getTemplates());
});

// Operations with optimistic updates
await service.createTemplate(templateData);
await service.updateTemplate(id, templateData);
await service.deleteTemplate(id);
```

## React Hooks

### useTemplates()
Main hook for template management in React components:

```typescript
const {
  templates,
  loading,
  error,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  refreshTemplates
} = useTemplates();
```

### useTemplateFilters()
Hook for filtering and searching templates:

```typescript
const {
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  filteredTemplates,
  groupedTemplates
} = useTemplateFilters(templates);
```

## Validation

### Client-Side Validation
The `validateTemplate()` function checks:

- Title: Required, 3-100 characters
- Content: Required, non-empty TipTap JSON
- Category: Must be one of predefined categories
- Context requirements: Optional array of strings

```typescript
const result = validateTemplate(templateData);
if (!result.isValid) {
  console.log(result.errors);
}
```

### Data Sanitization
The `sanitizeTemplateData()` function:

- Trims whitespace from title
- Ensures context requirements is an array
- Preserves TipTap JSON structure

## Error Handling

### API Errors
- 401: Unauthorized (user not authenticated)
- 400: Validation errors
- 404: Template not found
- 500: Server errors

### Client-Side Errors
- Network errors
- Validation errors
- Optimistic update rollbacks

## Database Schema

The templates are stored in the `Vorlagen` table:

```sql
CREATE TABLE "Vorlagen" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT,
  inhalt JSONB,
  user_id UUID REFERENCES auth.users(id),
  kategorie TEXT,
  kontext_anforderungen TEXT[],
  erstellungsdatum TIMESTAMPTZ DEFAULT NOW(),
  aktualisiert_am TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

- Row Level Security (RLS) ensures users can only access their own templates
- User authentication required for all operations
- Input validation on both client and server
- SQL injection protection through Supabase client

## Performance Considerations

- Optimistic updates for immediate UI feedback
- Efficient database queries with proper indexing
- Client-side caching through React state
- Minimal data transfer with selective queries

## Testing

The implementation includes comprehensive tests:

- Unit tests for service functions
- Integration tests for complete workflows
- Validation tests for edge cases
- Error handling tests

Run tests with:
```bash
npm test -- __tests__/template-crud-operations.test.ts
npm test -- __tests__/template-integration.test.ts
```

## Usage Examples

### Creating a Template
```typescript
const templateData = {
  titel: 'Welcome Email',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'mention', attrs: { id: 'mieter.name' } },
          { type: 'text', text: '!' }
        ]
      }
    ]
  },
  kategorie: 'Mail',
  kontext_anforderungen: ['mieter']
};

await createTemplate(templateData);
```

### Updating a Template
```typescript
const updates = {
  titel: 'Updated Welcome Email',
  inhalt: updatedContent,
  kategorie: 'Mail',
  kontext_anforderungen: ['mieter', 'wohnung']
};

await updateTemplate(templateId, updates);
```

### Filtering Templates
```typescript
// Filter by category
setSelectedCategory('Mail');

// Search by title
setSearchQuery('welcome');

// Use filtered results
filteredTemplates.forEach(template => {
  console.log(template.titel);
});
```

## Future Enhancements

- Template versioning
- Template sharing between users
- Advanced mention variable validation
- Template preview generation
- Bulk operations
- Template import/export