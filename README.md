# Rent-Managing-System (RMS)

Das Rent-Managing-System oder auch RMS ist dazu da um Mieteingänge, Mieter und Wohnungen zu verwalten. 

Es ist mit einer Supabase Datenbank verbunden um alle Daten zentral zu speichern und einen einfachen Zugriff auf die Daten zu ermöglichen. Diese Daten werden im Webbrowser über html, css und in Kombination mit javascript verwaltet.

## Installation

```bash
npm install
```

## Starten

```bash
npm run dev
```

## Deployment

```bash
npm run build
npm run start
```

## Environment Variables

To run this project, you will need to set up the following environment variables. It's recommended to create a `.env.local` file in the root of your project for local development. This file should be included in your `.gitignore`.

-   `NEXT_PUBLIC_SUPABASE_URL`: The URL for your Supabase project.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for your Supabase project, used for client-side access.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project. This key has elevated privileges and should be used carefully, typically for backend operations or serverless functions (e.g., the Stripe webhook Supabase Edge Function).
-   `STRIPE_SECRET_KEY`: Your Stripe secret key (e.g., `sk_test_...` or `sk_live_...`). This is used for all backend Stripe API interactions.
-   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (e.g., `pk_test_...` or `pk_live_...`). This is used by Stripe.js on the frontend.
-   `STRIPE_WEBHOOK_SIGNING_SECRET`: Your Stripe webhook signing secret (e.g., `whsec_...`). This is used to verify the authenticity of webhooks received from Stripe, specifically in the Supabase `stripe-webhook` Edge Function.

Example `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SIGNING_SECRET=your_stripe_webhook_signing_secret
```

## Stripe Configuration

For the subscription plans and their associated features/limits to function correctly within the application, specific metadata fields must be configured on your Stripe Price objects.

When creating or updating products and their prices in your Stripe Dashboard:

-   **On the Price object (or its associated Product object as a fallback):**
    -   `features`: Add a metadata field with the key `features`. Its value should be a comma-separated string detailing the features of the plan. For example: `"Access to core features,Up to 5 projects,Basic email support"`. The application will parse this string into a list of features to display to the user.
    -   `limit_wohnungen`: Add a metadata field with the key `limit_wohnungen`. Its value should be a string representing the maximum number of 'Wohnungen' (apartments/listings) allowed for this plan. For example: `"5"`, `"10"`, `"25"`.
        -   If this field is missing, not a valid number, or set to `"0"` (or a negative number), the current backend implementation may interpret this as allowing an unlimited number of 'Wohnungen'. This behavior should be kept in mind when setting up plans.

Ensuring this metadata is correctly set in Stripe is crucial for the dynamic display of plan details and for the enforcement of plan limits (like the 'Wohnungen' count).

## Lizenz

MIT

## Quellen

- [Supabase](https://supabase.com/)
- [Next.js](https://nextjs.org/)
- [Shadcn](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prisma](https://www.prisma.io/)
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
