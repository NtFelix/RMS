# Final Deployment Checklist ✅

## Pre-Deployment Verification

### Local Testing
- [x] Next.js 16.0.1 installed
- [x] Build succeeds: `npm run build`
- [x] Dev server works: `npm run dev`
- [x] proxy.ts exists with correct function name
- [x] No edge runtime conflicts

### Files Ready
- [x] `proxy.ts` - Next.js 16 proxy configuration
- [x] `next.config.mjs` - Standalone output configured
- [x] `wrangler.toml` - Cloudflare Workers config created
- [x] `package.json` - Updated with deployment scripts
- [x] Documentation files created

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "feat: upgrade to Next.js 16 with Cloudflare configuration"
git push origin main
```

### 2. Cloudflare Pages Configuration

Go to: https://dash.cloudflare.com → Pages → Your Project

**Build Settings**:
- [ ] Framework: Next.js
- [ ] Build command: `npm run build`
- [ ] Build output directory: `.next`
- [ ] Root directory: `/` (empty)
- [ ] Node version: 18 or higher

**Environment Variables** (verify these are set):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `POSTHOG_PERSONAL_API_KEY` (optional)
- [ ] `POSTHOG_ENV_ID` (optional)
- [ ] `POSTHOG_HOST` (optional)

### 3. Monitor Deployment

- [ ] Build starts automatically
- [ ] Build completes successfully
- [ ] Deployment goes live
- [ ] No errors in build logs

## Post-Deployment Testing

### Critical Paths
- [ ] Landing page loads: `https://your-domain.pages.dev/landing`
- [ ] Can access login page
- [ ] Can log in with credentials
- [ ] Dashboard loads after login
- [ ] Proxy redirects work (try accessing protected route while logged out)

### Authentication Flow
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect to login
- [ ] Public routes accessible without auth
- [ ] Session persists across page reloads

### Subscription Check
- [ ] Active subscription can access dashboard
- [ ] Inactive subscription redirects to subscription-locked
- [ ] Trial subscription works correctly

### API Endpoints
- [ ] `/api/health` returns 200
- [ ] `/api/user/profile` returns user data
- [ ] `/api/mieter` works
- [ ] `/api/wohnungen` works
- [ ] `/api/haeuser` works
- [ ] `/api/finanzen` works

### Stripe Integration
- [ ] Can view subscription plans
- [ ] Can create checkout session
- [ ] Webhook endpoint accessible
- [ ] Payment methods load
- [ ] Customer portal works

### Core Features
- [ ] Can create tenant
- [ ] Can edit tenant
- [ ] Can delete tenant
- [ ] Can create apartment
- [ ] Can view finances
- [ ] Can upload documents
- [ ] Search works

### Performance
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Images load correctly
- [ ] No console errors
- [ ] No 404 errors

### Mobile
- [ ] Responsive design works
- [ ] Touch interactions work
- [ ] Navigation works
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
- Check build logs for error
- Fix the issue
- Commit and push again

## Post-Deployment Configuration

### Stripe Webhook URL
Update in Stripe Dashboard:
```
https://your-domain.pages.dev/api/stripe/webhook
```

### Supabase Redirect URLs
Add to Supabase Auth settings:
```
https://your-domain.pages.dev/auth/callback
https://your-domain.pages.dev/auth/login
```

### Custom Domain (Optional)
- [ ] Add custom domain in Cloudflare Pages
- [ ] Update DNS records
- [ ] Update Stripe webhook URL
- [ ] Update Supabase redirect URLs

## Documentation Reference

Quick links to documentation:
- `DEPLOY_NOW.md` - Quick deployment guide
- `NEXTJS_16_CLOUDFLARE_READY.md` - Complete overview
- `CLOUDFLARE_WORKERS_SETUP.md` - Advanced configuration
- `NEXTJS_16_UPGRADE.md` - Upgrade details

## Success Criteria

✅ All checks passed:
- Build completes without errors
- Application loads correctly
- Authentication works
- All critical features work
- No console errors
- Performance is acceptable

## Sign-off

- [ ] All tests passed
- [ ] No blocking issues
- [ ] Ready for production use

**Deployed by**: _______________
**Date**: _______________
**Deployment URL**: _______________
**Status**: ⬜ Success ⬜ Failed ⬜ Rolled Back

---

**Next.js Version**: 16.0.1
**Platform**: Cloudflare Pages
**Status**: Ready to Deploy 🚀
