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

## Building and Running the Application

- Before pushing any code changes, ensure the application builds and runs correctly.
- Use the command `npm run dev` to start the development server.
- **Error Handling**:
    - If any errors occur during the `npm run dev` process, these errors must be fixed before proceeding.
    - If the `npm run dev` command times out, retry the command up to three times.
    - If timeouts persist after three retries, attempt to verify the application's health using an alternative approach, such as:
        - Running `npm run build` followed by `npm start`.
        - Running linters (e.g., `npm run lint`) and tests (`npm test`) to catch potential issues if the development server is consistently unreliable.
- Only push code that successfully passes these checks.

## Important Notes

- Always check the `README.md` for project-specific instructions.
- Be mindful of existing code patterns and try to maintain consistency.
- If you encounter any issues or have questions, don't hesitate to ask for help.
