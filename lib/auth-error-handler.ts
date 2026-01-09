import type { AuthError } from "@supabase/supabase-js"

/**
 * Centralized authentication error handler for Supabase Auth errors.
 * 
 * Uses error.code as the primary identifier (more stable than error.message),
 * falling back to message matching for broader compatibility.
 * 
 * @see https://supabase.com/docs/reference/javascript/auth-error-codes
 */

/**
 * Mapping of URL error parameters to German error messages.
 * Used for errors passed via URL query parameters (e.g., from auth callbacks).
 * Declared as a constant outside the component to prevent recreation on each render.
 */
export const URL_ERROR_MESSAGES: Record<string, string> = {
    invalid_code: "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.",
    auth_failed: "Die Authentifizierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    unexpected_error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
    access_denied: "Zugriff verweigert.",
} as const

/**
 * Default error message when no specific error is identified.
 */
const DEFAULT_ERROR_MESSAGE = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."

/**
 * Mapping of Supabase error codes to German error messages.
 * These codes are more stable than error messages which may change between versions.
 * 
 * @see https://supabase.com/docs/reference/javascript/auth-error-codes
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
    // Authentication errors
    "invalid_credentials": "Ungültige E-Mail-Adresse oder Passwort. Bitte überprüfen Sie Ihre Eingaben.",
    "email_not_confirmed": "Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfen Sie Ihren Posteingang.",
    "user_already_exists": "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.",

    // Password errors
    "weak_password": "Das Passwort muss mindestens 6 Zeichen lang sein.",
    "same_password": "Das neue Passwort muss sich vom alten unterscheiden.",

    // Rate limiting
    "over_request_rate_limit": "Zu viele Anfragen. Bitte warten Sie einen Moment.",
    "over_email_send_rate_limit": "Zu viele E-Mail-Anfragen. Bitte warten Sie einen Moment.",
    "over_sms_send_rate_limit": "Zu viele SMS-Anfragen. Bitte warten Sie einen Moment.",

    // Session errors
    "session_not_found": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    "refresh_token_not_found": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",

    // OTP errors
    "otp_expired": "Der Bestätigungscode ist abgelaufen. Bitte fordern Sie einen neuen an.",
    "otp_disabled": "Einmalpasswörter sind deaktiviert.",
} as const

/**
 * Fallback message matching patterns for backwards compatibility.
 * Used when error.code is not available or not recognized.
 * 
 * Note: These patterns may change between Supabase versions.
 */
const MESSAGE_PATTERNS: Array<{ pattern: string; message: string }> = [
    // Login errors
    { pattern: "Invalid login credentials", message: "Ungültige E-Mail-Adresse oder Passwort. Bitte überprüfen Sie Ihre Eingaben." },
    { pattern: "Email not confirmed", message: "Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfen Sie Ihren Posteingang." },

    // Registration errors
    { pattern: "User already registered", message: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
    { pattern: "Password should be at least", message: "Das Passwort muss mindestens 6 Zeichen lang sein." },

    // Password update errors
    { pattern: "New password should be different", message: "Das neue Passwort muss sich vom alten unterscheiden." },

    // Rate limiting (handle both correct spelling and common typo)
    { pattern: "Too many requests", message: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
    { pattern: "rate limit exceeded", message: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
]

/**
 * Translates a Supabase AuthError into a German error message.
 * 
 * Strategy:
 * 1. First, try to match using error.code (most reliable)
 * 2. Fall back to message pattern matching
 * 3. Return the original error message if no match is found
 * 
 * @param error - The Supabase AuthError object
 * @returns A German error message suitable for display to users
 */
export function getAuthErrorMessage(error: AuthError): string {
    // Strategy 1: Use error code if available (preferred, more stable)
    if (error.code && error.code in ERROR_CODE_MESSAGES) {
        return ERROR_CODE_MESSAGES[error.code]
    }

    // Strategy 2: Fall back to message pattern matching
    const errorMessage = error.message || ""

    for (const { pattern, message } of MESSAGE_PATTERNS) {
        if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
            return message
        }
    }

    // Strategy 3: Return original message as fallback
    // This ensures users always see something meaningful
    return error.message || DEFAULT_ERROR_MESSAGE
}

/**
 * Gets the German error message for a URL error parameter.
 * 
 * @param errorParam - The error parameter from the URL query string
 * @returns A German error message, or a default message if not recognized
 */
export function getUrlErrorMessage(errorParam: string): string {
    return URL_ERROR_MESSAGES[errorParam] || DEFAULT_ERROR_MESSAGE
}
