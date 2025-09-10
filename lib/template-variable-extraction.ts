/**
 * Client-side utility functions for extracting variables from Tiptap content
 * This mirrors the server-side functionality but can be used in React components
 */

/**
 * Extract variables from Tiptap JSON content
 * Recursively searches for mention nodes with variable IDs
 * Handles complex nested structures and different content formats
 */
export function extractVariablesFromContent(content: object): string[] {
  const variables = new Set<string>()

  const extractFromNode = (node: any): void => {
    if (!node || typeof node !== 'object') return

    // Check if this is a mention node with a variable ID
    if (node.type === 'mention' && node.attrs?.id) {
      variables.add(node.attrs.id)
    }

    // Handle different node structures
    if (node.type === 'text' && node.marks) {
      // Check for mention marks in text nodes
      node.marks.forEach((mark: any) => {
        if (mark.type === 'mention' && mark.attrs?.id) {
          variables.add(mark.attrs.id)
        }
      })
    }

    // Recursively check content array
    if (Array.isArray(node.content)) {
      node.content.forEach(extractFromNode)
    }

    // Check marks array for mentions (for inline mentions)
    if (Array.isArray(node.marks)) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'mention' && mark.attrs?.id) {
          variables.add(mark.attrs.id)
        }
        // Recursively check mark content if it exists
        if (mark.content) {
          extractFromNode(mark)
        }
      })
    }

    // Handle nested objects that might contain mentions
    if (node.attrs && typeof node.attrs === 'object') {
      Object.values(node.attrs).forEach(value => {
        if (typeof value === 'object' && value !== null) {
          extractFromNode(value)
        }
      })
    }
  }

  // Handle different content formats
  if (Array.isArray(content)) {
    content.forEach(extractFromNode)
  } else {
    extractFromNode(content)
  }

  return Array.from(variables).sort()
}

/**
 * Check if content has meaningful text or elements (not just empty paragraphs)
 */
export function hasContentMeaning(content: any): boolean {
  if (!content || typeof content !== 'object') return false

  const checkNode = (node: any): boolean => {
    if (!node || typeof node !== 'object') return false

    // Check for text content
    if (node.type === 'text' && node.text && node.text.trim().length > 0) {
      return true
    }

    // Check for mention nodes (variables)
    if (node.type === 'mention' && node.attrs?.id) {
      return true
    }

    // Recursively check content for all node types
    if (Array.isArray(node.content)) {
      return node.content.some(checkNode)
    }

    // Check for hard breaks, horizontal rules, etc.
    if (['hardBreak', 'horizontalRule'].includes(node.type)) {
      return true
    }

    return false
  }

  if (Array.isArray(content)) {
    return content.some(checkNode)
  }

  return checkNode(content)
}

/**
 * Get content statistics for display purposes
 */
export function getContentStats(content: any): {
  characterCount: number
  wordCount: number
  variableCount: number
  hasContent: boolean
} {
  const variables = extractVariablesFromContent(content)
  let characterCount = 0
  let wordCount = 0

  const countText = (node: any): void => {
    if (!node || typeof node !== 'object') return

    if (node.type === 'text' && node.text) {
      const text = node.text.trim()
      characterCount += text.length
      if (text.length > 0) {
        wordCount += text.split(/\s+/).filter(word => word.length > 0).length
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(countText)
    }

    if (Array.isArray(node.marks)) {
      node.marks.forEach(countText)
    }
  }

  if (Array.isArray(content)) {
    content.forEach(countText)
  } else {
    countText(content)
  }

  return {
    characterCount,
    wordCount,
    variableCount: variables.length,
    hasContent: hasContentMeaning(content)
  }
}

/**
 * Validate variable IDs format
 */
export function isValidVariableId(variableId: string): boolean {
  // Variable IDs should start with a letter and contain only letters, numbers, and underscores
  const variableIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/
  return variableIdRegex.test(variableId)
}

/**
 * Clean and normalize variable IDs
 */
export function normalizeVariableId(variableId: string): string {
  // Remove invalid characters and ensure it starts with a letter
  let normalized = variableId.replace(/[^a-zA-Z0-9_]/g, '_')
  
  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(normalized)) {
    normalized = 'var_' + normalized
  }
  
  // Remove consecutive underscores
  normalized = normalized.replace(/_+/g, '_')
  
  // Remove trailing underscores
  normalized = normalized.replace(/_+$/, '')
  
  return normalized
}