# PostHog and Supabase Integration Guide

This document outlines how to set up and use the integration between PostHog analytics and Supabase in the Property Management System.

## Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set in your `.env.local` file:

```env
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_public_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com  # or your self-hosted instance

# For server-side tracking
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_HOST=https://app.posthog.com  # or your self-hosted instance
```

### 2. Database Connection in PostHog

To connect your Supabase database to PostHog:

1. Go to your PostHog project
2. Navigate to **Data pipeline > Sources**
3. Click "Add source" and select **Postgres**
4. Enter your Supabase database connection details:
   - **Host**: Your Supabase database host (find in Supabase project settings > Database > Connection string)
   - **Database**: `postgres`
   - **User**: `postgres` or a dedicated read-only user
   - **Password**: Your database password
   - **Port**: `5432` (default)
   - **Schema**: `public`

5. Configure the sync settings and save

## Tracking Implementation

### User Identification

Users are automatically identified in these scenarios:

1. **Login**: When a user logs in successfully
2. **Signup**: When a new user registers
3. **Session Refresh**: When a user's session is refreshed

### Tracked Events

#### Authentication Events
- `login_attempt`: When a user attempts to log in (includes success/failure)
- `login_success`: When a user successfully logs in
- `signup_attempt`: When a user attempts to sign up
- `signup_success`: When a user successfully signs up
- `user_logged_in`: Server-side tracking of user login

#### Page Views
Page views are automatically tracked via the PostHog provider.

## Querying Data

### Example Queries

#### Get User Activity
```sql
SELECT 
  p.distinct_id,
  p.properties->>'email' as email,
  count(e.*) as event_count,
  min(e.timestamp) as first_seen,
  max(e.timestamp) as last_seen
FROM 
  posthog_person p
JOIN 
  posthog_persondistinctid pd ON p.id = pd.person_id
JOIN 
  posthog_event e ON pd.distinct_id = e.distinct_id
GROUP BY 
  p.distinct_id, p.properties->>'email'
ORDER BY 
  event_count DESC;
```

#### Funnel Analysis
```sql
WITH 
  signups AS (
    SELECT distinct_id, timestamp as signup_time
    FROM posthog_event
    WHERE event = 'signup_success'
  ),
  logins AS (
    SELECT distinct_id, timestamp as login_time
    FROM posthog_event
    WHERE event = 'login_success'
  )
SELECT 
  COUNT(DISTINCT s.distinct_id) as signups,
  COUNT(DISTINCT l.distinct_id) as logins,
  ROUND(COUNT(DISTINCT l.distinct_id) * 100.0 / 
        NULLIF(COUNT(DISTINCT s.distinct_id), 0), 2) as conversion_rate
FROM 
  signups s
LEFT JOIN 
  logins l ON s.distinct_id = l.distinct_id 
  AND l.login_time > s.signup_time;
```

## Best Practices

1. **User Properties**: Use `posthog.identify()` to set user properties that don't change often (name, email, etc.)
2. **Event Properties**: Use event properties for data that changes with each event
3. **Sensitive Data**: Never track sensitive information like passwords or personal identifiable information (PII)
4. **Testing**: Test tracking in development before deploying to production

## Troubleshooting

### Events Not Showing Up
1. Check the browser console for PostHog initialization errors
2. Verify your PostHog API key is correct
3. Ensure the PostHog script is loading (check Network tab in dev tools)

### User Identification Issues
1. Make sure `posthog.identify()` is called with the correct user ID
2. Check that the same distinct_id is used across page views and events

### Database Connection Issues
1. Verify your Supabase database allows connections from PostHog's IPs
2. Check that the database user has the correct permissions
3. Verify the connection string and credentials are correct
