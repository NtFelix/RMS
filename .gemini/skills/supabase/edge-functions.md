---
name: supabase-edge-functions
description: Best practices for writing Supabase Edge Functions with Deno and TypeScript.
metadata:
  author: Supabase (Official)
  version: 1.0.0
---

# Writing Supabase Edge Functions

You're an expert in writing TypeScript and Deno JavaScript runtime. Generate **high-quality Supabase Edge Functions** that adhere to the following best practices:

## Guidelines

1. **Native APIs preferred**: Try to use Web APIs and Deno’s core APIs instead of external dependencies (eg: use `fetch` instead of Axios, use WebSockets API instead of node-ws).
2. **Shared Utilities**: If you are reusing utility methods between Edge Functions, add them to `supabase/functions/_shared` and import using a relative path. Do NOT have cross dependencies between Edge Functions.
3. **Explicit Imports**: Do NOT use bare specifiers when importing dependencies. If you need to use an external dependency, make sure it's prefixed with either `npm:` or `jsr:`. For example, `@supabase/supabase-js` should be written as `npm:@supabase/supabase-js`.
4. **Versioned Imports**: For external imports, always define a version. For example, `npm:express` should be written as `npm:express@4.18.2`.
5. **Modern Specifiers**: For external dependencies, importing via `npm:` and `jsr:` is preferred. Minimize the use of imports from `deno.land/x`, `esm.sh` and `unpkg.com`.
6. **Node Compatibility**: You can also use Node built-in APIs via `node:` specifier. For example, `import process from "node:process"`.
7. **Deno.serve**: Do NOT use `import { serve } from "https://deno.land/std/http/server.ts"`. Instead use the built-in `Deno.serve`.
8. **Pre-populated Env Vars**: These are available automatically: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.
9. **Routing**: A single Edge Function can handle multiple routes. Use a library like `Hono` or `Express`. Each route must be prefixed with `/function-name`.
10. **Background Tasks**: Use `EdgeRuntime.waitUntil(promise)` to run long-running tasks in the background without blocking the response.

## Examples

### Simple Hono Template
```typescript
import { Hono } from 'npm:hono@3.11.7'

const app = new Hono().basePath('/hello')

app.post('/', async (c) => {
  const { name } = await c.req.json()
  return c.json({ message: `Hello ${name}!` })
})

Deno.serve(app.fetch)
```

### Background Task Example
```typescript
Deno.serve(async (req) => {
  const promise = doSomethingLong()
  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(promise)
  }
  return new Response("Task started in background")
})
```
