# Implementation Plan

- [x] 1. Database schema update
  - Add kaution JSONB column to Mieter table
  - Create migration script for the database change
  - _Requirements: 3.1, 3.2_

- [x] 2. Update TypeScript types and interfaces
  - [x] 2.1 Extend Tenant interface with kaution field
    - Add KautionData interface definition
    - Update Tenant type in types/Tenant.ts to include optional kaution field
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.2 Create kaution-specific type definitions
    - Define KautionFormData interface for form handling
    - Define status enum/union type for kaution status options
    - _Requirements: 5.1, 5.2_

- [x] 3. Extend modal store with kaution modal state
  - [x] 3.1 Add kaution modal state properties to useModalStore
    - Add isKautionModalOpen, kautionInitialData, isKautionModalDirty state
    - Implement openKautionModal, closeKautionModal, setKautionModalDirty methods
    - _Requirements: 6.1, 6.3_
  
  - [x] 3.2 Implement kaution modal state management logic
    - Add kaution modal to createCloseHandler pattern
    - Include dirty state confirmation logic for unsaved changes
    - _Requirements: 6.4_

- [x] 4. Create server action for kaution management
  - [x] 4.1 Implement updateKautionAction in mieter-actions.ts
    - Create server action to handle kaution data updates
    - Implement JSONB serialization for kaution data structure
    - Add proper error handling and validation
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [x] 4.2 Add rent calculation logic for suggested amount
    - Query Wohnungen table to get apartment rent based on wohnung_id
    - Calculate suggested kaution amount (3x rent)
    - Handle cases where no apartment or rent data exists
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Create KautionModal component
  - [x] 5.1 Implement basic modal structure and form
    - Create KautionModal component following existing modal patterns
    - Implement form with amount, payment date, and status fields
    - Add proper form validation and error handling
    - _Requirements: 1.2, 1.4, 1.5, 6.2_
  
  - [x] 5.2 Implement suggested amount calculation and display
    - Auto-populate amount field with 3x rent calculation
    - Format currency display properly (EUR)
    - Handle empty state when no rent data available
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.3 Add status selection and date picker functionality
    - Implement status dropdown with German options (Erhalten, Ausstehend, Zurückgezahlt)
    - Integrate DatePicker component for payment date
    - Add proper validation for required fields
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 5.4 Implement existing data loading and form submission
    - Load existing kaution data when editing
    - Handle form submission with proper error handling
    - Integrate with modal store for state management
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Update TenantContextMenu component
  - [x] 6.1 Add Kaution menu option
    - Insert "Kaution" option below "Bearbeiten" in context menu
    - Add appropriate icon (Euro or money-related icon)
    - Implement click handler to open kaution modal
    - _Requirements: 1.1, 6.1_
  
  - [x] 6.2 Integrate kaution modal opening logic
    - Pass tenant data to modal store when opening kaution modal
    - Handle existing kaution data retrieval and passing
    - Ensure proper modal state initialization
    - _Requirements: 1.2, 4.1_

- [x] 7. Update dashboard layout to render KautionModal
  - [x] 7.1 Add KautionModal to dashboard layout
    - Import and render KautionModal in dashboard layout
    - Pass required server action prop to modal
    - Ensure modal follows same rendering pattern as other modals
    - _Requirements: 6.2, 6.3_

- [x] 8. Add success feedback and error handling
  - [x] 8.1 Implement toast notifications for kaution operations
    - Add success toast when kaution is saved successfully
    - Add error toast for validation and save errors
    - Use German language for all notification messages
    - _Requirements: 6.4, 6.5_
  
  - [x] 8.2 Add proper form validation with error messages
    - Implement client-side validation for amount and date fields
    - Display German error messages for validation failures
    - Prevent form submission when validation errors exist
    - _Requirements: 6.5_

- [ ] 9. Write unit tests for kaution functionality
  - [ ] 9.1 Test KautionModal component
    - Test form validation logic and error display
    - Test suggested amount calculation with mock data
    - Test form submission and modal state management
    - _Requirements: All requirements validation_
  
  - [ ] 9.2 Test server action functionality
    - Test updateKautionAction with valid and invalid data
    - Test JSONB serialization and database operations
    - Test error handling scenarios
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [ ] 9.3 Test modal store integration
    - Test kaution modal state management
    - Test dirty state tracking and confirmation logic
    - Test modal open/close functionality
    - _Requirements: 6.1, 6.3, 6.4_

- [ ] 10. Integration testing and final validation
  - [ ] 10.1 Test complete kaution workflow
    - Test opening kaution modal from tenant context menu
    - Test creating new kaution with suggested amount
    - Test editing existing kaution data
    - _Requirements: 1.1, 1.2, 2.1, 4.1_
  
  - [ ] 10.2 Test edge cases and error scenarios
    - Test kaution management for tenants without apartments
    - Test handling of missing rent data
    - Test concurrent update scenarios
    - _Requirements: 2.2, 4.2_