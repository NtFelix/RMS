import { TemplatePayload } from '@/types/template';
import { MENTION_VARIABLES, TEMPLATE_CATEGORIES } from '@/lib/template-constants';
import { AUFLOESBARE_VARIABLEN } from '@/lib/vorlagen/variablen';
import { pruefeBedingungen } from '@/lib/vorlagen/bedingungen';
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

  // Inhalt = Text mit Zeichen, eine Variable oder ein Block, der nicht nur aus leeren Containern besteht
  // (z. B. ein Bedingungsblock oder eine Liste mit leerem Absatz zaehlt nicht als Inhalt).
  const hatInhalt = (node: JSONContent): boolean => {
    if (node.type === 'text') return Boolean(node.text && node.text.trim().length > 0);
    if (node.type === 'mention') return true;
    if (node.type === 'horizontalRule') return true;
    return (node.content ?? []).some(hatInhalt);
  };
  const hasContent = content.content.some(hatInhalt);

  return !hasContent;
}

/**
 * Sanitize template data before saving
 */
export function sanitizeTemplateData(templateData: TemplatePayload): TemplatePayload {
  return {
    titel: templateData.titel.trim(),
    inhalt: templateData.inhalt,
    kategorie: templateData.kategorie,
    kontext_anforderungen: templateData.kontext_anforderungen || []
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
 * Validate mention variables in template content
 */
export function validateMentionVariables(content: JSONContent): ValidationResult {
  const errors: ValidationError[] = [];
  // Gültige IDs ergeben sich aus der Variablen-Registry, nicht aus einer zweiten Liste.
  const validMentionIds = new Set(MENTION_VARIABLES.map(variable => variable.id));

  function validateNode(node: any): void {
    if (node.type === 'mention' && node.attrs?.id) {
      if (!validMentionIds.has(node.attrs.id)) {
        errors.push({
          field: 'inhalt',
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

/**
 * Bedingungsblöcke prüfen: unbekannte Variable, fehlender Operator oder fehlender Vergleichswert.
 * Nur Variablen, die beim Versand aufgelöst werden (sonst fällt der Block stillschweigend immer weg).
 * Getrennt von validateMentionVariables, damit die Oberfläche die Meldungen mit eigenem Titel zeigt.
 */
export function validateBedingungen(content: JSONContent): ValidationResult {
  const errors: ValidationError[] = pruefeBedingungen(content, AUFLOESBARE_VARIABLEN).map(message => ({
    field: 'inhalt',
    message
  }));
  return {
    isValid: errors.length === 0,
    errors
  };
}
