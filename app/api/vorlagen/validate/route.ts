/**
 * Template Validation API Endpoint
 * Provides validation services for template creation and usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateValidator } from '@/lib/template-system/template-validation';
import { templateErrorHandler, withTemplateErrorHandling } from '@/lib/template-system/template-error-handler';
import type { TemplateValidationResult } from '@/types/template-system';

/**
 * POST /api/vorlagen/validate
 * Validate template data for creation or usage
 */
export async function POST(request: NextRequest) {
  const result = await withTemplateErrorHandling(
    async () => {
      const body = await request.json();
      const { type, data } = body;

      if (!type || !data) {
        throw new Error('Missing validation type or data');
      }

      let validationResult: TemplateValidationResult;

      switch (type) {
        case 'creation':
          validationResult = await templateValidator.validateForCreation(data);
          break;
          
        case 'usage':
          if (!data.template || !data.context) {
            throw new Error('Template and context are required for usage validation');
          }
          validationResult = await templateValidator.validateForUsage(data.template, data.context);
          break;
          
        default:
          throw new Error(`Unknown validation type: ${type}`);
      }

      return {
        success: true,
        validation: validationResult,
        timestamp: new Date().toISOString()
      };
    },
    {
      operation: 'Template-Validierung',
      userId: 'current-user', // This would come from auth
      timestamp: new Date(),
      additionalData: { validationType: 'api-validation' }
    },
    {
      retryCount: 1,
      showToUser: false // API errors shouldn't show toasts
    }
  );

  if (result.success) {
    return NextResponse.json(result.data, { status: 200 });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: result.error?.message || 'Validation failed',
          type: result.error?.type || 'validation',
          errorId: result.error?.errorId
        }
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/vorlagen/validate/placeholder-suggestions
 * Get placeholder suggestions for autocomplete
 */
export async function GET(request: NextRequest) {
  const result = await withTemplateErrorHandling(
    async () => {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q') || '';
      const category = searchParams.get('category');

      // Import placeholder definitions
      const { PLACEHOLDER_DEFINITIONS } = await import('@/lib/template-system/placeholder-definitions');
      
      let suggestions = PLACEHOLDER_DEFINITIONS;

      // Filter by category if specified
      if (category) {
        suggestions = suggestions.filter(def => def.category === category);
      }

      // Filter by query if specified
      if (query) {
        const lowerQuery = query.toLowerCase();
        suggestions = suggestions.filter(def => 
          def.key.toLowerCase().includes(lowerQuery) ||
          def.label.toLowerCase().includes(lowerQuery) ||
          def.description.toLowerCase().includes(lowerQuery)
        );
      }

      // Limit results
      suggestions = suggestions.slice(0, 20);

      return {
        success: true,
        suggestions: suggestions.map(def => ({
          key: def.key,
          label: def.label,
          description: def.description,
          category: def.category,
          insertText: def.key,
          displayText: `${def.key} - ${def.label}`
        })),
        total: suggestions.length
      };
    },
    {
      operation: 'Platzhalter-Vorschläge',
      userId: 'current-user',
      timestamp: new Date()
    }
  );

  if (result.success) {
    return NextResponse.json(result.data, { status: 200 });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: result.error?.message || 'Failed to get suggestions',
          errorId: result.error?.errorId
        }
      },
      { status: 500 }
    );
  }
}