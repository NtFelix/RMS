# AI Agent Guidelines

This document provides guidelines for AI agents working on this codebase.

## Coding Conventions

- **Import Order**: Please follow the standard TypeScript/JavaScript import order.
  - Built-in modules
  - External modules
  - Internal modules (absolute paths)
  - Relative paths
- **Formatting**: This project uses Prettier for code formatting. Please ensure your contributions are formatted correctly. You can run `npm run format` to format your code.
- **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions (e.g., camelCase for variables and functions, PascalCase for classes and types).

## Running Tests

- To run unit tests, use the command `npm test`.
- Ensure all tests pass before submitting your changes.

## General Workflow

1. Understand the task and ask for clarification if needed.
2. Create a plan and get it approved.
3. Implement the changes, following test-driven development principles where practical.
4. Run tests and ensure they pass.
5. Submit your changes with a clear and concise commit message.

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Testing**: Jest, React Testing Library

## Database Schema

The database schema is defined in the file `supabase/database/schema.sql`.
Migrations are managed by Supabase and are located in the `supabase/migrations` directory. Each migration file represents a version of the database schema.
- **Database Triggers and Functions**: SQL-based database triggers and functions are typically defined within migration files in the `supabase/migrations` directory (e.g., `20231027000000_create_delete_user_data_trigger.sql`).
- **Edge Functions**: Serverless functions (Edge Functions) are written in TypeScript and located in the `supabase/functions/` directory. Each sub-directory within `supabase/functions/` usually represents a separate function (e.g., `supabase/functions/delete-user-account/`).

## Building and Running the Application

- **1. Install Dependencies**: Before anything else, ensure all project dependencies are installed by running:
  ```bash
  npm install
  ```
- **2. Build the Application**: After installing dependencies, build the application to check for compilation errors:
  ```bash
  npm run build
  ```
  This step must complete successfully.
- **3. Running for Development**: For local development, use:
  ```bash
  npm run dev
  ```
- **4. Running a Production-like Preview (Optional but Recommended)**: To test the build in a more production-like environment, you can run:
  ```bash
  npm start
  ```
  (This command usually requires `npm run build` to have been run successfully first).

- **Error Handling and Verification**:
    - All the above commands (`npm install`, `npm run build`, `npm run dev`/`npm start`) must complete without errors before pushing code.
    - If `npm run dev` or `npm start` times out, retry the command up to three times.
    - If timeouts or other errors persist, they **must be fixed**.
    - If `npm run dev` is consistently unreliable, ensure `npm run build` and `npm test` pass as a minimum verification before pushing.
- Only push code that successfully passes these checks.

## Important Notes

- Always check the `README.md` for project-specific instructions.
- Be mindful of existing code patterns and try to maintain consistency.
- If you encounter any issues or have questions, don't hesitate to ask for help.
