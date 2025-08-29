# Environment Variables

This document lists all the environment variables required for the application to function properly.

## Required Variables

### PostHog Configuration

```env
# PostHog API key (client-side)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_public_key_here

# PostHog host (e.g., https://app.posthog.com or your self-hosted instance)
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# PostHog API key (server-side)
POSTHOG_API_KEY=phx_your_server_key_here

# PostHog host for server-side tracking (usually same as NEXT_PUBLIC_POSTHOG_HOST)
POSTHOG_HOST=https://app.posthog.com
```

### Supabase Configuration

```env
# Supabase URL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

# Supabase Anon Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database (Optional - only if directly connecting to Supabase DB)

```env
# Database connection details (for direct database access)
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres
```

## Development vs Production

- In development, these variables can be set in a `.env.local` file
- In production, these should be set in your deployment environment
- Never commit `.env` files to version control

## Getting Started

1. Copy the required variables to a new `.env.local` file
2. Fill in the values with your actual configuration
3. Restart your development server to apply the changes
