/**
 * Tests for template API validation helper functions
 */

describe('Template API Validation Helpers', () => {
  // Test the JSONB validation function
  describe('isValidJsonbContent', () => {
    // We'll test the logic by extracting the function
    function isValidJsonbContent(content: any): boolean {
      try {
        // Check for circular references and non-serializable values
        JSON.stringify(content)
        
        // Check for undefined values (not allowed in JSONB)
        const hasUndefined = JSON.stringify(content).includes('undefined')
        if (hasUndefined) return false
        
        // Check for functions (not allowed in JSONB)
        const hasFunctions = containsFunctions(content)
        if (hasFunctions) return false
        
        return true
      } catch (error) {
        return false
      }
    }

    function containsFunctions(obj: any): boolean {
      if (typeof obj === 'function') return true
      
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (containsFunctions(obj[key])) return true
          }
        }
      }
      
      return false
    }

    it('should validate valid JSONB content', () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello world'
              }
            ]
          }
        ]
      }

      expect(isValidJsonbContent(validContent)).toBe(true)
    })

    it('should reject content with functions', () => {
      const invalidContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            onClick: () => console.log('click')
          }
        ]
      }

      expect(isValidJsonbContent(invalidContent)).toBe(false)
    })

    it('should handle content with undefined values (they get removed by JSON.stringify)', () => {
      const contentWithUndefined = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: undefined,
            text: 'Hello'
          }
        ]
      }

      // JSON.stringify removes undefined values, so this should be valid
      expect(isValidJsonbContent(contentWithUndefined)).toBe(true)
      
      // Verify that undefined was actually removed
      const stringified = JSON.stringify(contentWithUndefined)
      expect(stringified).not.toContain('undefined')
    })

    it('should handle circular references', () => {
      const circularContent: any = {
        type: 'doc',
        content: []
      }
      circularContent.self = circularContent

      expect(isValidJsonbContent(circularContent)).toBe(false)
    })
  })

  // Test the TipTap validation function
  describe('isValidTiptapContent', () => {
    function isValidTiptapContent(content: any): boolean {
      if (!content || typeof content !== 'object') return false
      
      // Check for TipTap document structure
      if (content.type === 'doc') {
        return Array.isArray(content.content) || content.content === undefined
      }
      
      // Check for array format (legacy)
      if (Array.isArray(content)) {
        return content.every(node => 
          node && typeof node === 'object' && typeof node.type === 'string'
        )
      }
      
      return false
    }

    it('should validate valid TipTap document structure', () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello world'
              }
            ]
          }
        ]
      }

      expect(isValidTiptapContent(validContent)).toBe(true)
    })

    it('should validate empty TipTap document', () => {
      const validContent = {
        type: 'doc',
        content: []
      }

      expect(isValidTiptapContent(validContent)).toBe(true)
    })

    it('should validate TipTap document without content', () => {
      const validContent = {
        type: 'doc'
      }

      expect(isValidTiptapContent(validContent)).toBe(true)
    })

    it('should validate legacy array format', () => {
      const validContent = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello world'
            }
          ]
        }
      ]

      expect(isValidTiptapContent(validContent)).toBe(true)
    })

    it('should reject invalid document type', () => {
      const invalidContent = {
        type: 'invalid',
        content: []
      }

      expect(isValidTiptapContent(invalidContent)).toBe(false)
    })

    it('should reject non-object content', () => {
      expect(isValidTiptapContent('string')).toBe(false)
      expect(isValidTiptapContent(123)).toBe(false)
      expect(isValidTiptapContent(null)).toBe(false)
      expect(isValidTiptapContent(undefined)).toBe(false)
    })

    it('should reject invalid array format', () => {
      const invalidContent = [
        {
          // Missing type property
          content: []
        }
      ]

      expect(isValidTiptapContent(invalidContent)).toBe(false)
    })
  })

  // Test the content sanitization function
  describe('sanitizeJsonbContent', () => {
    function sanitizeJsonbContent(content: any): any {
      if (content === null || content === undefined) {
        return null
      }
      
      if (typeof content === 'function') {
        return null
      }
      
      if (Array.isArray(content)) {
        return content.map(sanitizeJsonbContent).filter(item => item !== null)
      }
      
      if (typeof content === 'object') {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(content)) {
          const sanitizedValue = sanitizeJsonbContent(value)
          if (sanitizedValue !== null) {
            sanitized[key] = sanitizedValue
          }
        }
        return sanitized
      }
      
      // Primitive values
      return content
    }

    it('should preserve valid content', () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { level: 1 },
            content: [
              {
                type: 'text',
                text: 'Hello world'
              }
            ]
          }
        ]
      }

      const sanitized = sanitizeJsonbContent(validContent)
      expect(sanitized).toEqual(validContent)
    })

    it('should remove functions', () => {
      const contentWithFunction = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            onClick: () => console.log('click'),
            text: 'Hello world'
          }
        ]
      }

      const sanitized = sanitizeJsonbContent(contentWithFunction)
      expect(sanitized.content[0].onClick).toBeUndefined()
      expect(sanitized.content[0].text).toBe('Hello world')
    })

    it('should handle null and undefined values', () => {
      expect(sanitizeJsonbContent(null)).toBe(null)
      expect(sanitizeJsonbContent(undefined)).toBe(null)
    })

    it('should filter out null items from arrays', () => {
      const contentWithNulls = [
        { type: 'paragraph', text: 'valid' },
        () => console.log('function'),
        { type: 'text', text: 'also valid' }
      ]

      const sanitized = sanitizeJsonbContent(contentWithNulls)
      expect(sanitized).toHaveLength(2)
      expect(sanitized[0].text).toBe('valid')
      expect(sanitized[1].text).toBe('also valid')
    })

    it('should preserve primitive values', () => {
      expect(sanitizeJsonbContent('string')).toBe('string')
      expect(sanitizeJsonbContent(123)).toBe(123)
      expect(sanitizeJsonbContent(true)).toBe(true)
      expect(sanitizeJsonbContent(false)).toBe(false)
    })
  })
})