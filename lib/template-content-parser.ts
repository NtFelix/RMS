/**
 * Robust Content Parser for Template System
 * 
 * Handles parsing and serialization of TipTap content with comprehensive error handling
 * and fallback mechanisms for malformed content.
 */

import { TemplateErrorHandler, TemplateErrorType } from './template-error-handler'
import { TemplateErrorReporter } from './template-error-logger'
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/template'

// TipTap content structure interfaces
export interface TiptapContent {
  type: 'doc'
  content: ContentNode[]
}

export interface ContentNode {
  type: string
  attrs?: Record<string, any>
  content?: ContentNode[]
  text?: string
  marks?: MarkNode[]
}

export interface MarkNode {
  type: string
  attrs?: Record<string, any>
}

// Parser result interface
export interface ParseResult {
  success: boolean
  content: TiptapContent
  errors: string[]
  warnings: string[]
  wasRecovered: boolean
}

// Serialization result interface
export interface SerializeResult {
  success: boolean
  content: object
  errors: string[]
}

// Variable extraction result interface
export interface VariableExtractionResult {
  variables: string[]
  errors: string[]
  warnings: string[]
}

/**
 * Robust Content Parser Class
 * 
 * Provides comprehensive parsing, validation, and serialization of TipTap content
 * with error recovery and fallback mechanisms.
 */
export class RobustContentParser {
  private static instance: RobustContentParser | null = null
  
  // Singleton pattern for consistent behavior across the application
  static getInstance(): RobustContentParser {
    if (!RobustContentParser.instance) {
      RobustContentParser.instance = new RobustContentParser()
    }
    return RobustContentParser.instance
  }
  
  /**
   * Parse template content from various input formats
   * Handles both string and object inputs with comprehensive error recovery
   */
  parseTemplateContent(content: string | object | null | undefined): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []
    let wasRecovered = false
    
    try {
      // Handle null/undefined content
      if (content === null || content === undefined) {
        warnings.push('Content is null or undefined, using empty document')
        return {
          success: true,
          content: this.getEmptyDocument(),
          errors,
          warnings,
          wasRecovered: true
        }
      }
      
      // Handle string content
      if (typeof content === 'string') {
        return this.parseStringContent(content)
      }
      
      // Handle object content
      if (typeof content === 'object') {
        return this.parseObjectContent(content)
      }
      
      // Handle other types
      errors.push(`Unsupported content type: ${typeof content}`)
      return {
        success: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
      errors.push(`Content parsing failed: ${errorMessage}`)
      
      // Log error for debugging
      TemplateErrorReporter.reportError(
        TemplateErrorHandler.createError(
          TemplateErrorType.INVALID_CONTENT,
          'Content parsing failed',
          error,
          { contentType: typeof content }
        )
      )
      
      return {
        success: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
    }
  }
  
  /**
   * Parse string content (JSON string)
   */
  private parseStringContent(content: string): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []
    let wasRecovered = false
    
    try {
      // Handle empty string
      if (!content.trim()) {
        warnings.push('Empty string content, using empty document')
        return {
          success: true,
          content: this.getEmptyDocument(),
          errors,
          warnings,
          wasRecovered: true
        }
      }
      
      // Strategy 3: Content is plain text (not JSON)
      // Try to parse as JSON first, but if it fails, treat as plain text
      let parsedContent: any
      try {
        parsedContent = JSON.parse(content)
      } catch (jsonError) {
        // Try to recover from common JSON issues
        const recoveredContent = this.attemptJsonRecovery(content)
        if (recoveredContent) {
          parsedContent = recoveredContent
          warnings.push('JSON was malformed but recovered successfully')
          wasRecovered = true
        } else {
          // Treat as plain text
          warnings.push('Content was plain text, converted to paragraph')
          return {
            success: true,
            content: {
              type: 'doc',
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: content
                }]
              }]
            },
            errors,
            warnings,
            wasRecovered: true
          }
        }
      }
      
      // Validate and normalize the parsed content
      const validationResult = this.validateAndNormalizeContent(parsedContent)
      
      return {
        success: validationResult.isValid,
        content: validationResult.content,
        errors: [...errors, ...validationResult.errors],
        warnings: [...warnings, ...validationResult.warnings],
        wasRecovered: wasRecovered || validationResult.wasRecovered
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown string parsing error'
      errors.push(`String content parsing failed: ${errorMessage}`)
      
      return {
        success: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
    }
  }
  
  /**
   * Parse object content
   */
  private parseObjectContent(content: object): ParseResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Handle empty object
      if (Object.keys(content).length === 0) {
        warnings.push('Empty object content, using empty document')
        return {
          success: true,
          content: this.getEmptyDocument(),
          errors,
          warnings,
          wasRecovered: true
        }
      }
      
      // Validate and normalize the content
      const validationResult = this.validateAndNormalizeContent(content)
      
      return {
        success: validationResult.isValid,
        content: validationResult.content,
        errors: [...errors, ...validationResult.errors],
        warnings: [...warnings, ...validationResult.warnings],
        wasRecovered: validationResult.wasRecovered
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown object parsing error'
      errors.push(`Object content parsing failed: ${errorMessage}`)
      
      return {
        success: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
    }
  }
  
  /**
   * Attempt to recover malformed JSON
   */
  private attemptJsonRecovery(content: string): any | null {
    try {
      // Common JSON recovery strategies
      const recoveryStrategies = [
        // Remove trailing commas
        (str: string) => str.replace(/,(\s*[}\]])/g, '$1'),
        // Fix single quotes to double quotes
        (str: string) => str.replace(/'/g, '"'),
        // Remove comments
        (str: string) => str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
        // Fix unquoted keys
        (str: string) => str.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      ]
      
      for (const strategy of recoveryStrategies) {
        try {
          const recovered = strategy(content)
          return JSON.parse(recovered)
        } catch {
          // Continue to next strategy
        }
      }
      
      return null
    } catch {
      return null
    }
  }
  
  /**
   * Validate and normalize content structure
   */
  private validateAndNormalizeContent(content: any): {
    isValid: boolean
    content: TiptapContent
    errors: string[]
    warnings: string[]
    wasRecovered: boolean
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let wasRecovered = false
    
    try {
      // Ensure content is an object
      if (!content || typeof content !== 'object') {
        errors.push('Content must be an object')
        return {
          isValid: false,
          content: this.getEmptyDocument(),
          errors,
          warnings,
          wasRecovered: true
        }
      }
      
      // Check if it's already a valid TipTap document
      if (content.type === 'doc' && Array.isArray(content.content)) {
        // Validate the structure recursively
        const validatedContent = this.validateContentNodes(content.content)
        
        return {
          isValid: true,
          content: {
            type: 'doc',
            content: validatedContent.nodes
          },
          errors: [...errors, ...validatedContent.errors],
          warnings: [...warnings, ...validatedContent.warnings],
          wasRecovered: validatedContent.wasRecovered
        }
      }
      
      // Try to recover from various content formats
      const recoveredContent = this.attemptContentRecovery(content)
      if (recoveredContent) {
        warnings.push('Content structure was invalid but recovered successfully')
        wasRecovered = true
        
        const validatedContent = this.validateContentNodes(recoveredContent.content)
        
        return {
          isValid: true,
          content: {
            type: 'doc',
            content: validatedContent.nodes
          },
          errors: [...errors, ...validatedContent.errors],
          warnings: [...warnings, ...validatedContent.warnings, ...recoveredContent.warnings],
          wasRecovered: true
        }
      }
      
      errors.push('Unable to parse or recover content structure')
      return {
        isValid: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      errors.push(`Content validation failed: ${errorMessage}`)
      
      return {
        isValid: false,
        content: this.getEmptyDocument(),
        errors,
        warnings,
        wasRecovered: true
      }
    }
  }
  
  /**
   * Attempt to recover content from various formats
   */
  private attemptContentRecovery(content: any): { content: ContentNode[], warnings: string[] } | null {
    const warnings: string[] = []
    
    try {
      // Strategy 1: Content is an array of nodes
      if (Array.isArray(content)) {
        warnings.push('Content was an array, wrapped in document structure')
        return { content, warnings }
      }
      
      // Strategy 2: Content has a content property that's an array
      if (content.content && Array.isArray(content.content)) {
        warnings.push('Content had nested content property, extracted successfully')
        return { content: content.content, warnings }
      }
      
      // Strategy 4: Content has text property
      if (content.text && typeof content.text === 'string') {
        warnings.push('Content had text property, converted to paragraph')
        return {
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: content.text
            }]
          }],
          warnings
        }
      }
      
      return null
    } catch {
      return null
    }
  }
  
  /**
   * Validate content nodes recursively
   */
  private validateContentNodes(nodes: any[]): {
    nodes: ContentNode[]
    errors: string[]
    warnings: string[]
    wasRecovered: boolean
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let wasRecovered = false
    const validatedNodes: ContentNode[] = []
    
    if (!Array.isArray(nodes)) {
      errors.push('Content nodes must be an array')
      return { nodes: [], errors, warnings, wasRecovered: true }
    }
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      try {
        const validatedNode = this.validateSingleNode(node, `node[${i}]`)
        
        if (validatedNode.isValid) {
          validatedNodes.push(validatedNode.node)
        } else {
          errors.push(...validatedNode.errors)
          warnings.push(...validatedNode.warnings)
          
          // Try to recover the node
          const recoveredNode = this.recoverNode(node)
          if (recoveredNode) {
            validatedNodes.push(recoveredNode)
            warnings.push(`Node at index ${i} was recovered`)
            wasRecovered = true
          }
        }
        
        if (validatedNode.wasRecovered) {
          wasRecovered = true
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown node validation error'
        errors.push(`Node validation failed at index ${i}: ${errorMessage}`)
        
        // Try to recover
        const recoveredNode = this.recoverNode(node)
        if (recoveredNode) {
          validatedNodes.push(recoveredNode)
          warnings.push(`Node at index ${i} was recovered after error`)
          wasRecovered = true
        }
      }
    }
    
    return { nodes: validatedNodes, errors, warnings, wasRecovered }
  }
  
  /**
   * Validate a single content node
   */
  private validateSingleNode(node: any, path: string): {
    isValid: boolean
    node: ContentNode
    errors: string[]
    warnings: string[]
    wasRecovered: boolean
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let wasRecovered = false
    
    // Check if node is an object
    if (!node || typeof node !== 'object') {
      return {
        isValid: false,
        node: {} as ContentNode,
        errors: [`${path}: Node must be an object`],
        warnings,
        wasRecovered
      }
    }
    
    // Check required type property
    if (!node.type || typeof node.type !== 'string') {
      return {
        isValid: false,
        node: {} as ContentNode,
        errors: [`${path}: Node must have a type property`],
        warnings,
        wasRecovered
      }
    }
    
    const validatedNode: ContentNode = {
      type: node.type
    }
    
    // Validate attributes
    if (node.attrs) {
      if (typeof node.attrs === 'object') {
        validatedNode.attrs = { ...node.attrs }
      } else {
        warnings.push(`${path}: Invalid attrs property, ignoring`)
        wasRecovered = true
      }
    }
    
    // Validate text content
    if (node.text !== undefined) {
      if (typeof node.text === 'string') {
        validatedNode.text = node.text
      } else {
        warnings.push(`${path}: Invalid text property, converting to string`)
        validatedNode.text = String(node.text)
        wasRecovered = true
      }
    }
    
    // Validate marks
    if (node.marks) {
      if (Array.isArray(node.marks)) {
        const validatedMarks: MarkNode[] = []
        
        for (let i = 0; i < node.marks.length; i++) {
          const mark = node.marks[i]
          if (mark && typeof mark === 'object' && mark.type) {
            const validatedMark: MarkNode = { type: mark.type }
            if (mark.attrs && typeof mark.attrs === 'object') {
              validatedMark.attrs = { ...mark.attrs }
            }
            validatedMarks.push(validatedMark)
          } else {
            warnings.push(`${path}: Invalid mark at index ${i}, skipping`)
            wasRecovered = true
          }
        }
        
        if (validatedMarks.length > 0) {
          validatedNode.marks = validatedMarks
        }
      } else {
        warnings.push(`${path}: Invalid marks property, ignoring`)
        wasRecovered = true
      }
    }
    
    // Validate nested content
    if (node.content) {
      if (Array.isArray(node.content)) {
        const nestedValidation = this.validateContentNodes(node.content)
        validatedNode.content = nestedValidation.nodes
        errors.push(...nestedValidation.errors)
        warnings.push(...nestedValidation.warnings)
        
        if (nestedValidation.wasRecovered) {
          wasRecovered = true
        }
      } else {
        warnings.push(`${path}: Invalid content property, ignoring`)
        wasRecovered = true
      }
    }
    
    return {
      isValid: errors.length === 0,
      node: validatedNode,
      errors,
      warnings,
      wasRecovered
    }
  }
  
  /**
   * Attempt to recover a malformed node
   */
  private recoverNode(node: any): ContentNode | null {
    try {
      // If it's a string, convert to text node
      if (typeof node === 'string') {
        return {
          type: 'text',
          text: node
        }
      }
      
      // If it has text but no type, assume it's a text node
      if (node && typeof node === 'object' && node.text && !node.type) {
        return {
          type: 'text',
          text: String(node.text)
        }
      }
      
      // If it has content but no type, assume it's a paragraph
      if (node && typeof node === 'object' && node.content && !node.type) {
        return {
          type: 'paragraph',
          content: Array.isArray(node.content) ? node.content : []
        }
      }
      
      return null
    } catch {
      return null
    }
  }
  
  /**
   * Get an empty TipTap document
   */
  private getEmptyDocument(): TiptapContent {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    }
  }
  
  /**
   * Serialize TipTap content back to object format
   */
  serializeContent(content: TiptapContent): SerializeResult {
    const errors: string[] = []
    
    try {
      // Validate input
      if (!content || typeof content !== 'object') {
        errors.push('Content must be an object')
        return { success: false, content: {}, errors }
      }
      
      if (content.type !== 'doc') {
        errors.push('Content must be a document node')
        return { success: false, content: {}, errors }
      }
      
      if (!Array.isArray(content.content)) {
        errors.push('Document content must be an array')
        return { success: false, content: {}, errors }
      }
      
      // Create a clean copy without any undefined values
      const serialized = this.cleanObject(content)
      
      return {
        success: true,
        content: serialized,
        errors
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown serialization error'
      errors.push(`Serialization failed: ${errorMessage}`)
      
      return {
        success: false,
        content: {},
        errors
      }
    }
  }
  
  /**
   * Clean object by removing undefined values and empty arrays/objects
   */
  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }
    
    if (Array.isArray(obj)) {
      const cleaned = obj
        .map(item => this.cleanObject(item))
        .filter(item => item !== undefined)
      
      return cleaned.length > 0 ? cleaned : undefined
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {}
      
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanObject(value)
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue
        }
      }
      
      return Object.keys(cleaned).length > 0 ? cleaned : undefined
    }
    
    return obj
  }
  
  /**
   * Extract variables from TipTap content
   */
  extractVariables(content: TiptapContent): VariableExtractionResult {
    const variables = new Set<string>()
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      if (!content) {
        errors.push('Content is null or undefined')
        return { variables: [], errors, warnings }
      }
      
      this.extractVariablesFromNode(content, variables, errors, warnings)
      
      return {
        variables: Array.from(variables).sort(),
        errors,
        warnings
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error'
      errors.push(`Variable extraction failed: ${errorMessage}`)
      
      return {
        variables: [],
        errors,
        warnings
      }
    }
  }
  
  /**
   * Recursively extract variables from a node
   */
  private extractVariablesFromNode(
    node: any,
    variables: Set<string>,
    errors: string[],
    warnings: string[]
  ): void {
    try {
      if (!node || typeof node !== 'object') return
      
      // Check if this is a mention node with a variable ID
      if (node.type === 'mention' && node.attrs?.id) {
        if (typeof node.attrs.id === 'string' && node.attrs.id.trim()) {
          variables.add(node.attrs.id.trim())
        } else {
          warnings.push('Found mention node with invalid ID')
        }
      }
      
      // Check for mention marks in text nodes
      if (node.type === 'text' && Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'mention' && mark.attrs?.id) {
            if (typeof mark.attrs.id === 'string' && mark.attrs.id.trim()) {
              variables.add(mark.attrs.id.trim())
            } else {
              warnings.push('Found mention mark with invalid ID')
            }
          }
        })
      }
      
      // Recursively check content array
      if (Array.isArray(node.content)) {
        node.content.forEach((childNode: any) => {
          this.extractVariablesFromNode(childNode, variables, errors, warnings)
        })
      }
      
      // Check marks array for mentions
      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'mention' && mark.attrs?.id) {
            if (typeof mark.attrs.id === 'string' && mark.attrs.id.trim()) {
              variables.add(mark.attrs.id.trim())
            } else {
              warnings.push('Found mention mark with invalid ID')
            }
          }
        })
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown node processing error'
      errors.push(`Error processing node: ${errorMessage}`)
    }
  }
  
  /**
   * Validate content structure and return validation result
   */
  validateContent(content: TiptapContent): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    try {
      // Basic structure validation
      if (!content || typeof content !== 'object') {
        errors.push({
          field: 'content',
          message: 'Content must be an object',
          code: 'CONTENT_INVALID_TYPE'
        })
        return { isValid: false, errors, warnings }
      }
      
      if (content.type !== 'doc') {
        errors.push({
          field: 'content',
          message: 'Content must be a document node',
          code: 'CONTENT_INVALID_ROOT_TYPE'
        })
      }
      
      if (!Array.isArray(content.content)) {
        errors.push({
          field: 'content',
          message: 'Document content must be an array',
          code: 'CONTENT_INVALID_STRUCTURE'
        })
      } else {
        // Validate each node
        this.validateNodesRecursively(content.content, errors, warnings, 'content')
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      errors.push({
        field: 'content',
        message: `Content validation failed: ${errorMessage}`,
        code: 'CONTENT_VALIDATION_ERROR'
      })
      
      return { isValid: false, errors, warnings }
    }
  }
  
  /**
   * Validate nodes recursively for validation result
   */
  private validateNodesRecursively(
    nodes: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string
  ): void {
    nodes.forEach((node, index) => {
      const nodePath = `${path}[${index}]`
      
      if (!node || typeof node !== 'object') {
        errors.push({
          field: 'content',
          message: `Node at ${nodePath} must be an object`,
          code: 'NODE_INVALID_TYPE'
        })
        return
      }
      
      if (!node.type || typeof node.type !== 'string') {
        errors.push({
          field: 'content',
          message: `Node at ${nodePath} must have a type property`,
          code: 'NODE_MISSING_TYPE'
        })
      }
      
      // Validate mention nodes specifically
      if (node.type === 'mention') {
        if (!node.attrs || !node.attrs.id) {
          errors.push({
            field: 'content',
            message: `Mention node at ${nodePath} must have an id attribute`,
            code: 'MENTION_MISSING_ID'
          })
        }
        
        if (!node.attrs || !node.attrs.label) {
          warnings.push({
            field: 'content',
            message: `Mention node at ${nodePath} should have a label attribute`,
            code: 'MENTION_MISSING_LABEL'
          })
        }
      }
      
      // Recursively validate nested content
      if (Array.isArray(node.content)) {
        this.validateNodesRecursively(node.content, errors, warnings, `${nodePath}.content`)
      }
    })
  }
}

// Export singleton instance
export const robustContentParser = RobustContentParser.getInstance()

// Export convenience functions
export function parseTemplateContent(content: string | object | null | undefined): ParseResult {
  return robustContentParser.parseTemplateContent(content)
}

export function serializeTemplateContent(content: TiptapContent): SerializeResult {
  return robustContentParser.serializeContent(content)
}

export function extractTemplateVariables(content: TiptapContent): VariableExtractionResult {
  return robustContentParser.extractVariables(content)
}

export function validateTemplateContent(content: TiptapContent): ValidationResult {
  return robustContentParser.validateContent(content)
}