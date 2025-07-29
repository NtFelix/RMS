# Comprehensive AI Agent Instructions for RMS (Rent-Managing-System)

## Project Overview

### Product Description
RMS (Rent-Managing-System) is a comprehensive German property management SaaS web application designed specifically for landlords and property managers. The application provides a complete suite of tools to manage rental properties efficiently with German-localized terminology and business logic.

### Core Business Entities (German Domain Language)
- **Mieter (Tenants)** - Complete tenant information management including personal details, move-in/out dates, contact information, rental agreements, and tenant history
- **Wohnungen (Apartments)** - Detailed apartment listings with specifications including size (square meters), monthly rent amounts, utility information, and association with parent house buildings
- **Häuser (Houses)** - Property building management that serves as containers for multiple apartments, including building-wide information, maintenance records, and ownership details
- **Finanzen (Finances)** - Comprehensive income and expense tracking system per apartment with categorization, receipt management, and financial reporting capabilities
- **Betriebskosten (Operating Costs)** - Utility cost management and expense calculation system for distributing building-wide costs among tenants
- **Aufgaben (Tasks)** - Property maintenance and management todo system with priority levels, due dates, and completion tracking

### Business Model & Features
- **Multi-tenant SaaS Architecture** - Each user has isolated data with role-based access control
- **Subscription-based Pricing** - Different subscription tiers limiting the number of apartments (Wohnungen) users can manage
- **Trial Period Management** - Free trial periods with automatic conversion to paid subscriptions
- **Stripe Integration** - Complete payment processing, subscription management, and billing automation
- **Data Export Capabilities** - PDF generation for reports, contracts, and financial statements; CSV export for data analysis
- **Responsive Dashboard** - Real-time analytics with interactive charts, KPI tracking, and visual data representation
- **German Language Interface** - Fully localized UI with German terminology, date formats, and business logic
- **Real-time Updates** - Live data synchronization across all connected clients using Supabase real-time features

## Technology Stack

### Framework & Runtime Environment
- **Next.js 15** - React framework with App Router architecture for server-side rendering and static generation
- **React 18** - Modern UI library with concurrent features and hooks
- **TypeScript** - Comprehensive type safety throughout the entire codebase
- **Node.js** - JavaScript runtime environment for server-side operations

### Database & Backend Services
- **Supabase** - PostgreSQL database with real-time capabilities, row-level security, and built-in APIs
- **Supabase Auth** - Complete authentication system with user management, social logins, and security features
- **Stripe** - Payment processing platform handling subscriptions, invoicing, and financial transactions

### UI & Styling Framework
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development with mobile-first responsive design
- **Radix UI** - Unstyled, accessible component primitives for building high-quality design systems
- **Shadcn/ui** - Pre-built, customizable component library built on top of Radix UI
- **Lucide React** - Beautiful, customizable icon library with consistent design language
- **Framer Motion** - Production-ready motion library for React with advanced animation capabilities
- **next-themes** - Theme management system supporting dark/light mode with system preference detection

### State Management & Form Handling
- **Zustand** - Lightweight state management solution for global application state
- **React Hook Form** - Performant forms library with minimal re-renders and built-in validation
- **Zod** - TypeScript-first schema validation library for runtime type checking

### Data Visualization & Export
- **Recharts** - Composable charting library built on React components for data visualization
- **jsPDF** - Client-side PDF generation library for creating reports and documents
- **Papa Parse** - Fast, in-browser CSV parsing library for data import/export functionality

### Development & Testing Tools
- **Jest** - JavaScript testing framework with snapshot testing and mocking capabilities
- **Testing Library** - Simple and complete testing utilities for React components
- **ESLint** - Configurable JavaScript/TypeScript linter for code quality enforcement

## Architecture & Project Structure

### Directory Organization
```
app/
├── (dashboard)/              # Protected routes with shared authenticated layout
│   ├── mieter/              # Tenant management pages
│   ├── wohnungen/           # Apartment management pages
│   ├── haeuser/             # House management pages
│   ├── finanzen/            # Financial management pages
│   ├── betriebskosten/      # Operating costs pages
│   ├── aufgaben/            # Task management pages
│   └── layout.tsx           # Shared dashboard layout with navigation
├── auth/                    # Authentication flow pages (login, signup, reset)
├── api/                     # API routes and REST endpoints
│   ├── stripe/              # Stripe webhook handlers
│   └── export/              # Data export endpoints
└── [entity]-actions.ts      # Server actions per business entity

components/
├── ui/                      # Shadcn/ui base components (button, input, modal, etc.)
├── [entity]-table.tsx       # Data table components for each entity with sorting/filtering
├── [entity]-edit-modal.tsx  # Edit modal components with form validation
├── [entity]-context-menu.tsx # Right-click context menus for table actions
├── charts/                  # Reusable chart components for dashboard analytics
└── layout/                  # Layout components (sidebar, header, footer)

lib/
├── supabase-server.ts       # Server-side Supabase client configuration
├── supabase-client.ts       # Client-side Supabase client configuration
├── data-fetching.ts         # Shared data fetching utilities and error handling
├── stripe.ts                # Stripe client configuration and utilities
├── utils.ts                 # General utility functions (classNames, formatters, etc.)
├── validations.ts           # Zod schemas for form and data validation
└── constants.ts             # Application constants and configuration

types/
├── supabase.ts              # Auto-generated Supabase types
├── stripe.ts                # Stripe-related type definitions
└── index.ts                 # General application type definitions

supabase/
├── database/
│   └── schema.sql           # Complete database schema definition
├── migrations/              # Database migration files with timestamps
│   ├── 20231027000000_create_delete_user_data_trigger.sql
│   └── 20231027100000_add_trial_fields_to_profiles.sql
└── functions/               # Edge functions for server-side logic
    ├── delete-user-account/
    └── stripe-webhook/
```

### Naming Conventions (Strictly Enforced)
- **Files/Folders**: kebab-case (tenant-table.tsx, user-profile.tsx)
- **React Components**: PascalCase (TenantTable, UserProfile)
- **Functions/Variables**: camelCase (fetchTenants, userProfile)
- **Database Entities**: German terms (Mieter, Wohnungen, Häuser, Finanzen, Betriebskosten, Aufgaben)
- **Constants**: UPPER_SNAKE_CASE (MAX_APARTMENTS, DEFAULT_TRIAL_DAYS)
- **TypeScript Interfaces**: PascalCase with descriptive names (TenantFormData, SubscriptionPlan)

## Development Workflow

### Environment Setup
1. **Clone Repository and Install Dependencies**:
   ```bash
   git clone [repository-url]
   cd rent-managing-system
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env.local
   # Configure all required environment variables (see Environment Variables section)
   ```

3. **Database Setup**:
   ```bash
   # Run Supabase migrations
   npx supabase db reset
   npx supabase db push
   ```

4. **Verify Installation**:
   ```bash
   npm run build  # Must complete successfully
   npm run dev    # Start development server
   ```

### Daily Development Commands
```bash
# Development workflow
npm run dev          # Start development server with hot reload and Turbo
npm run build        # Production build with optimization
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest test suite with coverage

# Database operations
npx supabase db reset      # Reset local database to match migrations
npx supabase db push       # Push local schema changes to remote
npx supabase db pull       # Pull remote schema changes to local
npx supabase gen types typescript --local > types/supabase.ts  # Generate types
```

### Critical Pre-Commit Requirements
**MANDATORY**: Before pushing any code to GitHub, you MUST ensure:

1. **Build Verification**: 
   - Run `npm run build` and verify it completes without errors
   - If build times out, retry up to 3 times before investigating
   - Never push code that fails to build

2. **Runtime Verification**:
   - Run `npm run dev` and manually verify the application starts correctly
   - Test critical user flows (login, navigation, core CRUD operations)
   - Verify no console errors in browser developer tools

3. **Type Safety**:
   - Run `npm run type-check` to ensure TypeScript compilation succeeds
   - Fix all type errors before committing

4. **Code Quality**:
   - Run `npm run lint` and fix all linting errors
   - Ensure code follows project conventions and patterns

5. **Testing**:
   - Run `npm test` and ensure all existing tests pass
   - Write tests for new features and bug fixes
   - Maintain or improve test coverage

### Alternative Verification Strategy
If you cannot resolve build/runtime errors after investigation:
1. Create a separate test branch
2. Implement alternative approach to verify functionality
3. Run specific component tests: `npm test -- --testNamePattern="ComponentName"`
4. Manually verify critical user workflows in development mode
5. Document any known issues in commit message
6. Only proceed if core functionality remains intact

## Coding Conventions & Patterns

### Page Component Structure
```typescript
// Server component pattern for pages
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenants } from '@/lib/data-fetching'
import TenantManagement from './tenant-management'

export default async function TenantsPage() {
  const supabase = createServerSupabaseClient()
  const { data: tenants, error } = await fetchTenants(supabase)
  
  if (error) {
    throw new Error(`Failed to load tenants: ${error.message}`)
  }
  
  return 
}
```

### Modal Management Pattern
```typescript
// Global modal state management using Zustand
// Located in lib/use-modal-store.tsx
interface ModalStore {
  isOpen: boolean
  modalType: 'edit-tenant' | 'delete-tenant' | 'create-apartment' | null
  data?: any
  openModal: (type: string, data?: any) => void
  closeModal: () => void
}

// All modals rendered in dashboard layout
// Pass server actions as props to modals for data mutations
```

### Server Actions Pattern
```typescript
// Located in app/[entity]-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { tenantSchema } from '@/lib/validations'

export async function createTenant(formData: FormData) {
  const supabase = createServerSupabaseClient()
  
  // Validate input data
  const validatedData = tenantSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    // ... other fields
  })
  
  // Perform database operation
  const { data, error } = await supabase
    .from('mieter')
    .insert(validatedData)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`)
  }
  
  // Revalidate affected pages
  revalidatePath('/mieter')
  return { success: true, data }
}
```

### Data Fetching Patterns
```typescript
// Server components: Direct Supabase calls
const { data, error } = await supabase
  .from('mieter')
  .select(`
    *,
    wohnungen:apartment_id (
      hausnummer,
      strasse
    )
  `)
  .order('created_at', { ascending: false })

// Client components: Use shared utilities
import { useTenants } from '@/lib/data-fetching'

function TenantsList() {
  const { data: tenants, isLoading, error } = useTenants()
  
  if (isLoading) return 
  if (error) return 
  
  return 
}
```

### Component Interface Patterns
```typescript
// Modal component interfaces must include server actions
interface TenantEditModalProps {
  tenant?: Tenant
  isOpen: boolean
  onClose: () => void
  createAction: (formData: FormData) => Promise
  updateAction: (id: string, formData: FormData) => Promise
  deleteAction: (id: string) => Promise
}

// Table component interfaces
interface TenantTableProps {
  data: Tenant[]
  onEdit: (tenant: Tenant) => void
  onDelete: (tenantId: string) => void
  searchQuery?: string
  sortField?: keyof Tenant
  sortDirection?: 'asc' | 'desc'
}
```

### Error Handling Patterns
```typescript
// Use toast notifications for user feedback
import { toast } from 'sonner'

try {
  const result = await createTenant(formData)
  toast.success('Mieter erfolgreich erstellt')
  closeModal()
} catch (error) {
  console.error('Error creating tenant:', error)
  toast.error('Fehler beim Erstellen des Mieters')
}

// Server-side error handling
if (error) {
  console.error('Database error:', error)
  return { 
    success: false, 
    error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' 
  }
}
```

### Responsive Design Requirements
```typescript
// Use Tailwind mobile-first approach

  {/* Content */}


// Navigation responsive patterns

  


```

## Database & Supabase Integration

### Database Schema Overview
The application uses PostgreSQL through Supabase with the following core tables:
- `profiles` - User account information and subscription details
- `mieter` - Tenant information and rental history
- `wohnungen` - Apartment details and specifications
- `haeuser` - House/building information
- `finanzen` - Financial transactions and records
- `betriebskosten` - Operating cost calculations
- `aufgaben` - Task management and tracking

### Row Level Security (RLS)
All tables implement RLS policies to ensure data isolation:
```sql
-- Example RLS policy for tenants table
CREATE POLICY "Users can only access their own tenants" ON mieter
  FOR ALL USING (user_id = auth.uid());
```

### Database Migrations
Located in `supabase/migrations/` with timestamp prefixes:
- `20231027000000_create_delete_user_data_trigger.sql` - Implements cascade deletion when user accounts are removed
- `20231027100000_add_trial_fields_to_profiles.sql` - Adds trial period tracking to user profiles

### Supabase Edge Functions
- **delete-user-account** (`supabase/functions/delete-user-account/index.ts`):
  - Handles complete user data deletion
  - Removes all associated records across all tables
  - Cancels active Stripe subscriptions
  - Implements GDPR compliance for data removal

- **stripe-webhook** (`supabase/functions/stripe-webhook/index.ts`):
  - Processes Stripe webhook events
  - Updates subscription status in profiles table
  - Handles payment success/failure events
  - Manages trial period transitions

### Database Connection Patterns
```typescript
// Server-side client (has elevated permissions)
import { createSupabaseServerClient } from '@/lib/supabase-server'

const supabase = createSupabaseServerClient()

// Client-side client (user permissions only)
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
```

### Query Optimization Guidelines
- Always use select() to specify required columns
- Implement proper indexing for frequently queried columns
- Use joins instead of multiple queries where possible
- Implement pagination for large datasets
- For client-side data fetching, use React's built-in hooks (useState, useEffect) with the Supabase client

## Environment Variables & Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_or_live_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_webhook_secret

# Application Configuration

# Optional: Analytics & Monitoring
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA-tracking-id
SENTRY_DSN=sentry-project-dsn
```

### Environment-Specific Configuration
```typescript
// lib/config.ts
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    secretKey: process.env.STRIPE_SECRET_KEY!,
  },
  
  app: {
    maxApartmentsPerTier: {
      trial: 5,
      basic: 25,
      premium: 100,
      enterprise: Infinity,
    },
    trialDurationDays: 14,
  },
} as const
```

## Testing & Quality Assurance

### Testing Strategy
1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - Database operations and API endpoints
3. **E2E Tests** - Critical user workflows
4. **Visual Regression Tests** - UI consistency across browsers

### Test File Organization
```
__tests__/
├── components/           # Component unit tests
├── pages/               # Page integration tests
├── api/                 # API endpoint tests
├── utils/               # Utility function tests
└── e2e/                 # End-to-end test scenarios
```

### Testing Patterns
```typescript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react'
import { TenantTable } from '@/components/tenant-table'

describe('TenantTable', () => {
  it('renders tenant data correctly', () => {
    const mockTenants = [
      { id: '1', name: 'Max Mustermann', email: 'max@example.com' }
    ]
    
    render()
    
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.getByText('max@example.com')).toBeInTheDocument()
  })
})

// Server Action testing example
import { createClient } from '@/utils/supabase/server';
import { handleSubmit } from '@/app/mieter-actions';

describe('Tenant Management', () => {
  it('creates a new tenant', async () => {
    // Create a test form data object
    const formData = new FormData();
    formData.append('name', 'Test Tenant');
    formData.append('email', 'test@example.com');
    formData.append('wohnung_id', 'test-wohnung-id');
    
    // Mock the Supabase client
    jest.mock('@/utils/supabase/server', () => ({
      createClient: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test-tenant-id',
            name: 'Test Tenant',
            email: 'test@example.com',
            wohnung_id: 'test-wohnung-id'
          },
          error: null
        })
      }))
    }));

    // Call the server action
    const result = await handleSubmit(formData);

    // Assert the result
    expect(result).toEqual({
      success: true,
      data: {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        email: 'test@example.com',
        wohnung_id: 'test-wohnung-id'
      }
    });
  });
});
```

### Code Coverage Requirements
- Maintain minimum 80% code coverage for critical business logic
- 100% coverage for utility functions and data validation
- All server actions must have corresponding tests
- Database operations require integration tests

## Troubleshooting Guide

### Common Build Issues
1. **TypeScript Compilation Errors**:
   ```bash
   npm run type-check  # Check for type errors
   # Fix type errors before proceeding
   ```

2. **Missing Environment Variables**:
   ```bash
   # Verify all required env vars are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   # Copy from .env.example if missing
   ```

3. **Dependency Conflicts**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Database Connection Issues
1. **Supabase Connection Failed**:
   - Verify environment variables are correct
   - Check Supabase project status
   - Ensure API keys have correct permissions

2. **Migration Failures**:
   ```bash
   npx supabase db reset  # Reset to clean state
   npx supabase db push   # Reapply migrations
   ```

### Runtime Errors
1. **Authentication Issues**:
   - Check Supabase auth configuration
   - Verify redirect URLs in Supabase dashboard
   - Clear browser cookies and localStorage

2. **Stripe Integration Problems**:
   - Verify webhook endpoints are configured
   - Check Stripe dashboard for failed events
   - Ensure webhook signing secrets match

### Performance Issues
1. **Slow Page Loads**:
   - Check database query performance
   - Implement proper indexing
   - Add loading states and pagination

2. **Large Bundle Sizes**:
   ```bash
   npm run analyze  # Analyze bundle composition
   # Implement dynamic imports for large components
   ```

## Communication & Support Guidelines

### Issue Reporting Format
When encountering issues or needing clarification, provide:

1. **Detailed Context**:
   - Current task or feature being implemented
   - Specific component or file being modified
   - Expected vs. actual behavior

2. **Technical Information**:
   - Error messages (full stack traces)
   - Browser console outputs
   - Network request/response details
   - Environment details (OS, Node version, etc.)

3. **Reproduction Steps**:
   - Step-by-step instructions to reproduce the issue
   - Sample data or inputs used
   - Screenshots or screen recordings if applicable

4. **Investigation Attempts**:
   - What solutions have been tried
   - Documentation or resources consulted
   - Any partial solutions or workarounds discovered

### Code Review Requirements
Before requesting code review:
- Ensure all tests pass
- Verify build completes successfully
- Test functionality manually in development
- Check for accessibility compliance
- Validate responsive design across screen sizes
- Confirm German localization is correct
- Review security implications of changes

### Documentation Updates
When adding new features or modifying existing functionality:
- Update relevant code comments
- Modify this instruction document if patterns change
- Update API documentation for new endpoints
- Add or update test documentation
- Create or update user-facing documentation

This comprehensive instruction set should be followed strictly to maintain code quality, ensure proper functionality, and preserve the architectural integrity of the RMS application. Always prioritize user data security, German business logic compliance, and subscription management accuracy in all development activities.