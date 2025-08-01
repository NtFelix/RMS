# Requirements Document

## Introduction

This feature adds security deposit (Kaution) management functionality to the tenant (Mieter) system. The feature allows property managers to record, track, and manage security deposits for tenants through a dedicated modal accessible from the tenant context menu. The system will store deposit information including amount, payment date, and status in a structured JSONB format within the existing Mieter table.

## Requirements

### Requirement 1

**User Story:** As a property manager, I want to record security deposit information for tenants, so that I can track deposit amounts and payment status for each tenant.

#### Acceptance Criteria

1. WHEN I right-click on a tenant in the Mieter table THEN the system SHALL display a context menu with a "Kaution" option below the "Bearbeiten" option
2. WHEN I click the "Kaution" option THEN the system SHALL open a dedicated Kaution modal
3. WHEN the Kaution modal opens THEN the system SHALL display an input field for the deposit amount with an automatically suggested value of 3 times the tenant's rent
4. WHEN the Kaution modal opens THEN the system SHALL display a date picker for the payment date
5. WHEN the Kaution modal opens THEN the system SHALL display a status selector with options for deposit status

### Requirement 2

**User Story:** As a property manager, I want the system to automatically suggest a deposit amount based on the tenant's rent, so that I can quickly set appropriate deposit amounts without manual calculation.

#### Acceptance Criteria

1. WHEN the Kaution modal opens THEN the system SHALL automatically calculate and populate the amount field with 3 times the tenant's current rent
2. WHEN the tenant has no associated rent information THEN the system SHALL leave the amount field empty
3. WHEN I modify the suggested amount THEN the system SHALL accept my custom value
4. WHEN the amount field is populated THEN the system SHALL format the value as currency (EUR)

### Requirement 3

**User Story:** As a property manager, I want to save deposit information in a structured format, so that I can maintain comprehensive records and easily query deposit data.

#### Acceptance Criteria

1. WHEN I save deposit information THEN the system SHALL store the data in a new JSONB column called "kaution" in the Mieter table
2. WHEN deposit data is saved THEN the system SHALL include the amount, payment date, and status in the JSONB structure
3. WHEN deposit data is saved THEN the system SHALL validate that required fields (amount) are provided
4. WHEN I save deposit information THEN the system SHALL update the tenant record and refresh the display
5. WHEN deposit information already exists THEN the system SHALL allow me to update the existing record

### Requirement 4

**User Story:** As a property manager, I want to view existing deposit information when accessing the Kaution modal, so that I can review and update previously recorded deposits.

#### Acceptance Criteria

1. WHEN I open the Kaution modal for a tenant with existing deposit data THEN the system SHALL populate all fields with the current deposit information
2. WHEN I open the Kaution modal for a tenant without deposit data THEN the system SHALL display empty fields with the suggested amount
3. WHEN existing deposit data is displayed THEN the system SHALL show the amount, payment date, and current status
4. WHEN I modify existing deposit information THEN the system SHALL update the record upon saving

### Requirement 5

**User Story:** As a property manager, I want to track the status of security deposits, so that I can monitor whether deposits have been paid, returned, or are pending.

#### Acceptance Criteria

1. WHEN I set deposit status THEN the system SHALL provide options including "Erhalten" (Received), "Ausstehend" (Pending), and "Zurückgezahlt" (Returned)
2. WHEN I save deposit information THEN the system SHALL store the selected status in the JSONB structure
3. WHEN displaying deposit information THEN the system SHALL show the current status clearly
4. WHEN the status is "Ausstehend" THEN the system SHALL indicate this visually in the interface

### Requirement 6

**User Story:** As a property manager, I want the deposit management feature to integrate seamlessly with the existing tenant interface, so that I can access deposit functionality without disrupting my current workflow.

#### Acceptance Criteria

1. WHEN I access the tenant context menu THEN the system SHALL display the "Kaution" option in a consistent style with other menu items
2. WHEN the Kaution modal opens THEN the system SHALL follow the same design patterns as other modals in the application
3. WHEN I save or cancel deposit changes THEN the system SHALL return me to the tenant list without losing my current view or filters
4. WHEN deposit information is saved THEN the system SHALL provide appropriate success feedback via toast notification
5. WHEN there are validation errors THEN the system SHALL display clear error messages and prevent saving