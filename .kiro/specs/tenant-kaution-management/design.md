# Design Document

## Overview

The Kaution (security deposit) management feature extends the existing tenant management system by adding the ability to record, track, and manage security deposits. The feature integrates seamlessly with the current tenant interface through a new context menu option and modal dialog, following established patterns in the codebase.

## Architecture

### Database Layer
The feature utilizes the existing `Mieter` table structure, which already includes a `nebenkosten` JSONB column. A new `kaution` JSONB column will be added to store deposit information in a structured format.

### Component Architecture
The feature follows the established modal pattern used throughout the application:
- **Context Menu Extension**: Add "Kaution" option to existing `TenantContextMenu`
- **Modal Component**: New `KautionModal` component following the same patterns as `TenantEditModal`
- **Modal Store Integration**: Extend `useModalStore` with kaution modal state management
- **Server Actions**: New server action for kaution data persistence

## Components and Interfaces

### Database Schema Changes

```sql
-- Add kaution column to Mieter table
ALTER TABLE public."Mieter" 
ADD COLUMN kaution jsonb null;
```

### JSONB Structure for Kaution Data

```typescript
interface KautionData {
  amount: number;           // Deposit amount in EUR
  paymentDate: string;      // ISO date string (YYYY-MM-DD)
  status: 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}
```

### Component Interfaces

#### KautionModal Component
```typescript
interface KautionModalProps {
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

interface KautionFormData {
  amount: string;
  paymentDate: string;
  status: 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';
}
```

#### Modal Store Extension
```typescript
interface KautionModalState {
  isKautionModalOpen: boolean;
  kautionInitialData?: {
    tenant: Tenant;
    existingKaution?: KautionData;
    suggestedAmount?: number;
  };
  isKautionModalDirty: boolean;
  openKautionModal: (tenant: Tenant, existingKaution?: KautionData) => void;
  closeKautionModal: (options?: CloseModalOptions) => void;
  setKautionModalDirty: (isDirty: boolean) => void;
}
```

### Server Action Interface
```typescript
// In app/mieter-actions.ts
export async function updateKautionAction(formData: FormData): Promise<{
  success: boolean;
  error?: { message: string };
}>
```

## Data Models

### Tenant Type Extension
```typescript
// Update types/Tenant.ts
export interface Tenant {
  id: string;
  wohnung_id?: string;
  name: string;
  einzug?: string;
  auszug?: string;
  email?: string;
  telefonnummer?: string;
  notiz?: string;
  nebenkosten?: NebenkostenEntry[];
  kaution?: KautionData;  // New field
}
```

### Rent Calculation Logic
The system will need to fetch the associated apartment's rent to calculate the suggested deposit amount (3x rent). This requires:

1. Query the `Wohnungen` table using the tenant's `wohnung_id`
2. Retrieve the `miete` field
3. Calculate suggested amount as `miete * 3`

## Error Handling

### Validation Rules
- **Amount**: Required, must be positive number, formatted as currency
- **Payment Date**: Optional, must be valid date if provided
- **Status**: Required, must be one of the predefined options

### Error Scenarios
1. **Database Connection Errors**: Display generic error message, log details
2. **Validation Errors**: Show field-specific error messages
3. **Missing Rent Data**: Leave amount field empty if no associated apartment or rent
4. **Concurrent Updates**: Handle optimistic locking through timestamp comparison

### Error Messages (German)
- Amount validation: "Betrag muss eine positive Zahl sein"
- Date validation: "Ungültiges Datum"
- Save error: "Kaution konnte nicht gespeichert werden"
- Success message: "Kaution erfolgreich gespeichert"

## Testing Strategy

### Unit Tests
1. **KautionModal Component**
   - Form validation logic
   - Amount calculation (3x rent)
   - Status selection handling
   - Form submission flow

2. **Server Action**
   - JSONB data serialization/deserialization
   - Database update operations
   - Error handling scenarios

3. **Modal Store**
   - State management for kaution modal
   - Dirty state tracking
   - Modal open/close logic

### Integration Tests
1. **Context Menu Integration**
   - Kaution option appears in correct position
   - Modal opens with correct tenant data
   - Suggested amount calculation with real apartment data

2. **End-to-End Workflow**
   - Complete kaution creation flow
   - Existing kaution editing flow
   - Data persistence verification

### Accessibility Tests
1. **Keyboard Navigation**
   - Tab order through form fields
   - Enter/Escape key handling
   - Screen reader compatibility

2. **Form Accessibility**
   - Proper label associations
   - Error message announcements
   - Focus management

## Implementation Considerations

### Performance
- JSONB queries are efficient for the expected data volume
- No additional database joins required for basic operations
- Minimal impact on existing tenant queries

### Security
- Server-side validation of all input data
- User ID verification for data access
- SQL injection prevention through parameterized queries

### Scalability
- JSONB structure allows for future kaution-related fields
- No impact on existing table performance
- Supports multiple kaution records per tenant if needed in future

### Internationalization
- All UI text in German as per application standards
- Currency formatting for EUR
- Date formatting following German conventions (DD.MM.YYYY)

## UI/UX Design Patterns

### Modal Design
- Follows existing modal patterns (same header, footer, button styles)
- Consistent form field styling with other modals
- Same validation error display patterns

### Form Layout
```
┌─────────────────────────────────────┐
│ Kaution verwalten                   │
├─────────────────────────────────────┤
│ Mieter: [Tenant Name]               │
│                                     │
│ Betrag (€): [____] (Vorschlag: 1500)│
│ Zahlungsdatum: [DD.MM.YYYY]         │
│ Status: [Dropdown ▼]                │
│                                     │
│           [Abbrechen] [Speichern]   │
└─────────────────────────────────────┘
```

### Context Menu Integration
The "Kaution" option will be inserted between "Bearbeiten" and the separator before "Löschen":

```
┌─────────────────┐
│ ✏️  Bearbeiten   │
│ 💰 Kaution      │ ← New option
├─────────────────┤
│ 🗑️  Löschen      │
└─────────────────┘
```

### Status Indicators
- **Erhalten**: Green indicator
- **Ausstehend**: Yellow/orange indicator  
- **Zurückgezahlt**: Blue indicator

This design ensures consistency with the existing application while providing a robust foundation for kaution management functionality.