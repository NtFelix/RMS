# AGENTS.md

This document provides guidance for AI agents working with this codebase.

## Project Overview

This project is a web application designed to help users manage their properties, tenants, and finances. It is built using Next.js, TypeScript, Tailwind CSS, and Supabase.

## Development Workflow

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build the project:
    ```bash
    npm run build
    ```

### Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

**Important:** Before pushing any code to GitHub, ensure that the application builds and runs correctly.

### Troubleshooting Build/Run Issues

-   If the `npm run dev` command times out, retry it up to 3 times.
-   If errors persist after retrying, investigate the error messages and attempt to fix them.
-   If you are unable to resolve the errors, try a different approach to test the application's functionality before pushing the code. This might involve running specific tests or manually verifying critical features.

## Supabase Database

The `supabase/` directory contains information about the project's database schema, triggers, and functions.

-   **`supabase/database/schema.sql`**: Defines the database schema.
-   **`supabase/migrations/`**: Contains database migration files. These files track changes to the database schema over time.
    -   `20231027000000_create_delete_user_data_trigger.sql`: This migration likely creates a trigger that handles data cleanup when a user account is deleted.
    -   `20231027100000_add_trial_fields_to_profiles.sql`: This migration adds fields related to user trial periods to the `profiles` table.
-   **`supabase/functions/`**: Contains serverless functions.
    -   `delete-user-account/index.ts`: This function is likely responsible for deleting user data when an account is closed.
    -   `stripe-webhook/index.ts`: This function handles webhooks from Stripe, likely for managing subscriptions and payments.

## Coding Conventions

-   Follow standard TypeScript and React best practices.
-   Use Prettier for code formatting (if configured).
-   Write clear and concise commit messages.

## Testing

-   Write unit tests for new features and bug fixes.
-   Ensure all tests pass before pushing code.

## Communication

If you encounter any issues or have questions, please provide detailed information to the user.
