import { MentionVariable, CATEGORY_CONFIGS } from './template-constants';

/**
 * Filter mention variables based on search query
 * Implements case-insensitive search across label and description
 */
export interface FilterOptions {
  category?: string;
  prioritizeExactMatches?: boolean;
}

/**
 * Core filtering logic for mention variables
 */
export function filterMentionVariables(
  variables: MentionVariable[],
  query: string,
  options: FilterOptions = {}
): MentionVariable[] {
  const { category, prioritizeExactMatches = true } = options;
  
  if (!Array.isArray(variables)) {
    return [];
  }
  
  if (typeof query !== 'string') {
    return [];
  }
  
  // If no query, return all variables (optionally filtered by category)
  if (!query.trim()) {
    const filtered = category 
      ? variables.filter(variable => variable?.category === category)
      : variables;
    return filtered.slice(0, 10);
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Filter by category first if specified
  let filteredVariables = category 
    ? variables.filter(variable => variable?.category === category)
    : variables;

  // Filter by search query
  const matchingVariables = filteredVariables.filter(variable => {
    if (!variable || typeof variable !== 'object') {
      return false;
    }
    
    // Search in label
    const labelMatch = variable.label?.toLowerCase().includes(normalizedQuery) || false;
    
    // Search in description
    const descriptionMatch = variable.description?.toLowerCase().includes(normalizedQuery) || false;
    
    return labelMatch || descriptionMatch;
  });

  // Sort results if prioritizing exact matches
  if (prioritizeExactMatches) {
    return matchingVariables.sort((a, b) => {
      // Check for exact matches in label
      const aExactLabel = a.label?.toLowerCase() === normalizedQuery;
      const bExactLabel = b.label?.toLowerCase() === normalizedQuery;
      
      if (aExactLabel && !bExactLabel) return -1;
      if (!aExactLabel && bExactLabel) return 1;
      
      // Check for label starts with query
      const aStartsWithLabel = a.label?.toLowerCase().startsWith(normalizedQuery) || false;
      const bStartsWithLabel = b.label?.toLowerCase().startsWith(normalizedQuery) || false;
      
      if (aStartsWithLabel && !bStartsWithLabel) return -1;
      if (!aStartsWithLabel && bStartsWithLabel) return 1;
      
      // Default alphabetical sort by label
      return (a.label || '').localeCompare(b.label || '');
    });
  }

  return matchingVariables;
}

/**
 * Group mention variables by category
 */
export function groupMentionVariablesByCategory(
  variables: MentionVariable[]
): Record<string, MentionVariable[]> {
  if (!Array.isArray(variables)) {
    return {};
  }
  
  const groups = variables.reduce((acc, variable) => {
    if (!variable || typeof variable !== 'object') {
      return acc;
    }
    
    const category = variable.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, MentionVariable[]>);

  // Sort variables within each category alphabetically by label
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  });

  return groups;
}

/**
 * Get ordered categories based on CATEGORY_CONFIGS order
 */
export function getOrderedCategories(groupedVariables: Record<string, MentionVariable[]>): string[] {
  const availableCategories = Object.keys(groupedVariables);
  
  const orderedCategories = Object.values(CATEGORY_CONFIGS)
    .sort((a, b) => a.order - b.order)
    .map(config => config.id)
    .filter(categoryId => availableCategories.includes(categoryId));
  
  const uncategorized = availableCategories.filter(
    category => !Object.keys(CATEGORY_CONFIGS).includes(category)
  );
  
  return [...orderedCategories, ...uncategorized];
}