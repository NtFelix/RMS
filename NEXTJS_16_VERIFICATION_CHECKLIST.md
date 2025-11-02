# Next.js 16 Verification Checklist

Use this checklist to verify your Next.js 16 upgrade is working correctly.

## ✅ Build & Development

- [x] **Build succeeds**: `npm run build` completes without errors
- [x] **Dev server starts**: `npm run dev` starts successfully
- [ ] **Production server starts**: `npm run start` (after build)

## 🔐 Authentication & Authorization (Proxy)

Test these flows to ensure the renamed proxy file works correctly:

- [ ] **Login flow**: Can log in successfully
- [ ] **Logout flow**: Can log out successfully
- [ ] **Protected routes**: Redirects to login when not authenticated
- [ ] **Public routes**: Can access landing page without authentication
- [ ] **Subscription check**: Redirects to subscription-locked when subscription is inactive
- [ ] **API authentication**: API routes return 401 when not authenticated

## 💳 Stripe Integration

Verify webhook handling with the updated async headers API:

- [ ] **Checkout session**: Can create a checkout session
- [ ] **Webhook processing**: Stripe webhooks are received and processed
- [ ] **Subscription updates**: Subscription status updates correctly
- [ ] **Payment methods**: Can view and manage payment methods
- [ ] **Customer portal**: Can access Stripe customer portal

## 🏠 Core Features

Test main application features:

- [ ] **Dashboard loads**: Main dashboard displays correctly
- [ ] **Mieter (Tenants)**: Can view, create, edit, delete tenants
- [ ] **Wohnungen (Apartments)**: Can view, create, edit, delete apartments
- [ ] **Häuser (Houses)**: Can view, create, edit, delete houses
- [ ] **Finanzen (Finances)**: Can view and manage financial records
- [ ] **Betriebskosten**: Operating costs calculations work
- [ ] **Dateien (Files)**: File management works correctly
- [ ] **Dokumentation**: Documentation pages load

## 🎨 UI & Performance

- [ ] **Responsive design**: Works on mobile, tablet, desktop
- [ ] **Turbopack speed**: Notice faster build and dev server startup
- [ ] **No console errors**: Check browser console for errors
- [ ] **Images load**: All images display correctly
- [ ] **Modals work**: All modals open and close properly

## 🧪 Testing

- [ ] **Unit tests pass**: `npm test` runs successfully
- [ ] **No TypeScript errors**: Check for type issues (if not ignoring)
- [ ] **No ESLint errors**: Check for linting issues (if not ignoring)

## 📊 Analytics & Monitoring

- [ ] **PostHog tracking**: Analytics events are being sent
- [ ] **Error tracking**: Errors are being logged correctly

## 🔍 Edge Cases

- [ ] **Session expiry**: Handles expired sessions correctly
- [ ] **Network errors**: Graceful error handling
- [ ] **Concurrent requests**: Multiple API calls work correctly
- [ ] **File uploads**: Large file uploads work
- [ ] **PDF generation**: PDF exports work correctly

## 🚀 Deployment

Before deploying to production:

- [ ] **Environment variables**: All env vars are set correctly
- [ ] **Database migrations**: All migrations are applied
- [ ] **Stripe webhooks**: Webhook endpoint is configured in Stripe dashboard
- [ ] **Build on CI/CD**: Build succeeds in your CI/CD pipeline
- [ ] **Staging test**: Test on staging environment first

## 📝 Notes

Record any issues or observations here:

```
[Add your notes here]
```

## ✅ Sign-off

- [ ] All critical features tested and working
- [ ] No blocking issues found
- [ ] Ready for production deployment

**Tested by**: _______________
**Date**: _______________
**Next.js Version**: 16.0.1
