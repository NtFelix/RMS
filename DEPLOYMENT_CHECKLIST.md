# Deployment Checklist for Cloudflare Pages

## Pre-Deployment

### Code Changes
- [x] Renamed `middleware.ts` to `proxy.ts`
- [x] Updated function name from `middleware` to `proxy`
- [x] Added `export const runtime = 'edge'` to proxy.ts
- [x] Updated `headers()` API to use `await`
- [x] Updated Next.js configuration for v16
- [x] Updated package.json scripts
- [ ] Commit all changes
- [ ] Push to GitHub

### Environment Variables (Cloudflare Pages)

#### Required - Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Required - Stripe
- [ ] `STRIPE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`

#### Optional - PostHog Analytics
- [ ] `POSTHOG_PERSONAL_API_KEY`
- [ ] `POSTHOG_ENV_ID`
- [ ] `POSTHOG_HOST`

## Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "fix: upgrade to Next.js 16 and add edge runtime for Cloudflare"
git push origin main
```

### 2. Monitor Build
- [ ] Go to Cloudflare Pages dashboard
- [ ] Watch build logs
- [ ] Verify build completes successfully
- [ ] Check for any warnings or errors

### 3. Expected Build Output
```
✓ Compiled successfully
✓ Generating static pages
✓ Finalizing page optimization
✓ Completed build
```

## Post-Deployment Testing

### Critical Paths

#### Authentication Flow
- [ ] Visit landing page
- [ ] Click login
- [ ] Enter credentials
- [ ] Successfully log in
- [ ] Dashboard loads
- [ ] Log out works
- [ ] Redirects to login when accessing protected route

#### Subscription Check
- [ ] Active subscription can access dashboard
- [ ] Inactive subscription redirects to subscription-locked
- [ ] Trial subscription works correctly
- [ ] Subscription status displays correctly

#### API Endpoints
- [ ] `/api/health` returns 200
- [ ] `/api/user/profile` returns user data
- [ ] `/api/mieter` (tenants) works
- [ ] `/api/wohnungen` (apartments) works
- [ ] `/api/haeuser` (houses) works
- [ ] `/api/finanzen` (finances) works

#### Stripe Integration
- [ ] Can view subscription plans
- [ ] Can create checkout session
- [ ] Webhook endpoint is accessible
- [ ] Payment methods load
- [ ] Customer portal works

#### Core Features
- [ ] Dashboard displays correctly
- [ ] Can create new tenant
- [ ] Can edit tenant
- [ ] Can delete tenant
- [ ] Can create new apartment
- [ ] Can view financial records
- [ ] Can upload documents
- [ ] Search functionality works

### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Images load correctly
- [ ] No console errors
- [ ] No 404 errors

### Mobile Testing
- [ ] Responsive design works
- [ ] Touch interactions work
- [ ] Navigation menu works
- [ ] Forms are usable

## Rollback Plan

If deployment fails:

### Option 1: Revert Commit
```bash
git revert HEAD
git push origin main
```

### Option 2: Redeploy Previous Version
- Go to Cloudflare Pages dashboard
- Find previous successful deployment
- Click "Rollback to this deployment"

### Option 3: Fix Forward
- Check build logs for specific error
- Fix the issue
- Commit and push again

## Common Issues

### Build Fails with Edge Runtime Error
**Solution**: Verify `proxy.ts` has `export const runtime = 'edge'`

### Environment Variables Not Found
**Solution**: Check Cloudflare Pages settings → Environment variables

### Supabase Connection Fails
**Solution**: Verify Supabase URL and keys are correct

### Stripe Webhook Fails
**Solution**: Update webhook URL in Stripe dashboard to new Cloudflare URL

### 404 on API Routes
**Solution**: Check that all API routes have `export const runtime = 'edge'`

## Post-Deployment Configuration

### Stripe Webhook URL
Update in Stripe Dashboard:
```
https://your-app.pages.dev/api/stripe/webhook
```

### Supabase Redirect URLs
Add to Supabase Auth settings:
```
https://your-app.pages.dev/auth/callback
https://your-app.pages.dev/auth/login
```

### Custom Domain (Optional)
- [ ] Add custom domain in Cloudflare Pages
- [ ] Update DNS records
- [ ] Update environment variables if needed
- [ ] Update Stripe webhook URL
- [ ] Update Supabase redirect URLs

## Monitoring

### First 24 Hours
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Review user feedback
- [ ] Check analytics

### First Week
- [ ] Review performance metrics
- [ ] Check for any edge cases
- [ ] Monitor subscription conversions
- [ ] Review Stripe webhook logs

## Documentation

- [x] CLOUDFLARE_FIX_SUMMARY.md - Quick fix overview
- [x] CLOUDFLARE_DEPLOYMENT.md - Detailed deployment guide
- [x] NEXTJS_16_UPGRADE.md - Next.js 16 upgrade details
- [x] UPGRADE_SUMMARY.md - All changes summary

## Success Criteria

✅ Build completes without errors
✅ All critical paths work
✅ No console errors
✅ Performance is acceptable
✅ Users can log in and use the app
✅ Stripe integration works
✅ Supabase queries work

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Build Number**: _____________
**Status**: ⬜ Success ⬜ Failed ⬜ Rolled Back
