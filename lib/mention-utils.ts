import { MentionVariable, CATEGORY_CONFIGS, CategoryConfig } from './template-constants';
import { 
  handleFilterError, 
  safeExecute, 
  MentionSuggestionErrorType 
} from './mention-suggestion-error-handling';

/**
 * Filter mention variables based on search query
 * Implements case-insensitive search across label, description, and optional keywords
 * Supports filtering by category and prioritizes exact matches
 */
export interface FilterOptions {
  category?: string;
  prioritizeExactMatches?: boolean;
}

/**
 * Enhanced MentionVariable interface with optional keywords for better search
 */
export interface EnhancedMentionVariable extends MentionVariable {
  keywords?: string[];
}

/**
 * Filter mention variables based on query string and options with error handling
 * @param variables - Array of mention variables to filter
 * @param query - Search query string
 * @param options - Filtering options
 * @returns Filtered and sorted array of mention variables
 */
export function filterMentionVariables(
  variables: MentionVariable[],
  query: string,
  options: FilterOptions = {}
): MentionVariable[] {
  try {
    const { category, prioritizeExactMatches = true } = options;
    
    // Validate inputs
    if (!Array.isArray(variables)) {
      throw new Error('Variables must be an array');
    }
    
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }
    
    // If no query, return all variables (optionally filtered by category)
    if (!query.trim()) {
      return category 
        ? variables.filter(variable => variable?.category === category)
        : variables.slice(); // Return a copy to avoid mutations
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter by category first if specified
    let filteredVariables = category 
      ? variables.filter(variable => variable?.category === category)
      : variables;

    // Filter by search query with error handling for each variable
    const matchingVariables = filteredVariables.filter(variable => {
      try {
        if (!variable || typeof variable !== 'object') {
          return false;
        }
        
        const enhancedVariable = variable as EnhancedMentionVariable;
        
        // Search in label
        const labelMatch = variable.label?.toLowerCase().includes(normalizedQuery) || false;
        
        // Search in description
        const descriptionMatch = variable.description?.toLowerCase().includes(normalizedQuery) || false;
        
        // Search in keywords if available
        const keywordMatch = enhancedVariable.keywords?.some(keyword => 
          keyword?.toLowerCase().includes(normalizedQuery)
        ) || false;
        
        return labelMatch || descriptionMatch || keywordMatch;
      } catch (error) {
        console.warn('Error filtering variable:', variable, error);
        return false;
      }
    });

    // Sort results if prioritizing exact matches
    if (prioritizeExactMatches) {
      return matchingVariables.sort((a, b) => {
        try {
          const aEnhanced = a as EnhancedMentionVariable;
          const bEnhanced = b as EnhancedMentionVariable;
          
          // Check for exact matches in label
          const aExactLabel = a.label?.toLowerCase() === normalizedQuery;
          const bExactLabel = b.label?.toLowerCase() === normalizedQuery;
          
          if (aExactLabel && !bExactLabel) return -1;
          if (!aExactLabel && bExactLabel) return 1;
          
          // Check for exact matches in keywords
          const aExactKeyword = aEnhanced.keywords?.some(keyword => 
            keyword?.toLowerCase() === normalizedQuery
          ) || false;
          const bExactKeyword = bEnhanced.keywords?.some(keyword => 
            keyword?.toLowerCase() === normalizedQuery
          ) || false;
          
          if (aExactKeyword && !bExactKeyword) return -1;
          if (!aExactKeyword && bExactKeyword) return 1;
          
          // Check for label starts with query
          const aStartsWithLabel = a.label?.toLowerCase().startsWith(normalizedQuery) || false;
          const bStartsWithLabel = b.label?.toLowerCase().startsWith(normalizedQuery) || false;
          
          if (aStartsWithLabel && !bStartsWithLabel) return -1;
          if (!aStartsWithLabel && bStartsWithLabel) return 1;
          
          // Default alphabetical sort by label
          return (a.label || '').localeCompare(b.label || '');
        } catch (error) {
          console.warn('Error sorting variables:', a, b, error);
          return 0;
        }
      });
    }

    return matchingVariables;
  } catch (error) {
    // Log the error and return safe fallback
    const filterError = handleFilterError(
      error instanceof Error ? error : new Error('Unknown filter error'),
      query,
      variables?.length || 0
    );
    
    // Return safe fallback - basic filtering without advanced features
    try {
      if (!query.trim()) {
        return variables?.slice(0, 10) || [];
      }
      
      const normalizedQuery = query.toLowerCase();
      return (variables || [])
        .filter(variable => 
          variable?.label?.toLowerCase().includes(normalizedQuery) ||
          variable?.description?.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 10);
    } catch (fallbackError) {
      console.error('Fallback filtering also failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Group mention variables by category with proper ordering and error handling
 * @param variables - Array of mention variables to group
 * @returns Object with category keys and variable arrays as values, ordered by category order
 */
export function groupMentionVariablesByCategory(
  variables: MentionVariable[]
): Record<string, MentionVariable[]> {
  try {
    if (!Array.isArray(variables)) {
      throw new Error('Variables must be an array');
    }
    
    const groups = variables.reduce((acc, variable) => {
      try {
        if (!variable || typeof variable !== 'object') {
          return acc;
        }
        
        const category = variable.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(variable);
        return acc;
      } catch (error) {
        console.warn('Error grouping variable:', variable, error);
        return acc;
      }
    }, {} as Record<string, MentionVariable[]>);

    // Sort variables within each category alphabetically by label
    Object.keys(groups).forEach(category => {
      try {
        groups[category].sort((a, b) => {
          try {
            return (a.label || '').localeCompare(b.label || '');
          } catch (error) {
            console.warn('Error sorting variables in category:', category, error);
            return 0;
          }
        });
      } catch (error) {
        console.warn('Error sorting category:', category, error);
      }
    });

    return groups;
  } catch (error) {
    console.error('Error grouping variables by category:', error);
    // Return safe fallback
    return {};
  }
}

/**
 * Get ordered categories based on CATEGORY_CONFIGS order
 * @param groupedVariables - Grouped variables object
 * @returns Array of category IDs in proper order
 */
export function getOrderedCategories(groupedVariables: Record<string, MentionVariable[]>): string[] {
  const availableCategories = Object.keys(groupedVariables);
  
  // Get categories in order from CATEGORY_CONFIGS
  const orderedCategories = Object.values(CATEGORY_CONFIGS)
    .sort((a, b) => a.order - b.order)
    .map(config => config.id)
    .filter(categoryId => availableCategories.includes(categoryId));
  
  // Add any uncategorized items at the end
  const uncategorized = availableCategories.filter(
    category => !Object.keys(CATEGORY_CONFIGS).includes(category)
  );
  
  return [...orderedCategories, ...uncategorized];
}

/**
 * Get unique categories from mention variables
 * @param variables - Array of mention variables
 * @returns Array of unique category strings
 */
export function getUniqueCategories(variables: MentionVariable[]): string[] {
  const categories = variables
    .map(variable => variable.category)
    .filter((category): category is NonNullable<typeof category> => Boolean(category));
  
  return Array.from(new Set(categories));
}

/**
 * Search mention variables with advanced filtering
 * Combines filtering and grouping for UI components
 * @param variables - Array of mention variables to search
 * @param query - Search query string
 * @param options - Filtering options
 * @returns Object with filtered variables and grouped results
 */
export function searchMentionVariables(
  variables: MentionVariable[],
  query: string,
  options: FilterOptions = {}
) {
  const filteredVariables = filterMentionVariables(variables, query, options);
  const groupedVariables = groupMentionVariablesByCategory(filteredVariables);
  const orderedCategories = getOrderedCategories(groupedVariables);
  
  return {
    variables: filteredVariables,
    grouped: groupedVariables,
    categories: orderedCategories,
    total: filteredVariables.length
  };
}