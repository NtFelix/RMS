# Cloudflare Workers Setup for Next.js 16

## Overview

This guide sets up Mietfluss (RMS) to deploy on Cloudflare Workers using Wrangler, which provides better Next.js 16 support than the deprecated `@cloudflare/next-on-pages`.

## Prerequisites

1. **Cloudflare Account**: https://dash.cloudflare.com
2. **Wrangler CLI**: Install globally
   ```bash
   npm install -g wrangler
   ```
3. **Domain** (optional): Configure in Cloudflare

## Configuration Files

### 1. wrangler.toml
✅ Created - Main Cloudflare Workers configuration

### 2. next.config.mjs
✅ Updated - Added `output: 'standalone'` for Workers compatibility

### 3. proxy.ts
✅ Ready - Next.js 16 proxy configuration (runs on Node.js runtime in Workers)

## Deployment Options

### Option A: Cloudflare Pages (Recommended for Now)

Keep using Cloudflare Pages but with updated build command:

**In Cloudflare Pages Dashboard**:
1. Go to your project settings
2. Update **Build command**:
   ```bash
   npm run build
   ```
3. Update **Build output directory**:
   ```
   .next
   ```
4. **Framework preset**: Next.js

**Note**: Cloudflare Pages will handle the Next.js 16 proxy automatically without requiring edge runtime.

### Option B: Cloudflare Workers (Advanced)

Deploy directly to Cloudflare Workers:

1. **Login to Wrangler**:
   ```bash
   wrangler login
   ```

2. **Update wrangler.toml** with your account ID:
   ```toml
   account_id = "your-account-id"
   ```

3. **Deploy**:
   ```bash
   wrangler deploy
   ```

### Option C: Hybrid (Pages + Workers)

Use Pages for static content and Workers for API routes:

1. Deploy to Pages (Option A)
2. Create separate Workers for heavy API routes
3. Use service bindings to connect them

## Environment Variables

### Required Variables

Set these in Cloudflare Dashboard or via Wrangler:

```bash
# Supabase
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Stripe
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# PostHog (optional)
wrangler secret put POSTHOG_PERSONAL_API_KEY
wrangler secret put POSTHOG_ENV_ID
wrangler secret put POSTHOG_HOST
```

### Via Dashboard

1. Go to Workers & Pages
2. Select your project
3. Settings → Environment Variables
4. Add each variable

## Build Configuration

### package.json Scripts

Current configuration:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### For Cloudflare Workers

Add these scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production"
  }
}
```

## Proxy Configuration

The Next.js 16 proxy runs on **Node.js runtime** in Cloudflare Workers, which is supported via the `nodejs_compat` flag in wrangler.toml.

**proxy.ts** is configured correctly:
- ✅ No edge runtime declaration (not needed)
- ✅ Uses Node.js compatible APIs
- ✅ Supabase SSR client (Workers compatible)
- ✅ Authentication and subscription checks

## Testing Locally

### With Wrangler Dev

```bash
wrangler dev
```

This starts a local Workers environment.

### With Next.js Dev

```bash
npm run dev
```

Standard Next.js development server.

## Deployment Steps

### Initial Setup

1. **Login to Wrangler**:
   ```bash
   wrangler login
   ```

2. **Get Account ID**:
   ```bash
   wrangler whoami
   ```

3. **Update wrangler.toml**:
   ```toml
   account_id = "your-account-id-here"
   ```

### Deploy to Cloudflare Pages

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: configure for Cloudflare Workers deployment"
   git push
   ```

2. **Cloudflare Pages will auto-deploy**

3. **Monitor build** in dashboard

### Deploy to Cloudflare Workers

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   ```bash
   wrangler deploy
   ```

3. **Verify**:
   ```bash
   wrangler tail
   ```

## Troubleshooting

### Build Fails

**Issue**: Next.js build fails
**Solution**: Check build logs, ensure all dependencies are installed

### Proxy Not Working

**Issue**: Authentication redirects fail
**Solution**: Verify proxy.ts is in root directory and properly configured

### Environment Variables Missing

**Issue**: Supabase/Stripe errors
**Solution**: Set all required secrets via `wrangler secret put`

### Node.js Compatibility

**Issue**: Node.js APIs not available
**Solution**: Ensure `nodejs_compat` flag is set in wrangler.toml

## Performance Optimization

### Caching

Add KV namespace for caching:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

### Image Optimization

Use Cloudflare Images:

```javascript
// lib/cloudflare-image-loader.js
export default function cloudflareLoader({ src, width, quality }) {
  const params = [`width=${width}`]
  if (quality) {
    params.push(`quality=${quality}`)
  }
  const paramsString = params.join(',')
  return `/cdn-cgi/image/${paramsString}/${src}`
}
```

### Edge Caching

Configure cache headers in proxy.ts:

```typescript
response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
```

## Monitoring

### Wrangler Tail

Real-time logs:
```bash
wrangler tail
```

### Cloudflare Analytics

View in dashboard:
- Workers Analytics
- Web Analytics
- Performance metrics

### Custom Logging

Add to proxy.ts:
```typescript
console.log('[Proxy]', {
  path: request.nextUrl.pathname,
  method: request.method,
  timestamp: new Date().toISOString()
})
```

## Migration from Pages to Workers

If you want to fully migrate:

1. **Test locally** with `wrangler dev`
2. **Deploy to staging** environment
3. **Update DNS** to point to Workers
4. **Monitor** for issues
5. **Rollback** if needed (keep Pages deployment)

## Cost Considerations

### Cloudflare Pages (Free Tier)
- 500 builds/month
- Unlimited requests
- Unlimited bandwidth

### Cloudflare Workers (Free Tier)
- 100,000 requests/day
- 10ms CPU time per request
- Upgrade to Paid for more

### Recommendation
Start with **Cloudflare Pages** (Option A) - it's free and works well with Next.js 16.

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Node.js Compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

---

**Status**: ✅ Configured for Cloudflare deployment
**Next.js Version**: 16.0.1
**Deployment Method**: Cloudflare Pages (recommended) or Workers
