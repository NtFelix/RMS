/**
 * AI Input Validation Utilities
 * Provides comprehensive input validation for AI assistant queries
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  sanitizedInput?: string;
}

export interface ValidationConfig {
  minLength?: number;
  maxLength?: number;
  allowEmptyInput?: boolean;
  sanitizeInput?: boolean;
  checkForSpam?: boolean;
  checkForProfanity?: boolean;
}

const DEFAULT_CONFIG: Required<ValidationConfig> = {
  minLength: 1,
  maxLength: 2000,
  allowEmptyInput: false,
  sanitizeInput: true,
  checkForSpam: true,
  checkForProfanity: false // Disabled by default for German content
};

// Common spam patterns (German and English)
const SPAM_PATTERNS = [
  /(.)\1{15,}/i, // Repeated characters (more than 15 times)
  /^[A-Z\s!]{50,}$/i, // All caps with excessive length (50+ chars)
  /(?:https?:\/\/|www\.)[^\s]{10,}/gi, // URLs (multiple)
  /\b(?:viagra|casino|lottery|winner|congratulations|click here|free money)\b/gi,
  /\b(?:gewinn|kostenlos|gratis|klicken sie hier|casino|lotterie)\b/gi
];

// Excessive punctuation patterns
const EXCESSIVE_PUNCTUATION = /[!?]{3,}|[.]{4,}/g;

// HTML/Script injection patterns
const INJECTION_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi
];

/**
 * Validates AI assistant input with comprehensive checks
 */
export function validateAIInput(
  input: string,
  config: ValidationConfig = {}
): ValidationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Handle empty input
  if (!input || input.trim().length === 0) {
    if (finalConfig.allowEmptyInput) {
      return { isValid: true, sanitizedInput: '' };
    }
    return {
      isValid: false,
      error: 'Bitte geben Sie eine Frage oder Nachricht ein.'
    };
  }

  const trimmedInput = input.trim();

  // Length validation
  if (trimmedInput.length < finalConfig.minLength) {
    return {
      isValid: false,
      error: `Ihre Nachricht ist zu kurz. Mindestens ${finalConfig.minLength} Zeichen erforderlich.`
    };
  }

  if (trimmedInput.length > finalConfig.maxLength) {
    return {
      isValid: false,
      error: `Ihre Nachricht ist zu lang. Maximal ${finalConfig.maxLength} Zeichen erlaubt.`
    };
  }

  // Check for injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmedInput)) {
      return {
        isValid: false,
        error: 'Ungültige Zeichen oder Code in der Nachricht erkannt.'
      };
    }
  }

  let sanitizedInput = trimmedInput;
  let warnings: string[] = [];

  if (finalConfig.sanitizeInput) {
    // Remove excessive punctuation
    const originalLength = sanitizedInput.length;
    sanitizedInput = sanitizedInput.replace(EXCESSIVE_PUNCTUATION, (match) => {
      return match.charAt(0).repeat(Math.min(3, match.length));
    });

    if (sanitizedInput.length !== originalLength) {
      warnings.push('Übermäßige Satzzeichen wurden reduziert.');
    }

    // Remove potential HTML tags (but preserve common symbols)
    sanitizedInput = sanitizedInput.replace(/<[^>]*>/g, '');
  }

  // Spam detection
  if (finalConfig.checkForSpam) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(sanitizedInput)) {
        return {
          isValid: false,
          error: 'Ihre Nachricht wurde als Spam erkannt. Bitte formulieren Sie Ihre Frage anders.'
        };
      }
    }

    // Check for excessive repetition of words
    const words = sanitizedInput.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();

    for (const word of words) {
      if (word.length > 2) { // Only count meaningful words
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    // Check if any word appears more than 30% of the time
    const totalWords = words.filter(w => w.length > 2).length;
    for (const [word, count] of wordCount) {
      if (count > 3 && count / totalWords > 0.3) {
        return {
          isValid: false,
          error: 'Zu viele Wiederholungen in der Nachricht. Bitte formulieren Sie Ihre Frage anders.'
        };
      }
    }
  }

  // Check for very short repeated queries (potential bot behavior)
  if (sanitizedInput.length < 10 && /^(.+?)\1+$/.test(sanitizedInput)) {
    return {
      isValid: false,
      error: 'Bitte stellen Sie eine vollständige Frage.'
    };
  }

  // Success with potential warnings
  return {
    isValid: true,
    sanitizedInput,
    warning: warnings.length > 0 ? warnings.join(' ') : undefined
  };
}

/**
 * Validates input specifically for AI context
 * Checks for AI-specific concerns like prompt injection
 */
export function validateAIContext(input: string): ValidationResult {
  const basicValidation = validateAIInput(input, {
    maxLength: 1000,
    checkForSpam: true,
    sanitizeInput: true
  });

  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const sanitizedInput = basicValidation.sanitizedInput!;

  // Check for potential prompt injection attempts
  const promptInjectionPatterns = [
    /ignore\s+(?:previous|all|above)\s+(?:instructions|prompts?|commands?)/gi,
    /forget\s+(?:everything|all|previous)/gi,
    /you\s+are\s+now\s+(?:a|an)\s+/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /human\s*:\s*/gi,
    /\[system\]/gi,
    /\[\/system\]/gi,
    /act\s+as\s+(?:if\s+)?(?:you\s+are\s+)?(?:a|an)\s+/gi,
    /pretend\s+(?:to\s+be\s+|you\s+are\s+)?(?:a|an)\s+/gi
  ];

  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(sanitizedInput)) {
      return {
        isValid: false,
        error: 'Ihre Anfrage enthält ungültige Anweisungen. Bitte stellen Sie eine normale Frage über Mietevo.'
      };
    }
  }

  // Check for attempts to extract system information
  const systemInfoPatterns = [
    /(?:show|tell|give)\s+me\s+(?:your|the)\s+(?:system|prompt|instructions)/gi,
    /what\s+(?:are\s+)?your\s+(?:instructions|rules|guidelines)/gi,
    /how\s+(?:are\s+)?you\s+(?:programmed|configured|set\s+up)/gi
  ];

  for (const pattern of systemInfoPatterns) {
    if (pattern.test(sanitizedInput)) {
      return {
        isValid: true,
        sanitizedInput,
        warning: 'Ich kann nur Fragen zu Mietevo beantworten. Bitte fragen Sie nach spezifischen Funktionen oder Hilfe.'
      };
    }
  }

  return {
    isValid: true,
    sanitizedInput
  };
}

/**
 * Sanitizes input for safe processing
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 2000); // Enforce max length
}

/**
 * Checks if input looks like a question
 */
export function isQuestion(input: string): boolean {
  const trimmed = input.trim().toLowerCase();

  // German question words
  const questionWords = [
    'was', 'wie', 'wo', 'wann', 'warum', 'wer', 'welche', 'welcher', 'welches',
    'können', 'kann', 'soll', 'sollte', 'würde', 'ist', 'sind', 'hat', 'haben'
  ];

  // Check if starts with question word
  for (const word of questionWords) {
    if (trimmed.startsWith(word + ' ')) {
      return true;
    }
  }

  // Check if ends with question mark
  if (trimmed.endsWith('?')) {
    return true;
  }

  // Check for common question patterns
  const questionPatterns = [
    /^(?:können sie|kannst du|könnten sie)/i,
    /^(?:wie kann ich|wie mache ich|wie funktioniert)/i,
    /^(?:wo finde ich|wo ist|wo kann ich)/i,
    /^(?:was ist|was sind|was bedeutet)/i,
    /^(?:gibt es|existiert|haben sie)/i
  ];

  return questionPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Provides suggestions for improving the input
 */
export function getInputSuggestions(input: string): string[] {
  const suggestions: string[] = [];

  if (!input || input.trim().length === 0) {
    return [
      'Fragen Sie nach Mietevo-Funktionen wie "Wie erstelle ich eine Betriebskostenabrechnung?"',
      'Bitten Sie um Hilfe bei spezifischen Aufgaben wie "Wie füge ich einen neuen Mieter hinzu?"',
      'Erkundigen Sie sich nach Features wie "Welche Berichte kann ich erstellen?"'
    ];
  }

  const trimmed = input.trim();

  if (trimmed.length < 5) {
    suggestions.push('Versuchen Sie eine vollständigere Frage zu stellen.');
  }

  if (!isQuestion(trimmed)) {
    suggestions.push('Formulieren Sie Ihre Eingabe als Frage für bessere Ergebnisse.');
  }

  if (!/mietevo|immobilie|mieter|wohnung|haus|betriebskosten|nebenkosten/i.test(trimmed)) {
    suggestions.push('Beziehen Sie sich auf Mietevo-spezifische Themen für relevantere Antworten.');
  }

  return suggestions;
}