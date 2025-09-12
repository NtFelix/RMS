import { MentionVariable } from './template-constants';

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
 * Filter mention variables based on query string and options
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
  const { category, prioritizeExactMatches = true } = options;
  
  // If no query, return all variables (optionally filtered by category)
  if (!query.trim()) {
    return category 
      ? variables.filter(variable => variable.category === category)
      : variables;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Filter by category first if specified
  let filteredVariables = category 
    ? variables.filter(variable => variable.category === category)
    : variables;

  // Filter by search query
  const matchingVariables = filteredVariables.filter(variable => {
    const enhancedVariable = variable as EnhancedMentionVariable;
    
    // Search in label
    const labelMatch = variable.label.toLowerCase().includes(normalizedQuery);
    
    // Search in description
    const descriptionMatch = variable.description.toLowerCase().includes(normalizedQuery);
    
    // Search in keywords if available
    const keywordMatch = enhancedVariable.keywords?.some(keyword => 
      keyword.toLowerCase().includes(normalizedQuery)
    ) || false;
    
    return labelMatch || descriptionMatch || keywordMatch;
  });

  // Sort results if prioritizing exact matches
  if (prioritizeExactMatches) {
    return matchingVariables.sort((a, b) => {
      const aEnhanced = a as EnhancedMentionVariable;
      const bEnhanced = b as EnhancedMentionVariable;
      
      // Check for exact matches in label
      const aExactLabel = a.label.toLowerCase() === normalizedQuery;
      const bExactLabel = b.label.toLowerCase() === normalizedQuery;
      
      if (aExactLabel && !bExactLabel) return -1;
      if (!aExactLabel && bExactLabel) return 1;
      
      // Check for exact matches in keywords
      const aExactKeyword = aEnhanced.keywords?.some(keyword => 
        keyword.toLowerCase() === normalizedQuery
      ) || false;
      const bExactKeyword = bEnhanced.keywords?.some(keyword => 
        keyword.toLowerCase() === normalizedQuery
      ) || false;
      
      if (aExactKeyword && !bExactKeyword) return -1;
      if (!aExactKeyword && bExactKeyword) return 1;
      
      // Check for label starts with query
      const aStartsWithLabel = a.label.toLowerCase().startsWith(normalizedQuery);
      const bStartsWithLabel = b.label.toLowerCase().startsWith(normalizedQuery);
      
      if (aStartsWithLabel && !bStartsWithLabel) return -1;
      if (!aStartsWithLabel && bStartsWithLabel) return 1;
      
      // Default alphabetical sort by label
      return a.label.localeCompare(b.label);
    });
  }

  return matchingVariables;
}

/**
 * Group mention variables by category
 * @param variables - Array of mention variables to group
 * @returns Object with category keys and variable arrays as values
 */
export function groupMentionVariablesByCategory(
  variables: MentionVariable[]
): Record<string, MentionVariable[]> {
  return variables.reduce((groups, variable) => {
    const category = variable.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(variable);
    return groups;
  }, {} as Record<string, MentionVariable[]>);
}

/**
 * Get unique categories from mention variables
 * @param variables - Array of mention variables
 * @returns Array of unique category strings
 */
export function getUniqueCategories(variables: MentionVariable[]): string[] {
  const categories = variables
    .map(variable => variable.category)
    .filter((category): category is string => Boolean(category));
  
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
  const categories = getUniqueCategories(filteredVariables);
  
  return {
    variables: filteredVariables,
    grouped: groupedVariables,
    categories,
    total: filteredVariables.length
  };
}