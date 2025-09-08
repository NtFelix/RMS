// Template System - Main Export File
// Centralized exports for the template system

// Core types
export type {
  Template,
  PlaceholderDefinition,
  TemplateContext,
  AutocompleteSuggestion,
  TemplateCreateData,
  TemplateUsageData,
  TemplateProcessingResult,
  TemplateValidationResult,
  TemplateError,
  ContextType
} from '@/types/template-system';

// Placeholder definitions and utilities
export {
  PLACEHOLDER_DEFINITIONS,
  CATEGORY_DISPLAY_NAMES,
  getPlaceholdersByCategory,
  getPlaceholdersByContext,
  searchPlaceholders,
  getPlaceholderByKey,
  getContextFreePlaceholders,
  isValidPlaceholder,
  getRequiredContextTypes,
  getPlaceholdersGroupedByCategory
} from './placeholder-definitions';

// Context mappings
export { CONTEXT_MAPPINGS } from '@/types/template-system';