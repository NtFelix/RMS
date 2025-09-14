/**
 * Example usage of AI documentation context integration
 * This file demonstrates how to use the context functions in different scenarios
 */

import { 
  fetchDocumentationContext, 
  getArticleContext, 
  getSearchContext,
  processContextForAI 
} from '@/lib/ai-documentation-context';
import { 
  prepareAIRequest, 
  prepareAIRequestWithContext, 
  sendAIRequest, 
  processStreamingResponse 
} from '@/lib/ai-context-client';

/**
 * Example 1: Basic AI request with automatic context fetching
 */
export async function basicAIRequest(userMessage: string, sessionId?: string) {
  try {
    // Prepare request with automatic context fetching
    const payload = prepareAIRequest(userMessage, {
      useDocumentationContext: true,
      maxArticles: 10,
      maxContentLength: 1000
    }, sessionId);

    // Send request to AI API
    const response = await sendAIRequest(payload);

    // Process streaming response
    let fullResponse = '';
    await processStreamingResponse(
      response,
      (chunk) => {
        console.log('Received chunk:', chunk);
        fullResponse += chunk;
      },
      (complete, metadata) => {
        console.log('AI response complete:', complete);
        console.log('Usage metadata:', metadata);
      },
      (error) => {
        console.error('AI request failed:', error);
      }
    );

    return fullResponse;
  } catch (error) {
    console.error('Error in basic AI request:', error);
    throw error;
  }
}

/**
 * Example 2: AI request with specific article context
 */
export async function aiRequestWithArticleContext(
  userMessage: string, 
  articleId: string, 
  sessionId?: string
) {
  try {
    // Get context for specific article and related articles
    const contextData = await getArticleContext(articleId, true);
    
    // Process context for AI
    const aiContext = processContextForAI(contextData, userMessage);

    // Prepare request with explicit context
    const payload = prepareAIRequestWithContext(
      userMessage,
      aiContext.articles,
      aiContext.categories,
      articleId,
      sessionId
    );

    // Send request
    const response = await sendAIRequest(payload);
    
    return response;
  } catch (error) {
    console.error('Error in article context AI request:', error);
    throw error;
  }
}

/**
 * Example 3: AI request with search-based context
 */
export async function aiRequestWithSearchContext(
  userMessage: string, 
  searchQuery: string, 
  sessionId?: string
) {
  try {
    // Get context based on search query
    const contextData = await getSearchContext(searchQuery, 15);
    
    // Prepare request with search context
    const payload = prepareAIRequest(userMessage, {
      useDocumentationContext: false, // We already have context
      searchQuery: searchQuery
    }, sessionId);

    // Add the fetched context to the payload
    payload.context = {
      articles: contextData.articles.map(a => ({
        id: a.id,
        titel: a.titel,
        kategorie: a.kategorie,
        seiteninhalt: a.seiteninhalt,
        meta: {}
      })),
      categories: contextData.categories
    };

    const response = await sendAIRequest(payload);
    return response;
  } catch (error) {
    console.error('Error in search context AI request:', error);
    throw error;
  }
}

/**
 * Example 4: Custom context filtering and processing
 */
export async function aiRequestWithCustomContext(
  userMessage: string,
  options: {
    categories?: string[];
    maxArticles?: number;
    contentFilter?: (content: string) => boolean;
  } = {},
  sessionId?: string
) {
  try {
    // Fetch full documentation context
    const contextData = await fetchDocumentationContext({
      maxArticles: 50,
      maxContentLength: 1500,
      includeCategories: true
    });

    // Apply custom filtering
    let filteredArticles = contextData.articles;

    // Filter by categories if specified
    if (options.categories && options.categories.length > 0) {
      filteredArticles = filteredArticles.filter(article => 
        article.kategorie && options.categories!.includes(article.kategorie)
      );
    }

    // Apply content filter if specified
    if (options.contentFilter) {
      filteredArticles = filteredArticles.filter(article => 
        article.seiteninhalt && options.contentFilter!(article.seiteninhalt)
      );
    }

    // Limit results
    if (options.maxArticles) {
      filteredArticles = filteredArticles.slice(0, options.maxArticles);
    }

    // Prepare request with filtered context
    const payload = prepareAIRequestWithContext(
      userMessage,
      filteredArticles.map(a => ({
        id: a.id,
        titel: a.titel,
        kategorie: a.kategorie,
        seiteninhalt: a.seiteninhalt,
        meta: {}
      })),
      contextData.categories,
      undefined,
      sessionId
    );

    const response = await sendAIRequest(payload);
    return response;
  } catch (error) {
    console.error('Error in custom context AI request:', error);
    throw error;
  }
}

/**
 * Example 5: Batch processing multiple questions with shared context
 */
export async function batchAIRequests(
  questions: string[],
  sharedContext?: {
    searchQuery?: string;
    articleId?: string;
    categories?: string[];
  },
  sessionId?: string
) {
  try {
    // Fetch shared context once
    let contextData;
    if (sharedContext?.articleId) {
      contextData = await getArticleContext(sharedContext.articleId, true);
    } else if (sharedContext?.searchQuery) {
      contextData = await getSearchContext(sharedContext.searchQuery, 20);
    } else {
      contextData = await fetchDocumentationContext({
        maxArticles: 30,
        includeCategories: true
      });
    }

    // Process all questions with shared context
    const results = await Promise.all(
      questions.map(async (question, index) => {
        try {
          const aiContext = processContextForAI(contextData, question);
          
          const payload = prepareAIRequestWithContext(
            question,
            aiContext.articles,
            aiContext.categories,
            sharedContext?.articleId,
            `${sessionId}_batch_${index}`
          );

          const response = await sendAIRequest(payload);
          return { question, response, success: true };
        } catch (error) {
          console.error(`Error processing question ${index}:`, error);
          return { question, error: error instanceof Error ? error.message : String(error), success: false };
        }
      })
    );

    return results;
  } catch (error) {
    console.error('Error in batch AI requests:', error);
    throw error;
  }
}

/**
 * Example 6: Real-time context updates during conversation
 */
export class ConversationalAI {
  private sessionId: string;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private currentContext: any = null;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async askQuestion(question: string, updateContext: boolean = true) {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: question });

      // Update context based on conversation if needed
      if (updateContext || !this.currentContext) {
        // Use conversation history to determine relevant context
        const conversationText = this.conversationHistory
          .map(msg => msg.content)
          .join(' ');
        
        this.currentContext = await getSearchContext(conversationText, 15);
      }

      // Prepare AI request with current context
      const aiContext = processContextForAI(this.currentContext, question);
      const payload = prepareAIRequestWithContext(
        question,
        aiContext.articles,
        aiContext.categories,
        undefined,
        this.sessionId
      );

      // Send request and get response
      const response = await sendAIRequest(payload);
      
      // Process streaming response
      let fullResponse = '';
      await processStreamingResponse(
        response,
        (chunk) => {
          fullResponse += chunk;
        },
        (complete) => {
          // Add assistant response to history
          this.conversationHistory.push({ role: 'assistant', content: complete });
        },
        (error) => {
          throw new Error(error);
        }
      );

      return fullResponse;
    } catch (error) {
      console.error('Error in conversational AI:', error);
      throw error;
    }
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }

  clearHistory() {
    this.conversationHistory = [];
    this.currentContext = null;
  }

  updateContext(newContext: any) {
    this.currentContext = newContext;
  }
}