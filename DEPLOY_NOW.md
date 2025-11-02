# Deploy to Cloudflare Pages Now 🚀

## Quick Start (5 minutes)

Your project is now configured for Next.js 16 with Cloudflare Pages.

### Step 1: Commit Changes

```bash
git add .
git commit -m "feat: upgrade to Next.js 16 with Cloudflare Workers config"
git push
```

### Step 2: Update Cloudflare Pages Settings

Go to your Cloudflare Pages project dashboard and update:

**Build Configuration**:
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (leave empty)

**Environment Variables** (if not already set):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `POSTHOG_PERSONAL_API_KEY` (optional)
- `POSTHOG_ENV_ID` (optional)
- `POSTHOG_HOST` (optional)

### Step 3: Deploy

Cloudflare Pages will automatically deploy when you push to GitHub.

**Monitor the build**:
1. Go to Cloudflare Pages dashboard
2. Click on your project
3. View the latest deployment

### Expected Result

✅ Build completes successfully
✅ Next.js 16.0.1 detected
✅ Proxy runs on Node.js runtime (automatic)
✅ All routes work correctly

## What Changed

### Files Updated
1. ✅ **next.config.mjs** - Added `output: 'standalone'`
2. ✅ **proxy.ts** - Next.js 16 proxy (no edge runtime needed)
3. ✅ **package.json** - Next.js 16.0.1 + deployment scripts
4. ✅ **wrangler.toml** - Created for future Workers deployment

### Key Points

- **Next.js 16**: Fully upgraded
- **Proxy**: Runs on Node.js runtime (Cloudflare handles this automatically)
- **No edge runtime**: Not needed for proxy in Next.js 16
- **Cloudflare Pages**: Fully compatible

## Verification Checklist

After deployment:

- [ ] Site loads at your Cloudflare Pages URL
- [ ] Landing page displays correctly
- [ ] Can log in
- [ ] Dashboard loads
- [ ] API routes work
- [ ] Stripe integration works
- [ ] File uploads work
- [ ] No console errors

## If Build Fails

### Check Build Logs

Look for specific errors in Cloudflare Pages build logs.

### Common Issues

1. **Environment variables missing**
   - Solution: Add all required variables in Cloudflare Pages settings

2. **Build timeout**
   - Solution: Increase build timeout in Cloudflare settings

3. **Memory issues**
   - Solution: Contact Cloudflare support for increased limits

## Alternative: Deploy to Cloudflare Workers

If you want to use Cloudflare Workers instead of Pages:

```bash
# Install Wrangler globally
npm install -g wrangler

# Login
wrangler login

# Deploy
npm run deploy
```

See `CLOUDFLARE_WORKERS_SETUP.md` for detailed instructions.

## Need Help?

Check these files:
- `CLOUDFLARE_WORKERS_SETUP.md` - Complete setup guide
- `wrangler.toml` - Cloudflare Workers configuration
- `NEXTJS_16_UPGRADE.md` - Next.js 16 upgrade details

---

**Status**: ✅ Ready to deploy
**Next.js**: 16.0.1
**Platform**: Cloudflare Pages
**Action**: Commit and push to deploy
