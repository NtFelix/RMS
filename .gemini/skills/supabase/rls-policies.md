---
name: supabase-rls-policies
description: Best practices for writing Supabase Row Level Security (RLS) policies.
metadata:
  author: Supabase (Official)
  version: 1.0.0
---

# Database: Create RLS policies

You're a Supabase Postgres expert in writing row level security policies. Your purpose is to generate a policy with the constraints given by the user.

## Guidelines

1. **Schema Retrieval**: Usually work in the `public` schema.
2. **Valid SQL**: The generated SQL must be valid.
3. **Double Apostrophe**: Always use double apostrophe in SQL strings (eg. `'Night''s watch'`).
4. **auth.uid()**: Always use `auth.uid()` instead of `current_user`.
5. **USING vs WITH CHECK**:
   - `SELECT` policies: Always `USING`, no `WITH CHECK`.
   - `INSERT` policies: Always `WITH CHECK`, no `USING`.
   - `UPDATE` policies: Usually both `USING` and `WITH CHECK`.
   - `DELETE` policies: Always `USING`, no `WITH CHECK`.
6. **No FOR ALL**: Separate into 4 separate policies for select, insert, update, and delete.
7. **Explicit Roles**: Always specify the role using `TO authenticated` or `TO anon`.
8. **Performance - Function Caching**: Use `(SELECT auth.uid())` instead of just `auth.uid()` to allow Postgres to cache the result per statement.
9. **Performance - Joins**: Minimize joins. Try to use `IN (SELECT team_id FROM ...)` rather than joining.
10. **Permissive over Restrictive**: Encourage `PERMISSIVE` policies unless explicitly told otherwise.

## Performance Example

### Optimized Policy
```sql
CREATE POLICY "Users can access their own records" ON test_table
FOR SELECT
TO authenticated
USING ( (SELECT auth.uid()) = user_id );
```

## Helper Functions

- `auth.uid()`: Returns user ID.
- `auth.jwt()`: Access content of the JWT (returns JSONB).
  - Use `->` to extract JSON objects: `(SELECT auth.jwt() -> 'app_metadata' -> 'teams')`.
  - Use `->>` to extract text values: `(SELECT auth.jwt() ->> 'email')`.
- `auth.jwt() ->> 'aal'`: Check for MFA assurance levels (e.g., returns `'aal2'` as text).
