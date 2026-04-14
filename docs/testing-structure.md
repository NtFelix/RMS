# Testing Structure

## Overview

This document outlines the testing structure for the RMS (Rent-Managing-System) project. 

## Test Co-location Policy

**All test files must be located in the same directory as the source files they verify.** This co-location pattern (also known as the "sibling pattern") is preferred because:
1. **Visibility**: It's immediately clear which files have test coverage.
2. **Maintenance**: Refactoring and renaming files is easier when the test is adjacent.
3. **Simplicity**: Import paths are simplified (e.g., `import { ... } from './component'`).

## Directory Structure Example

```
project-root/
├── app/
│   ├── mieter-import-actions.ts
│   ├── mieter-import-actions.test.ts   # Co-located
│   ├── user-billing-actions.ts
│   └── user-billing-actions.test.ts    # Co-located
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── button.test.tsx             # Co-located
├── lib/
│   ├── email-utils.ts
│   └── email-utils.test.ts             # Co-located
```

## Test File Naming Conventions

### File Extensions
- **TypeScript tests**: `.test.ts`
- **React component tests**: `.test.tsx`
- **Spec files**: `.spec.ts` or `.spec.tsx`

### Naming Pattern
Test files should follow the pattern: `[filename].test.[ts|tsx]`

## Jest Configuration

The Jest configuration supports this structure by searching for test files globally while excluding build artifacts and node_modules:

```javascript
testMatch: [
  '**/?(*.)+(spec|test).{ts,tsx}'
],
collectCoverageFrom: [
  '**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!<rootDir>/.next/**',
  '!**/*.test.{ts,tsx}',     // Exclude test files from coverage
  '!**/*.spec.{ts,tsx}',     // Exclude spec files from coverage
],
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Directory
```bash
npm test -- lib/
```

### Specific Test File
```bash
npm test -- lib/email-utils.test.ts
```

## Best Practices

1. **Keep it adjacent**: Always place your `.test.ts` file right next to the `.ts` file it tests.
2. **Avoid `__tests__`**: Do not create or use `__tests__` directories for new code.
3. **Mocking**: For component-level mocks, use a `__mocks__` subfolder if necessary, or co-locate the mock if it's simple.