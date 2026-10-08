import { TemplatePayload } from '@/types/template';
import {
  TEMPLATE_CATEGORIES,
  MENTION_VARIABLES,
  MentionVariable,
  VORAUSZAHLUNG_SATZ_VARIABLES,
  getMentionVariablesForTemplateCategory,
} from '@/lib/template-constants';
import { JSONContent } from '@tiptap/react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate template data before saving
 */
export function validateTemplate(templateData: Partial<TemplatePayload>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate title
  if (!templateData.titel) {
    errors.push({
      field: 'titel',
      message: 'Titel ist erforderlich'
    });
  } else if (templateData.titel.length < 3) {
    errors.push({
      field: 'titel',
      message: 'Titel muss mindestens 3 Zeichen lang sein'
    });
  } else if (templateData.titel.length > 100) {
    errors.push({
      field: 'titel',
      message: 'Titel darf maximal 100 Zeichen lang sein'
    });
  }

  // Validate content
  if (!templateData.inhalt) {
    errors.push({
      field: 'inhalt',
      message: 'Inhalt ist erforderlich'
    });
  } else if (!isValidTipTapContent(templateData.inhalt)) {
    errors.push({
      field: 'inhalt',
      message: 'Ungültiger Inhalt'
    });
  } else if (isEmptyTipTapContent(templateData.inhalt)) {
    errors.push({
      field: 'inhalt',
      message: 'Inhalt darf nicht leer sein'
    });
  }

  // Validate category
  if (!templateData.kategorie) {
    errors.push({
      field: 'kategorie',
      message: 'Kategorie ist erforderlich'
    });
  } else if (!TEMPLATE_CATEGORIES.includes(templateData.kategorie)) {
    errors.push({
      field: 'kategorie',
      message: 'Ungültige Kategorie'
    });
  }

  // Validate context requirements (optional)
  if (templateData.kontext_anforderungen) {
    if (!Array.isArray(templateData.kontext_anforderungen)) {
      errors.push({
        field: 'kontext_anforderungen',
        message: 'Kontext-Anforderungen müssen ein Array sein'
      });
    } else {
      templateData.kontext_anforderungen.forEach((requirement, index) => {
        if (typeof requirement !== 'string') {
          errors.push({
            field: 'kontext_anforderungen',
            message: `Kontext-Anforderung ${index + 1} muss ein String sein`
          });
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if TipTap content is valid JSON
 */
function isValidTipTapContent(content: JSONContent): boolean {
  try {
    if (typeof content !== 'object' || content === null) {
      return false;
    }
    
    // Basic TipTap structure validation
    if (!content.type) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if TipTap content is empty
 */
export function isEmptyTipTapContent(content: JSONContent): boolean {
  if (!content || !content.content) {
    return true;
  }

  // Check if content only contains empty paragraphs
  const hasContent = content.content.some(node => {
    if (node.type === 'paragraph') {
      return node.content && node.content.some(textNode => 
        textNode.type === 'text' && textNode.text && textNode.text.trim().length > 0
      );
    }
    return node.type !== 'paragraph'; // Non-paragraph content is considered non-empty
  });

  return !hasContent;
}

/**
 * Whether TipTap content holds anything at all: visible text or a variable.
 * Unlike isEmptyTipTapContent, a paragraph that only holds a variable counts as content.
 */
export function hasTipTapContent(content: JSONContent | null | undefined): boolean {
  if (!content) return false;
  if (content.type === 'text') return !!content.text?.trim();
  if (content.type === 'mention') return true;
  return Array.isArray(content.content) && content.content.some(hasTipTapContent);
}

/**
 * Sanitize template data before saving
 */
export function sanitizeTemplateData(templateData: TemplatePayload): TemplatePayload {
  return {
    titel: templateData.titel.trim(),
    inhalt: templateData.inhalt,
    kategorie: templateData.kategorie,
    kontext_anforderungen: templateData.kontext_anforderungen || [],
    ...(templateData.vorauszahlung_satz !== undefined && { vorauszahlung_satz: templateData.vorauszahlung_satz })
  };
}

/**
 * Extract text content from TipTap JSON for search/preview
 */
export function extractTextFromTipTap(content: JSONContent): string {
  if (!content || !content.content) {
    return '';
  }

  let text = '';
  
  function extractFromNode(node: any): void {
    if (node.type === 'text') {
      text += node.text || '';
    } else if (node.content) {
      node.content.forEach(extractFromNode);
    }
    
    // Add space after block elements
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += ' ';
    }
  }

  content.content.forEach(extractFromNode);
  
  return text.trim();
}

/**
 * Get template preview text (truncated)
 */
export function getTemplatePreview(content: JSONContent, maxLength: number = 150): string {
  const text = extractTextFromTipTap(content);
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Validate mention variables in template content.
 * Without a category every known variable is accepted; with one, only the variables that category offers
 * (the Abrechnung and Vorauszahlung variables belong to Betriebskostenabrechnung templates).
 */
export function validateMentionVariables(content: JSONContent, category?: string | null): ValidationResult {
  const allowed = category === undefined ? MENTION_VARIABLES : getMentionVariablesForTemplateCategory(category);
  return validateMentionVariablesAgainst(content, allowed, 'inhalt');
}

/** Validate the Vorauszahlung sentence: it may only use the old/new amount and the date of the increase */
export function validateVorauszahlungSatz(content: JSONContent | null | undefined): ValidationResult {
  if (!content) return { isValid: true, errors: [] };
  return validateMentionVariablesAgainst(content, VORAUSZAHLUNG_SATZ_VARIABLES, 'vorauszahlung_satz');
}

function validateMentionVariablesAgainst(content: JSONContent, allowed: MentionVariable[], field: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validMentionIds = new Set(allowed.map(variable => variable.id));

  function validateNode(node: any): void {
    if (node.type === 'mention' && node.attrs?.id) {
      if (!validMentionIds.has(node.attrs.id)) {
        errors.push({
          field,
          message: `Ungültige Mention-Variable: ${node.attrs.id}`
        });
      }
    }
    
    if (node.content) {
      node.content.forEach(validateNode);
    }
  }

  if (content.content) {
    content.content.forEach(validateNode);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
