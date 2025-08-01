# Requirements Document

## Introduction

This feature enhances the existing data tables in the RMS application by adding comprehensive sorting functionality to the Wohnungen (Apartments), Mieter (Tenants), and Finanzen (Finance) tables. The sorting functionality will be consistent with the existing implementation in the Häuser (Houses) table, providing users with the ability to sort data by clicking on table headers with visual indicators for sort direction.

## Requirements

### Requirement 1

**User Story:** As a property manager, I want to sort apartment data by different columns, so that I can quickly organize and find specific apartments based on various criteria.

#### Acceptance Criteria

1. WHEN I click on the "Wohnung" column header THEN the system SHALL sort apartments alphabetically by name
2. WHEN I click on the "Größe (m²)" column header THEN the system SHALL sort apartments numerically by size
3. WHEN I click on the "Miete (€)" column header THEN the system SHALL sort apartments numerically by rent amount
4. WHEN I click on the "Miete pro m²" column header THEN the system SHALL sort apartments numerically by price per square meter
5. WHEN I click on the "Haus" column header THEN the system SHALL sort apartments alphabetically by house name
6. WHEN I click on the "Status" column header THEN the system SHALL sort apartments by status (frei/vermietet)
7. WHEN I click on a column header that is already sorted THEN the system SHALL reverse the sort direction
8. WHEN I click on a different column header THEN the system SHALL sort by that column in ascending order by default

### Requirement 2

**User Story:** As a property manager, I want to sort tenant data by different columns, so that I can efficiently manage and locate tenant information.

#### Acceptance Criteria

1. WHEN I click on the "Name" column header THEN the system SHALL sort tenants alphabetically by name
2. WHEN I click on the "E-Mail" column header THEN the system SHALL sort tenants alphabetically by email address
3. WHEN I click on the "Telefon" column header THEN the system SHALL sort tenants alphabetically by phone number
4. WHEN I click on the "Wohnung" column header THEN the system SHALL sort tenants alphabetically by apartment name
5. WHEN I click on the "Nebenkosten" column header THEN the system SHALL sort tenants by the presence and amount of utility costs
6. WHEN I click on a column header that is already sorted THEN the system SHALL reverse the sort direction
7. WHEN I click on a different column header THEN the system SHALL sort by that column in ascending order by default

### Requirement 3

**User Story:** As a property manager, I want to sort financial transaction data by different columns, so that I can analyze and organize financial information effectively.

#### Acceptance Criteria

1. WHEN I click on the "Bezeichnung" column header THEN the system SHALL sort transactions alphabetically by name/description
2. WHEN I click on the "Wohnung" column header THEN the system SHALL sort transactions alphabetically by apartment name
3. WHEN I click on the "Datum" column header THEN the system SHALL sort transactions chronologically by date
4. WHEN I click on the "Betrag" column header THEN the system SHALL sort transactions numerically by amount
5. WHEN I click on the "Typ" column header THEN the system SHALL sort transactions by type (Einnahme/Ausgabe)
6. WHEN I click on a column header that is already sorted THEN the system SHALL reverse the sort direction
7. WHEN I click on a different column header THEN the system SHALL sort by that column in ascending order by default

### Requirement 4

**User Story:** As a property manager, I want visual indicators for sorting state, so that I can understand which column is currently sorted and in which direction.

#### Acceptance Criteria

1. WHEN a column is not sorted THEN the system SHALL display a neutral sort icon (ChevronsUpDown)
2. WHEN a column is sorted in ascending order THEN the system SHALL display an up arrow icon (ArrowUp)
3. WHEN a column is sorted in descending order THEN the system SHALL display a down arrow icon (ArrowDown)
4. WHEN I hover over a sortable column header THEN the system SHALL show a hover effect to indicate interactivity
5. WHEN I click on a column header THEN the system SHALL provide immediate visual feedback of the sort change

### Requirement 5

**User Story:** As a property manager, I want sorting to work seamlessly with existing filtering and search functionality, so that I can combine these features for optimal data organization.

#### Acceptance Criteria

1. WHEN I apply filters and then sort THEN the system SHALL sort only the filtered results
2. WHEN I perform a search and then sort THEN the system SHALL sort only the search results
3. WHEN I sort and then apply filters THEN the system SHALL maintain the sort order within the filtered results
4. WHEN I sort and then perform a search THEN the system SHALL maintain the sort order within the search results
5. WHEN I clear filters or search THEN the system SHALL maintain the current sort state on the full dataset