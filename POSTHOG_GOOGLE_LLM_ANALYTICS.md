# PostHog Google LLM Analytics Integration

## Overview

This guide covers integrating Google LLM analytics with your existing PostHog setup in the RMS (Rent-Managing-System) application. Your app already has PostHog configured, so we'll focus on adding LLM analytics capabilities.

## Current PostHog Setup

Your application already has:
- ✅ PostHog provider configured (`components/providers/posthog-provider.tsx`)
- ✅ PostHog packages installed (`posthog-js`, `posthog-node`, `@posthog/nextjs-config`)
- ✅ API route for server-side config (`app/api/posthog-config/route.ts`)
- ✅ Environment variables setup (POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_ENV_ID)

## Google LLM Analytics Integration

### 1. Install Additional Dependencies

```bash
npm install @google/generative-ai
```

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Google AI API Key
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# PostHog LLM Analytics (if not already set)
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_HOST=https://eu.i.posthog.com
POSTHOG_ENV_ID=your_environment_id
```

### 3. Create LLM Analytics Utility

Create a new file `lib/llm-analytics.ts`:

```typescript
import posthog from 'posthog-js'
import { PostHog } from 'posthog-node'

// Server-side PostHog client for API routes
const serverPostHog = new PostHog(
  process.env.POSTHOG_API_KEY || '',
  {
    host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
  }
)

export interface LLMEvent {
  model: string
  prompt: string
  response?: string
  tokens_used?: number
  cost?: number
  duration_ms?: number
  user_id?: string
  session_id?: string
  error?: string
}

// Client-side LLM tracking
export function trackLLMEvent(event: LLMEvent) {
  if (typeof window !== 'undefined' && posthog.has_opted_in_capturing?.()) {
    posthog.capture('llm_interaction', {
      model: event.model,
      prompt_length: event.prompt.length,
      response_length: event.response?.length || 0,
      tokens_used: event.tokens_used,
      cost: event.cost,
      duration_ms: event.duration_ms,
      session_id: event.session_id,
      error: event.error,
      timestamp: new Date().toISOString(),
    })
  }
}

// Server-side LLM tracking
export function trackLLMEventServer(event: LLMEvent) {
  if (process.env.POSTHOG_API_KEY) {
    serverPostHog.capture({
      distinctId: event.user_id || 'anonymous',
      event: 'llm_interaction',
      properties: {
        model: event.model,
        prompt_length: event.prompt.length,
        response_length: event.response?.length || 0,
        tokens_used: event.tokens_used,
        cost: event.cost,
        duration_ms: event.duration_ms,
        session_id: event.session_id,
        error: event.error,
        timestamp: new Date().toISOString(),
      }
    })
  }
}

export { serverPostHog }
```

### 4. Create Google AI Service

Create `lib/google-ai.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { trackLLMEventServer } from './llm-analytics'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export interface GenerateContentOptions {
  prompt: string
  model?: string
  userId?: string
  sessionId?: string
}

export async function generateContent({
  prompt,
  model = 'gemini-pro',
  userId,
  sessionId
}: GenerateContentOptions) {
  const startTime = Date.now()
  
  try {
    const aiModel = genAI.getGenerativeModel({ model })
    const result = await aiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const duration = Date.now() - startTime
    
    // Track successful LLM interaction
    trackLLMEventServer({
      model,
      prompt,
      response: text,
      duration_ms: duration,
      user_id: userId,
      session_id: sessionId,
      // Note: Google AI doesn't provide token count in free tier
      // You might need to estimate or use a different method
    })
    
    return {
      success: true,
      text,
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Track failed LLM interaction
    trackLLMEventServer({
      model,
      prompt,
      duration_ms: duration,
      user_id: userId,
      session_id: sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    throw error
  }
}
```

### 5. Create API Route for LLM Interactions

Create `app/api/ai/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/google-ai'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, sessionId } = await request.json()
    
    // Get user from Supabase session
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const result = await generateContent({
      prompt,
      model,
      userId: user.id,
      sessionId: sessionId || crypto.randomUUID()
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
```

### 6. Create React Hook for LLM Interactions

Create `hooks/use-ai-generation.ts`:

```typescript
import { useState } from 'react'
import { trackLLMEvent } from '@/lib/llm-analytics'

interface UseAIGenerationOptions {
  model?: string
  sessionId?: string
}

export function useAIGeneration(options: UseAIGenerationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const generate = async (prompt: string) => {
    setIsLoading(true)
    setError(null)
    
    const startTime = Date.now()
    const sessionId = options.sessionId || crypto.randomUUID()
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model || 'gemini-pro',
          sessionId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate content')
      }
      
      const result = await response.json()
      const duration = Date.now() - startTime
      
      // Track client-side event
      trackLLMEvent({
        model: options.model || 'gemini-pro',
        prompt,
        response: result.text,
        duration_ms: duration,
        session_id: sessionId
      })
      
      return result
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      
      setError(errorMessage)
      
      // Track client-side error
      trackLLMEvent({
        model: options.model || 'gemini-pro',
        prompt,
        duration_ms: duration,
        session_id: sessionId,
        error: errorMessage
      })
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    generate,
    isLoading,
    error
  }
}
```

### 7. Example Usage in a Component

Create `components/ai-assistant.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useAIGeneration } from '@/hooks/use-ai-generation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AIAssistant() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const { generate, isLoading, error } = useAIGeneration()
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    try {
      const result = await generate(prompt)
      setResponse(result.text)
    } catch (err) {
      console.error('Generation failed:', err)
    }
  }
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Enter your prompt:
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask me anything about property management..."
            rows={4}
          />
        </div>
        
        <Button 
          onClick={handleGenerate} 
          disabled={isLoading || !prompt.trim()}
          className="w-full"
        >
          {isLoading ? 'Generating...' : 'Generate Response'}
        </Button>
        
        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}
        
        {response && (
          <div>
            <label className="block text-sm font-medium mb-2">
              AI Response:
            </label>
            <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 8. PostHog Dashboard Setup

In your PostHog dashboard, you can now:

1. **Create LLM Analytics Dashboard**:
   - Go to Insights → New Insight
   - Filter events by `llm_interaction`
   - Create charts for:
     - Total LLM interactions over time
     - Average response time
     - Error rate
     - Most used models
     - Token usage (if available)

2. **Set up Alerts**:
   - High error rate alerts
   - Unusual usage patterns
   - Cost monitoring (if tracking costs)

### 9. Advanced Analytics Queries

Example PostHog queries for LLM analytics:

```sql
-- Average response time by model
SELECT 
  properties.model,
  AVG(properties.duration_ms) as avg_duration
FROM events 
WHERE event = 'llm_interaction' 
GROUP BY properties.model

-- Error rate over time
SELECT 
  toDate(timestamp) as date,
  countIf(properties.error != '') / count() * 100 as error_rate
FROM events 
WHERE event = 'llm_interaction'
GROUP BY date
ORDER BY date

-- Most active users
SELECT 
  distinct_id,
  count() as interactions,
  AVG(properties.duration_ms) as avg_duration
FROM events 
WHERE event = 'llm_interaction'
GROUP BY distinct_id
ORDER BY interactions DESC
```

## Integration with Your RMS Application

### Property Management AI Features

You could integrate AI into your RMS app for:

1. **Tenant Communication**: AI-generated responses to tenant inquiries
2. **Document Analysis**: AI analysis of rental agreements or maintenance reports
3. **Financial Insights**: AI-powered financial projections and recommendations
4. **Maintenance Scheduling**: AI-optimized maintenance scheduling

### Example: AI-Powered Tenant Response

```typescript
// In your tenant management component
const { generate } = useAIGeneration()

const generateTenantResponse = async (inquiry: string) => {
  const prompt = `
    As a professional property manager in Germany, respond to this tenant inquiry:
    "${inquiry}"
    
    Keep the response professional, helpful, and compliant with German rental law.
    Respond in German.
  `
  
  return await generate(prompt)
}
```

## Security Considerations

1. **API Key Security**: Store Google AI API key securely in environment variables
2. **User Authentication**: Ensure only authenticated users can access AI features
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Data Privacy**: Be mindful of tenant data in AI prompts
5. **Cost Control**: Monitor and limit AI usage to control costs

## Monitoring and Optimization

With PostHog analytics, you can:

- Track which AI features are most used
- Monitor response times and optimize accordingly
- Identify and fix common error patterns
- Understand user behavior with AI features
- Calculate ROI of AI implementation

This setup gives you comprehensive LLM analytics integrated with your existing PostHog infrastructure, allowing you to track, monitor, and optimize AI interactions in your property management application.