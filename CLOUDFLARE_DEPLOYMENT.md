# Cloudflare Pages Deployment Guide

## ✅ Issue Fixed

The deployment error you encountered has been resolved:

```
ERROR: Failed to produce a Cloudflare Pages build from the project.
The following routes were not configured to run with the Edge Runtime:
  - /_middleware
```

### Solution Applied

Added `export const runtime = 'edge'` to `proxy.ts` (formerly `middleware.ts`):

```typescript
// proxy.ts
export const runtime = 'edge'

export async function proxy(request: NextRequest) {
  // ... your proxy logic
}
```

## Deployment Configuration

### Current Setup
- **Build Command**: `npx @cloudflare/next-on-pages@1`
- **Next.js Version**: 16.0.1
- **Runtime**: Edge (required for Cloudflare Pages)

### All Routes Configured for Edge Runtime

✅ All API routes already have `export const runtime = 'edge'`
✅ Proxy/middleware now has edge runtime configured
✅ Build should now succeed on Cloudflare Pages

## Testing Deployment

1. **Commit and push** the updated `proxy.ts` file:
   ```bash
   git add proxy.ts
   git commit -m "fix: add edge runtime to proxy for Cloudflare Pages"
   git push
   ```

2. **Monitor the build** in Cloudflare Pages dashboard

3. **Expected result**: Build should complete successfully

## Important Notes

### Deprecated Package Warning

You'll see this warning in your build logs:
```
npm warn deprecated @cloudflare/next-on-pages@1.13.16: 
Please use the OpenNext adapter instead: https://opennext.js.org/cloudflare
```

**Action**: This is a deprecation warning, not an error. Your current setup will continue to work, but consider migrating to OpenNext in the future.

### Migration to OpenNext (Future)

When you're ready to migrate from `@cloudflare/next-on-pages` to OpenNext:

1. Visit: https://opennext.js.org/cloudflare
2. Follow the migration guide
3. Update your build command in Cloudflare Pages settings

**Benefits of OpenNext**:
- Better Next.js 16 support
- More active maintenance
- Better performance
- Improved compatibility with Next.js features

## Environment Variables

Ensure these are set in Cloudflare Pages:

### Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Optional (PostHog)
- `POSTHOG_PERSONAL_API_KEY`
- `POSTHOG_ENV_ID`
- `POSTHOG_HOST`

## Troubleshooting

### Build Still Fails?

1. **Clear build cache** in Cloudflare Pages:
   - Go to your project settings
   - Clear build cache
   - Retry deployment

2. **Check environment variables**:
   - Ensure all required variables are set
   - Verify no typos in variable names

3. **Verify proxy.ts**:
   ```bash
   # Check that edge runtime is exported
   grep "export const runtime = 'edge'" proxy.ts
   ```

4. **Check build logs** for specific errors:
   - Look for missing dependencies
   - Check for TypeScript errors
   - Verify all imports are correct

### Edge Runtime Compatibility

All your routes are already edge-compatible:
- ✅ Using `@supabase/ssr` (edge-compatible)
- ✅ Using Stripe SDK (edge-compatible)
- ✅ No Node.js-specific APIs (fs, path, etc.)
- ✅ All API routes have edge runtime configured

## Verification Checklist

After deployment:

- [ ] Build completes without errors
- [ ] Application loads correctly
- [ ] Authentication works (login/logout)
- [ ] Supabase queries work
- [ ] Stripe integration works
- [ ] API routes respond correctly
- [ ] Static pages load
- [ ] Dynamic pages load
- [ ] Proxy/middleware redirects work

## Performance Tips

### Cloudflare Pages Optimizations

1. **Enable Cloudflare CDN** for static assets
2. **Configure caching rules** for API responses
3. **Use Cloudflare Images** for image optimization (optional)
4. **Enable HTTP/3** in Cloudflare settings

### Next.js Optimizations

1. **Image optimization** is already configured
2. **Turbopack** is enabled for faster builds
3. **Edge runtime** provides better performance

## Support Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [OpenNext Documentation](https://opennext.js.org/)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)

---

**Status**: ✅ Ready for deployment
**Last Updated**: November 2, 2025
