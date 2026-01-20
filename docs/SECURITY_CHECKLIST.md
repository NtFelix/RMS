# Security Hardening Checklist

This document tracks the status of security vulnerabilities identified during the security audit and their resolution status.

## Legend
- ✅ Fixed in code/migrations
- 🔧 Requires Supabase Dashboard configuration
- ⏳ Pending verification

---

## 1. Database & RLS Security

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| 1 | Unauthorized DELETE | CRITICAL | ✅ Fixed | `20260120000000_security_hardening.sql` - Added `Secure DELETE` policies to all tables |
| N/A | Spoofed INSERT | HIGH | ✅ Fixed | `20260120000000_security_hardening.sql` - Added `Secure INSERT` policies |
| N/A | Unauthorized UPDATE | HIGH | ✅ Fixed | `20260120000000_security_hardening.sql` - Added `Secure UPDATE` policies |
| 9 | Row Count Enumeration | LOW | ✅ Fixed | `20260120000000_security_hardening.sql` - Statement timeouts set |
| 13 | API Version Information Disclosure | LOW | ✅ Fixed | Minimum privilege revocation applied |

---

## 2. Authentication Security

| ID | Vulnerability | Severity | Status | How to Fix |
|----|---------------|----------|--------|------------|
| 2 | Weak Password Policy | HIGH | 🔧 Dashboard | Supabase Dashboard → Authentication → Policies → Password |
| 3 | Anonymous Sign-up Enabled | MEDIUM | 🔧 Dashboard | Supabase Dashboard → Authentication → Policies → Disable anonymous sign-ins |
| 4 | Login Rate Limiting | HIGH | 🔧 Dashboard | Supabase Dashboard → Authentication → Rate Limits |
| 5 | OTP Timing Attack | MEDIUM | 🔧 Dashboard | Enable rate limiting + reduce OTP validity window |
| 6 | OTP Brute Force Vulnerability | HIGH | 🔧 Dashboard | Supabase Dashboard → Authentication → Rate Limits |
| 16 | Password Reset Flow Abuse | HIGH | 🔧 Dashboard | Supabase Dashboard → Authentication → Rate Limits (limit reset emails) |

### Dashboard Steps for Authentication Security:

1. **Password Policy** (Project Settings → Auth → Security):
   - Minimum password length: `8` or more
   - Require uppercase: `Yes`
   - Require lowercase: `Yes`
   - Require number: `Yes`
   - Require special character: `Yes`

2. **Rate Limiting** (Project Settings → Auth → Rate Limits):
   - Email sign-in attempts: `10 per 15 minutes per IP`
   - OTP attempts: `5 per 15 minutes per email`
   - Password reset: `3 per hour per email`

3. **OTP Settings** (Project Settings → Auth → Email):
   - OTP expiry: `300 seconds` (5 minutes) maximum
   - Consider using magic links instead of OTP

---

## 3. API Security

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| 10 | Security Headers Missing | MEDIUM | ✅ Fixed | `middleware.ts` - CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| 11 | GraphQL Introspection Enabled | MEDIUM | ✅ Fixed | `20260120000000_security_hardening.sql` - Disabled in schema comment |
| 14 | TLS Downgrade Check | HIGH | ✅ Fixed | `middleware.ts` - HSTS header with includeSubDomains |
| 15 | Credentials in Error Messages | MEDIUM | ⏳ Review | Ensure Supabase errors are caught and generic messages shown to users |

---

## 4. Storage Security

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| 7 | Content-Type Sniffing Attack | MEDIUM | ✅ Fixed | `middleware.ts` - `X-Content-Type-Options: nosniff` |

---

## 5. Realtime Security

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| 8 | Realtime Token in URL | MEDIUM | ⏳ Review | Check if you're using Supabase Realtime; if not, disable it in Dashboard |

### How to disable Realtime (if not used):
Supabase Dashboard → Settings → Database → Realtime → Disable if not needed

---

## 6. Database Connection Security

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| 12 | Connection Pool Exhaustion | HIGH | 🔧 Dashboard | Configure Connection Pooler settings |

### Dashboard Steps:
Supabase Dashboard → Settings → Database → Connection Pooler:
- Mode: `Transaction` (recommended for serverless)
- Pool size: `10-20` (adjust based on your needs)

---

## 7. Security Headers (Implemented in middleware.ts)

```typescript
// Current headers set:
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
response.headers.set('Content-Security-Policy', csp)
```

---

## 8. SQL Migrations Applied

The following migrations address security concerns:

1. **`20260120000000_security_hardening.sql`**
   - RLS policies for INSERT, UPDATE, DELETE on all tables
   - GraphQL introspection disabled
   - Statement timeouts set
   - Function search paths secured
   - Minimum privilege principle applied

2. **`20241218000000_fix_storage_rls_policies.sql`**
   - Storage bucket RLS policies

---

## Verification Commands

Run these in Supabase SQL Editor to verify RLS policies:

```sql
-- Check all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check policies on a specific table
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'Mieter';

-- Verify statement_timeout is set
SHOW statement_timeout;
```

---

## Post-Deployment Verification

After deploying, verify security headers at:
- [securityheaders.com](https://securityheaders.com)
- [mozilla observatory](https://observatory.mozilla.org)

---

## Last Updated
- Date: 2026-01-20
- By: Security Hardening PR
