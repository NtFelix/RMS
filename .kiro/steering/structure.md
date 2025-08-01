---
inclusion: always
---

# Project Structure & Conventions

## Architecture Overview

This is a German property management SaaS built with Next.js 15 App Router, TypeScript, Supabase, and Stripe. Follow these patterns when working with the codebase.

## Directory Structure

```
app/
├── (dashboard)/           # Authenticated pages with shared layout
├── auth/                  # Authentication flows
├── api/                   # API routes (REST endpoints)
└── [entity]-actions.ts    # Server actions per entity

components/
├── ui/                    # Shadcn/ui components
├── [entity]-table.tsx     # Data tables per entity
├── [entity]-edit-modal.tsx # Edit modals per entity
└── [entity]-context-menu.tsx # Right-click menus

lib/
├── supabase-server.ts     # Server-side DB client
├── data-fetching.ts       # Shared fetch utilities
└── utils.ts               # Utility functions (cn, etc.)
```

## Naming Conventions

- **Files/Folders**: kebab-case (`tenant-table.tsx`)
- **Components**: PascalCase (`TenantTable`)
- **Functions/Variables**: camelCase (`fetchTenants`)
- **Database Entities**: German terms (Mieter, Wohnungen, Häuser, Finanzen, Betriebskosten, Aufgaben)

## Code Patterns

### Page Structure
```typescript
// Server component pattern
export default async function Page() {
  const data = await fetchFromSupabase()
  return <ClientWrapper data={data} />
}
```

### Modal Management
- Use Zustand store in `use-modal-store.tsx`
- All modals rendered in dashboard layout
- Pass server actions as props to modals

### Server Actions
- Located in `app/[entity]-actions.ts`
- Handle form submissions and mutations
- Use `revalidatePath()` after mutations

### Data Fetching
- Server components: Direct Supabase calls
- Client components: Use shared utilities from `/lib/data-fetching.ts`
- Always handle loading and error states

## Key Rules

1. **German Domain Language**: Use German terms for business entities (Mieter, Wohnungen, etc.)
2. **Path Aliases**: Use `@/` for imports (`@/components`, `@/lib`)
3. **Type Safety**: Import types from `@/types/supabase.ts`
4. **Modal Props**: Always include server actions in modal interfaces
5. **Responsive Design**: Use Tailwind mobile-first approach
6. **Error Handling**: Use toast notifications for user feedback