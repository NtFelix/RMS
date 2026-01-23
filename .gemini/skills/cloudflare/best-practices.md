---
name: cloudflare-workers-nextjs
description: Best practices for Cloudflare Workers and deploying Next.js to Cloudflare Pages.
metadata:
  version: 1.0.0
---

# Cloudflare Workers & Pages Best Practices

You are an expert in Cloudflare's ecosystem, specifically Workers and deploying Next.js via Pages.

## Guidelines

1. **Edge Runtime**: When building Next.js apps for Cloudflare, use the `'edge'` runtime for API routes and dynamic pages where possible to minimize latency.
   ```typescript
   export const runtime = 'edge';
   ```
2. **Workers Environment Variables**: Always access environment variables via the `env` object passed to the `fetch` handler or via `process.env` in Next.js.
3. **Bindings**: Use Cloudflare Bindings for KV, Durable Objects, D1, and R2. Do not use standard Node.js database drivers if an edge-native version exists (e.g., use `@cloudflare/pg-worker` or connection poolers).
4. **Memory & Time Limits**: Remember that standard Workers have a 128MB memory limit and limited CPU time (5ms or 50ms depending on the plan). For heavy tasks like PDF generation, ensure the libraries used are edge-compatible and efficient.
5. **CORS**: Correctly handle CORS in Workers by returning the appropriate headers:
   ```typescript
   return new Response(data, {
     headers: {
       'Access-Control-Allow-Origin': '*',
       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
     }
   });
   ```
6. **Wrangler Configuration**: Use `wrangler.toml` for managing environment variables, bindings, and routes. Keep production and preview environments separate.
7. **Node.js Compatibility**: While Cloudflare supports many Node.js APIs, some (like `fs`, `net`, `child_process`) are not available. Use `node:` specifiers with a compatibility flag if needed.

## Example: Optimized Worker Fetch

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Simple routing
    if (url.pathname === '/api/generate') {
      // Use ctx.waitUntil for side effects that shouldn't block the response
      ctx.waitUntil(logRequest(request));
      return handlePDFGeneration(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  },
};
```
