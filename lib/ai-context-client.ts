/**
 * Client-side AI context utilities
 * These functions help prepare context data for AI requests from the client
 */

export interface AIRequestPayload {
  message: string;
  sessionId?: string;
}

/**
 * Prepares an AI request payload
 */
export function prepareAIRequest(
  message: string,
  sessionId?: string
): AIRequestPayload {
  return {
    message: message.trim(),
    sessionId
  };
}

/**
 * Validates AI request payload
 */
export function validateAIRequest(payload: AIRequestPayload): string[] {
  const errors: string[] = [];

  if (!payload.message || payload.message.trim().length === 0) {
    errors.push('Message is required');
  }

  if (payload.message && payload.message.length > 4000) {
    errors.push('Message is too long (max 4000 characters)');
  }

  return errors;
}

/**
 * Sends AI request to the API
 */
export async function sendAIRequest(payload: AIRequestPayload): Promise<Response> {
  const errors = validateAIRequest(payload);
  if (errors.length > 0) {
    throw new Error(`Invalid request: ${errors.join(', ')}`);
  }

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
  if (!workerUrl) {
    console.error("NEXT_PUBLIC_WORKER_URL environment variable is not defined");
    throw new Error("AI Service configuration error: missing backend URL");
  }

  // Ensure we target the /ai endpoint
  const targetUrl = workerUrl.endsWith('/ai')
    ? workerUrl
    : `${workerUrl.replace(/\/$/, '')}/ai`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

/**
 * Processes streaming AI response
 */
export async function processStreamingResponse(
  response: Response,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, metadata?: any) => void,
  onError: (error: string) => void
): Promise<void> {
  if (!response.body) {
    throw new Error('No response body available');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last line in the buffer as it might be incomplete
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk' && data.content) {
              fullResponse += data.content;
              onChunk(data.content);
            } else if (data.type === 'complete') {
              onComplete(fullResponse, data.usage);
              return;
            } else if (data.type === 'error') {
              onError(data.error || 'Unknown error occurred');
              return;
            }
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error);
    onError('Error reading response stream');
  } finally {
    reader.releaseLock();
  }
}
