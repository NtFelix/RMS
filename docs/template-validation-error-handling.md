# Template Validation and Error Handling Implementation

This document outlines the comprehensive form validation and error handling system implemented for the template management feature.

## Overview

The implementation includes:
- Enhanced client-side validation with Zod schemas
- Comprehensive server-side validation and error handling
- User-friendly error messages and toast notifications
- Loading states during save operations
- Real-time validation feedback

## Client-Side Validation

### Enhanced Zod Schemas

#### Category Selection Schema
```typescript
const categorySchema = z.object({
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});
```

#### Template Editor Schema
```typescript
const templateSchema = z.object({
  titel: z
    .string({
      required_error: 'Der Titel ist erforderlich.',
      invalid_type_error: 'Der Titel muss ein Text sein.',
    })
    .min(3, 'Der Titel muss mindestens 3 Zeichen lang sein.')
    .max(100, 'Der Titel darf maximal 100 Zeichen lang sein.')
    .regex(/^[a-zA-ZäöüÄÖÜß0-9\s\-_.,!?()]+$/, 'Der Titel enthält ungültige Zeichen.'),
  inhalt: z.any()
    .refine((content) => !isEmptyTipTapContent(content), {
      message: 'Der Inhalt darf nicht leer sein.',
    })
    .refine((content) => validateMentionVariables(content).isValid, {
      message: 'Der Inhalt enthält ungültige Variablen.',
    }),
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});
```

### Validation Functions

#### `validateTemplate(templateData: Partial<TemplatePayload>): ValidationResult`
Comprehensive validation of template data including:
- Title validation (required, length, content)
- Content validation (required, not empty, valid TipTap JSON)
- Category validation (required, valid enum value)
- Context requirements validation (optional array)

#### `isEmptyTipTapContent(content: JSONContent): boolean`
Checks if TipTap content is empty or contains only whitespace:
- Handles empty content arrays
- Detects empty paragraphs
- Identifies whitespace-only content

#### `validateMentionVariables(content: JSONContent): ValidationResult`
Validates mention variables in TipTap content:
- Checks against predefined valid mention IDs
- Recursively validates nested content
- Returns specific error messages for invalid variables

## Server-Side Error Handling

### Enhanced API Routes

#### GET /api/templates
- Authentication validation with detailed error codes
- Database error handling with specific error types
- Graceful handling of empty results

#### POST /api/templates
- JSON parsing validation
- Comprehensive field validation
- Duplicate title detection
- Constraint violation handling
- Sanitized data insertion

#### GET /api/templates/[id]
- Template ID validation
- User authorization checks
- Not found error handling
- Access denied scenarios

#### PUT /api/templates/[id]
- Template existence verification
- Update validation
- Conflict resolution for duplicate titles
- Optimistic concurrency handling

#### DELETE /api/templates/[id]
- Pre-deletion existence check
- Foreign key constraint handling
- Cascade deletion prevention
- Audit logging

### Error Code System

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | User not authenticated | 401 |
| `ACCESS_DENIED` | User lacks permission | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `DUPLICATE_TITLE` | Title already exists | 409 |
| `CONSTRAINT_VIOLATION` | Database constraint failed | 400 |
| `FOREIGN_KEY_CONSTRAINT` | Cannot delete due to references | 409 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `INVALID_JSON` | Malformed request body | 400 |
| `INVALID_ID` | Invalid resource ID | 400 |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |

## Enhanced Template Service

### Error Handling by Operation

#### `getTemplates()`
- Network error detection
- Authentication error handling
- Database error recovery
- User-friendly error messages

#### `createTemplate(templateData)`
- Validation error parsing
- Duplicate detection
- Constraint violation handling
- Network failure recovery

#### `updateTemplate(id, templateData)`
- Not found error handling
- Conflict resolution
- Permission error handling
- Data integrity validation

#### `deleteTemplate(id)`
- Dependency checking
- Cascade prevention
- Permission validation
- Audit trail maintenance

## User Interface Enhancements

### Loading States

#### Template Editor Modal
- Save button shows spinner during operation
- Form fields disabled during save
- Progress indication with "Speichert..." text
- Minimum button width for consistent layout

#### Templates Modal
- Create button shows loading state
- Disabled state during operations
- Loading indicators for delete operations
- Skeleton loading for template list

### Error Display

#### Validation Error Panel
- Prominent error display with alert icon
- Bulleted list of specific errors
- Color-coded error styling
- Dismissible on user interaction

#### Toast Notifications
- Success notifications for completed operations
- Error notifications with specific messages
- Appropriate toast variants (success/destructive)
- Consistent messaging across operations

### Real-Time Feedback

#### Form Validation
- Errors clear when user starts typing
- Real-time validation feedback
- Field-specific error messages
- Form state management

#### Content Validation
- TipTap editor validation
- Mention variable validation
- Empty content detection
- Character count validation

## Testing

### Validation Function Tests
- Comprehensive test coverage for all validation functions
- Edge case testing (empty content, whitespace, invalid data)
- Mention variable validation testing
- Error message verification

### Test Coverage
- ✅ `validateTemplate()` function
- ✅ `isEmptyTipTapContent()` function  
- ✅ `validateMentionVariables()` function
- ✅ Error message accuracy
- ✅ Edge case handling

## Implementation Benefits

### User Experience
- Clear, actionable error messages in German
- Immediate feedback on validation errors
- Loading states prevent confusion
- Consistent error handling across the application

### Developer Experience
- Centralized validation logic
- Reusable validation functions
- Comprehensive error codes
- Detailed logging for debugging

### System Reliability
- Robust error handling prevents crashes
- Graceful degradation on failures
- Data integrity protection
- Security through validation

## Usage Examples

### Client-Side Validation
```typescript
const validation = validateTemplate(templateData);
if (!validation.isValid) {
  validation.errors.forEach(error => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

### Server-Side Error Handling
```typescript
try {
  const template = await TemplateService.createTemplate(data);
  toast({ title: 'Erfolg', description: 'Vorlage erstellt.' });
} catch (error) {
  toast({ 
    title: 'Fehler', 
    description: error.message, 
    variant: 'destructive' 
  });
}
```

### Loading State Management
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
  setIsLoading(true);
  try {
    await onSave(templateData);
  } finally {
    setIsLoading(false);
  }
};
```

## Future Enhancements

### Potential Improvements
- Field-level validation with debouncing
- Offline validation caching
- Validation rule customization
- Advanced mention variable suggestions
- Bulk operation error handling
- Validation analytics and monitoring

### Accessibility Enhancements
- Screen reader error announcements
- Keyboard navigation for error states
- High contrast error indicators
- Focus management during validation

This implementation provides a robust foundation for template management with comprehensive validation and error handling that enhances both user experience and system reliability.