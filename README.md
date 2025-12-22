# Mietevo - Property Management System

Mietevo is a comprehensive property management SaaS application tailored for the German market. It provides tools for managing tenants (Mieter), apartments (Wohnungen), houses (Häuser), finances (Finanzen), and operating costs (Betriebskosten).

## Tech Stack

The application is built with a modern stack emphasizing performance, type safety, and developer experience:

-   **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
-   **Frontend:** [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/)
-   **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, Storage)
-   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
-   **Validation:** [Zod](https://zod.dev/)
-   **Payments:** [Stripe](https://stripe.com/)
-   **Analytics:** [PostHog](https://posthog.com/)
-   **Testing:** [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Playwright](https://playwright.dev/)

## Prerequisites

-   Node.js (v20 or higher recommended)
-   npm

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd mietevo
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Environment Variables

Create a `.env.local` file in the root directory. You will need credentials for Supabase, Stripe, and PostHog.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SIGNING_SECRET=your_stripe_webhook_signing_secret

# PostHog (Analytics)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=your_posthog_host
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Scripts

-   `npm run dev`: Starts the development server with TurboPack.
-   `npm run build`: Builds the application for production.
-   `npm start`: Starts the production server.
-   `npm run lint`: Runs ESLint to check for code quality issues.
-   `npm test`: Runs the Jest test suite.

## Project Structure

-   **`app/`**: Next.js App Router directory. Contains pages, layouts, and API routes.
    -   `app/(dashboard)`: Protected dashboard routes.
    -   `app/[entity]-actions.ts`: Server Actions for business logic (e.g., `mieter-actions.ts`).
-   **`components/`**: Reusable React components.
    -   `components/ui/`: Shadcn/ui primitives.
-   **`lib/`**: Backend utilities and service configurations (Supabase, Stripe).
-   **`utils/`**: General utility functions (calculations, formatting).
-   **`types/`**: TypeScript type definitions.
    -   `types/supabase.ts`: Generated database types.
-   **`supabase/`**: Database migrations and configuration.
-   **`public/`**: Static assets.

## Architecture & Conventions

### Server vs. Client Components
The application leverages Next.js Server Components for data fetching and initial rendering. Client Components (`'use client'`) are used for interactive elements.

### Server Actions
Data mutations (Create, Update, Delete) are handled via Server Actions located in `app/[entity]-actions.ts` files. These actions handle validation, database interaction, and revalidation.

### Database & Domain Language
While the code and documentation are in English, the database schema and business logic concepts use **German** terminology to match the domain:
-   `Mieter` (Tenant)
-   `Wohnung` (Apartment)
-   `Haus` (House)
-   `Betriebskosten` (Operating Costs)

### Deployment
The project is configured for deployment on Cloudflare Pages. API routes and Edge Functions should be compatible with the Edge Runtime where specified.

## Testing

The project maintains a comprehensive test suite.

-   **Unit & Integration Tests**: Run via Jest.
    ```bash
    npm test
    ```
-   **Frontend Verification**: Playwright scripts are used for end-to-end verification.

## License

Private
