# PostHog Events Verification Guide

## How to Test PostHog Events

1. **Open the application**: Navigate to http://localhost:3000/documentation
2. **Open Browser DevTools**: Press F12 or right-click → Inspect
3. **Go to Network tab**: Filter by "posthog" or "eu.i.posthog.com"
4. **Go to Console tab**: Look for PostHog-related logs

## Expected Events to Verify

### 1. Page Load Events
- **Event**: `$pageview`
- **When**: Page loads
- **Properties**: `$current_url`, etc.

### 2. AI Assistant Events
- **Event**: `ai_assistant_opened`
- **When**: Click the AI assistant button/icon
- **Properties**: `source`, `session_id`, `timestamp`

- **Event**: `ai_question_submitted`
- **When**: Submit a question to AI
- **Properties**: `question_length`, `session_id`, `has_context`

- **Event**: `ai_response_received`
- **When**: AI response is received
- **Properties**: `response_time_ms`, `session_id`, `success`, `response_type`

- **Event**: `ai_assistant_closed`
- **When**: Close AI assistant
- **Properties**: `session_duration_ms`, `message_count`, `session_id`

### 3. Server-Side Events (Check server logs)
- **Event**: `ai_question_submitted_server`
- **Event**: `ai_response_generated_server`
- **Event**: `ai_request_failed` (if errors occur)

## Testing Steps

### Step 1: Test Basic PostHog Setup
```javascript
// In browser console:
console.log('PostHog loaded:', !!window.posthog);
console.log('PostHog opted in:', window.posthog?.has_opted_in_capturing?.());
console.log('PostHog opted out:', window.posthog?.has_opted_out_capturing?.());

// Test manual event
window.posthog?.capture('test_event', { test: true });
```

### Step 2: Test AI Assistant Events
1. Navigate to documentation page
2. Look for atom icon in search bar (AI toggle)
3. Click the atom icon to switch to AI mode
4. Type a question and submit
5. Wait for streaming response
6. Close the AI assistant

### Step 3: Check Network Requests
- Look for POST requests to `https://eu.i.posthog.com/capture/`
- Verify events are being sent with correct properties

### Step 4: Check Server Logs
- Look for PostHog capture logs in the terminal running the Next.js server
- Server-side events should appear when AI requests are made

## Common Issues and Solutions

### Issue: PostHog not loaded
**Solution**: Check if cookie consent is given
```javascript
// Accept cookies
localStorage.setItem('cookieConsent', 'all');
// Reload page
location.reload();
```

### Issue: Events not being sent
**Solution**: Check opt-in status
```javascript
// Opt in to tracking
window.posthog?.opt_in_capturing();
```

### Issue: AI assistant not working
**Solution**: Check for JavaScript errors in console and verify streaming response format

## Expected Network Traffic

When testing, you should see:
1. **GET** `/api/posthog-config` - PostHog configuration
2. **GET** `/api/documentation/categories` - Load categories
3. **GET** `/api/documentation` - Load articles
4. **POST** `/api/ai-assistant` - AI requests (streaming response)
5. **POST** `https://eu.i.posthog.com/capture/` - PostHog events

## Verification Checklist

- [ ] PostHog is loaded and configured
- [ ] Cookie consent is accepted
- [ ] Page view events are sent
- [ ] AI assistant opens without JSON parsing errors
- [ ] AI assistant sends streaming requests successfully
- [ ] PostHog events are captured for AI interactions
- [ ] Server-side events are logged
- [ ] Network requests show events being sent to PostHog

## Success Criteria

✅ **All tests pass if:**
1. No "data: {"ty"... is not valid JSON" errors
2. AI assistant streams responses correctly
3. PostHog events are visible in network tab
4. Server logs show PostHog events being captured
5. AI assistant interface works smoothly with real-time updates