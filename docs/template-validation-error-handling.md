# Template Validation and Error Handling

This document describes the validation logic and error handling strategy for the Template Editor.

## Validation Strategy

We use **Zod** for schema-based validation. The schemas are defined in `components/templates/template-editor-modal.tsx`.

### Zod 4 Implementation

The project has been migrated to Zod 4, which introduces a unified error API for most types and improved performance.

#### Category Selection Schema
```typescript
const categorySchema = z.object({
  kategorie: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Bitte wählen Sie eine Kategorie aus.',
    invalid_type_error: 'Ungültige Kategorie ausgewählt.',
  }),
});
```

#### Full Template Schema
```typescript
const templateSchema = z.object({
  titel: z
    .string({
      error: (issue) => issue.input === undefined 
        ? 'Der Titel ist erforderlich.' 
        : 'Der Titel muss ein Text sein.'
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

## Error Handling

Errors are handled at multiple levels:

1.  **Form Validation**: React Hook Form uses the Zod schemas to provide real-time validation feedback.
2.  **Manual Error Setting**: In some cases (like TipTap content validation), we manually set form errors using `setError`.
3.  **UI Feedback**: Errors are displayed using `FormMessage` and `toast` notifications.

### Example: Manual Error Setting
```typescript
if (!editorContent) {
  templateForm.setError('inhalt', {
    type: 'required',
    message: 'Der Inhalt darf nicht leer sein.'
  });
  return;
}
```
