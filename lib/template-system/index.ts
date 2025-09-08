/**
 * Template System - Main Export File
 * Exports all placeholder engine, validation, and processing functionality
 */

// Core engine exports
export {
  PlaceholderEngine,
  placeholderEngine,
  PLACEHOLDER_DEFINITIONS,
  type PlaceholderDefinition,
  type AutocompleteSuggestion,
  type ValidationError,
  type ContextType
} from './placeholder-engine';

// Validation exports
export {
  TemplateValidator,
  RealTimeValidator,
  createValidator,
  createRealTimeValidator,
  type ValidationResult,
  type TemplateValidationOptions
} from './placeholder-validation';

// Template processing exports
export {
  TemplateProcessor,
  templateProcessor
} from './template-processor';

// Context fetching exports
export {
  ContextFetcher,
  contextFetcher,
  fetchTemplateContext,
  fetchAvailableEntities,
  fetchRelatedEntities
} from './context-fetcher';

// Convenience exports for common use cases
export const createPlaceholderEngine = () => new PlaceholderEngine();
export const createTemplateValidator = (engine?: PlaceholderEngine) => 
  createValidator(engine || placeholderEngine);
export const createTemplateRealTimeValidator = (engine?: PlaceholderEngine) => 
  createRealTimeValidator(engine || placeholderEngine);
export const createTemplateProcessor = () => new TemplateProcessor();