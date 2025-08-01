# Technology Stack

## Framework & Runtime
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety throughout
- **Node.js** - Runtime environment

## Database & Backend
- **Supabase** - PostgreSQL database with real-time features
- **Supabase Auth** - Authentication and user management
- **Stripe** - Payment processing and subscription management

## UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless component primitives
- **Shadcn/ui** - Pre-built component library
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **next-themes** - Dark/light theme support

## State Management & Forms
- **Zustand** - Global state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Data Visualization & Export
- **Recharts** - Chart components
- **jsPDF** - PDF generation
- **Papa Parse** - CSV parsing

## Development & Testing
- **Jest** - Testing framework
- **Testing Library** - Component testing utilities
- **ESLint** - Code linting

## Common Commands

```bash
# Development
npm run dev          # Start development server with Turbo
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test            # Run Jest tests

# Environment Setup
cp .env.example .env.local  # Copy environment template
```

## Key Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SIGNING_SECRET` - Stripe webhook secret