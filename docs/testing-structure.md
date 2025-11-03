# Testing Structure

## Overview

This document outlines the testing structure for the RMS (Rent-Managing-System) project. All test files are now organized in dedicated `__tests__` directories to maintain a clean separation between source code and test files.

## Directory Structure

### Test Organization

All test files are located in `__tests__` directories within their respective feature directories:

```
project-root/
├── __tests__/                          # Root-level integration tests
├── app/
│   ├── __tests__/                      # App-level action tests
│   ├── (dashboard)/
│   │   ├── betriebskosten/__tests__/   # Operating costs tests
│   │   ├── finanzen/__tests__/         # Finance tests
│   │   ├── haeuser/__tests__/          # Houses tests
│   │   ├── mieter/__tests__/           # Tenant tests
│   │   ├── todos/__tests__/            # Todo tests
│   │   └── wohnungen/__tests__/        # Apartment tests
│   ├── api/
│   │   ├── __tests__/                  # General API tests
│   │   ├── apartments/[apartmentId]/tenant/[tenantId]/details/__tests__/
│   │   ├── finanzen/charts/__tests__/
│   │   ├── haeuser/[id]/overview/__tests__/
│   │   ├── search/__tests__/
│   │   └── wohnungen/[id]/overview/__tests__/
│   ├── landing/__tests__/              # Landing page tests
│   ├── modern/components/__tests__/    # Modern components tests
│   └── subscription-locked/__tests__/  # Subscription tests
├── components/
│   ├── __tests__/                      # Component tests
│   └── ui/__tests__/                   # UI component tests
├── hooks/
│   └── __tests__/                      # Custom hooks tests
├── integration/
│   └── __tests__/                      # Integration tests
└── lib/
    └── __tests__/                      # Utility library tests
```

## Test File Naming Conventions

### File Extensions
- **TypeScript tests**: `.test.ts`
- **React component tests**: `.test.tsx`
- **Spec files**: `.spec.ts` or `.spec.tsx`

### Naming Pattern
Test files should follow the pattern: `[component-name].test.[ts|tsx]`

Examples:
- `tenant-table.test.tsx`
- `use-modal-store.test.ts`
- `data-fetching.test.ts`

## Test Categories

### 1. Unit Tests
Located in component-specific `__tests__` directories:
- **Components**: `components/__tests__/`
- **Hooks**: `hooks/__tests__/`
- **Utilities**: `lib/__tests__/`

### 2. Integration Tests
- **Root level**: `__tests__/` - Cross-feature integration tests
- **Feature level**: `integration/__tests__/` - Feature-specific integration tests

### 3. API Tests
Located in `app/api/` subdirectories:
- Route handler tests
- API endpoint integration tests

### 4. Page Tests
Located in respective page directories:
- Page component tests
- Client wrapper tests
- Layout tests

## Jest Configuration

The Jest configuration has been updated to:

```javascript
testMatch: [
  '**/__tests__/**/*.{ts,tsx}',
  '**/?(*.)+(spec|test).{ts,tsx}'
],
collectCoverageFrom: [
  '**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!<rootDir>/.next/**',
  '!<rootDir>/*.config.{js,mjs}',
  '!<rootDir>/coverage/**',
  '!**/__tests__/**',        // Exclude test files from coverage
  '!**/*.test.{ts,tsx}',     // Exclude test files from coverage
  '!**/*.spec.{ts,tsx}',     // Exclude spec files from coverage
],
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Directory
```bash
npm test -- components/__tests__/
npm test -- hooks/__tests__/
npm test -- lib/__tests__/
```

### Specific Test File
```bash
npm test -- components/__tests__/tenant-table.test.tsx
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## GitHub Actions Integration

The CI/CD pipeline has been updated to reflect the new test structure:

- **Group 1**: Core library and component tests
- **Group 2**: Hooks, UI components, and dashboard tests  
- **Group 3**: Integration and comprehensive tests

Test files are automatically discovered using the new `__tests__` directory pattern.

## Best Practices

### 1. Test Placement
- Place tests in the `__tests__` directory closest to the code being tested
- Keep test files close to their source files for easy maintenance

### 2. Test Organization
- Group related tests in the same directory
- Use descriptive test file names that match the component/function being tested

### 3. Test Structure
```typescript
// components/__tests__/tenant-table.test.tsx
import { render, screen } from '@testing-library/react';
import { TenantTable } from '../tenant-table';

describe('TenantTable', () => {
  it('should render tenant data correctly', () => {
    // Test implementation
  });
});
```

### 4. Mock Placement
- Place mocks in `__mocks__` directories adjacent to `__tests__`
- Use `__mocks__` for module mocks and test utilities

## Migration Notes

All existing test files have been automatically moved to the new structure:

- ✅ 47 test files successfully relocated
- ✅ Jest configuration updated
- ✅ GitHub Actions workflow updated
- ✅ ESLint configuration maintained

## Benefits of New Structure

1. **Clean Separation**: Source code and tests are clearly separated
2. **Better Organization**: Tests are grouped by feature/component
3. **Easier Navigation**: Consistent `__tests__` directory pattern
4. **Improved Maintainability**: Tests are located near their source code
5. **CI/CD Optimization**: Better test discovery and parallel execution

## Troubleshooting

### Test Discovery Issues
If tests aren't being discovered:
1. Ensure test files are in `__tests__` directories
2. Check file extensions (`.test.ts` or `.test.tsx`)
3. Verify Jest configuration in `jest.config.mjs`

### Import Path Issues
Update import paths in test files to reflect the new structure:
```typescript
// Before
import { Component } from './component';

// After (from __tests__ directory)
import { Component } from '../component';
```

### Coverage Issues
If coverage reports are missing files:
1. Check `collectCoverageFrom` patterns in Jest config
2. Ensure source files aren't excluded from coverage
3. Verify test files are properly excluded from coverage collection