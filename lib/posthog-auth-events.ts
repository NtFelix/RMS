/**
 * PostHog Authentication Event Tracking
 * 
 * Unified, type-safe, and GDPR-compliant authentication tracking.
 * 
 * Uses a SINGLE event type "auth" with rich properties for:
 * - Action: signup, login, logout, password_reset, etc.
 * - Status: started, success, failed, cancelled
 * - Method: email, google, apple, magic_link, etc.
 * 
 * This design allows for easy extension of new auth methods
 * and flexible analytics queries in PostHog.
 */

import posthog from 'posthog-js';

// ============================================================================
// Event Names - Simplified to core events
// ============================================================================

export const AUTH_EVENTS = {
    // Core unified auth event
    AUTH: 'auth',

    // Onboarding events (separate as they have different context)
    ONBOARDING: 'onboarding',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Authentication method - extensible for future providers
 */
export type AuthMethod =
    | 'email'           // Email/password
    | 'google'          // Google OAuth
    | 'apple'           // Apple Sign In (future)
    | 'microsoft'       // Microsoft OAuth (future)
    | 'github'          // GitHub OAuth (future)
    | 'magic_link'      // Passwordless email link
    | 'sso'             // Enterprise SSO (future)
    | string;           // Allow custom methods

/**
 * Authentication action types
 */
export type AuthAction =
    | 'signup'          // New user registration
    | 'login'           // User login
    | 'logout'          // User logout
    | 'password_reset'  // Password reset flow
    | 'password_update' // Password change
    | 'email_verify'    // Email verification
    | 'session_refresh' // Session refresh
    | 'session_expire'; // Session expiration

/**
 * Authentication status
 */
export type AuthStatus =
    | 'started'     // Action initiated
    | 'success'     // Action completed successfully
    | 'failed'      // Action failed
    | 'cancelled';  // Action cancelled by user

/**
 * Detailed error types for failed auth attempts
 */
export type AuthErrorType =
    | 'invalid_credentials'
    | 'email_not_confirmed'
    | 'user_already_exists'
    | 'weak_password'
    | 'rate_limited'
    | 'network_error'
    | 'oauth_cancelled'
    | 'oauth_error'
    | 'expired_token'
    | 'unknown';

/**
 * Onboarding actions
 */
export type OnboardingAction =
    | 'started'         // User reached onboarding
    | 'plan_viewed'     // User viewed a plan
    | 'plan_selected'   // User selected a plan
    | 'completed'       // Onboarding completed
    | 'skipped';        // User skipped onboarding

/**
 * Auth event properties
 */
export interface AuthEventProperties {
    action: AuthAction;
    status: AuthStatus;
    method: AuthMethod;
    is_new_user?: boolean;
    error_type?: AuthErrorType;
    error_message?: string;
    flow?: 'login' | 'signup';  // For OAuth, which page initiated it
}

/**
 * Onboarding event properties
 */
export interface OnboardingEventProperties {
    action: OnboardingAction;
    auth_method?: AuthMethod;       // How user authenticated
    plan_name?: string;             // Stripe product name
    price_id?: string;              // Stripe price ID
    billing_cycle?: 'monthly' | 'yearly';
    price_amount?: number;          // Price in base currency
    currency?: string;              // Currency code
    position?: number;              // Plan position in list
}

/**
 * Subscription plan details for tracking
 */
export interface PlanSelectionDetails {
    planName: string;
    priceId: string;
    billingCycle: 'monthly' | 'yearly';
    priceAmount?: number;
    currency?: string;
    position?: number;
}

// Legacy type for backwards compatibility
export type AuthProvider = AuthMethod;
export type AuthFlow = 'login' | 'signup';
export type OnboardingPlan = string;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if PostHog is available and user has consented to tracking.
 * GDPR: Only tracks if user has explicitly opted in.
 */
function canTrack(): boolean {
    if (typeof window === 'undefined') return false;
    if (!posthog || typeof posthog.capture !== 'function') return false;

    // GDPR: Must have explicitly opted in
    if (!posthog.has_opted_in_capturing?.()) return false;

    return true;
}

/**
 * Get common properties for all events
 */
function getCommonProperties() {
    return {
        timestamp: new Date().toISOString(),
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    };
}

// ============================================================================
// Core Auth Tracking Function
// ============================================================================

/**
 * Track unified auth event
 * 
 * @example
 * // Login started with email
 * trackAuth({ action: 'login', status: 'started', method: 'email' })
 * 
 * // Google signup success
 * trackAuth({ action: 'signup', status: 'success', method: 'google', is_new_user: true })
 * 
 * // Login failed
 * trackAuth({ action: 'login', status: 'failed', method: 'email', error_type: 'invalid_credentials' })
 */
export function trackAuth(properties: AuthEventProperties) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.AUTH, {
        ...getCommonProperties(),
        ...properties,
    });
}

/**
 * Track onboarding event
 * 
 * @example
 * // Onboarding started
 * trackOnboarding({ action: 'started', auth_method: 'google' })
 * 
 * // Plan selected
 * trackOnboarding({ 
 *   action: 'plan_selected', 
 *   plan_name: 'Pro', 
 *   price_id: 'price_xxx',
 *   billing_cycle: 'monthly',
 *   price_amount: 19.99
 * })
 */
export function trackOnboarding(properties: OnboardingEventProperties) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.ONBOARDING, {
        ...getCommonProperties(),
        ...properties,
    });
}

// ============================================================================
// Convenience Functions (Simple API)
// ============================================================================

// --- Login ---

export function trackLoginStarted(method: AuthMethod = 'email') {
    trackAuth({ action: 'login', status: 'started', method });
}

export function trackLoginSuccess(method: AuthMethod = 'email', isNewUser: boolean = false) {
    trackAuth({ action: 'login', status: 'success', method, is_new_user: isNewUser });
}

export function trackLoginFailed(method: AuthMethod = 'email', errorType: AuthErrorType = 'unknown') {
    trackAuth({ action: 'login', status: 'failed', method, error_type: errorType });
}

// --- Signup ---

export function trackRegisterStarted(method: AuthMethod = 'email') {
    trackAuth({ action: 'signup', status: 'started', method });
}

export function trackRegisterSuccess(method: AuthMethod = 'email') {
    trackAuth({ action: 'signup', status: 'success', method, is_new_user: true });
}

export function trackRegisterFailed(method: AuthMethod = 'email', errorType: AuthErrorType = 'unknown') {
    trackAuth({ action: 'signup', status: 'failed', method, error_type: errorType });
}

// --- Social/OAuth (works for any provider) ---

export function trackSocialAuthInitiated(method: AuthMethod, flow: 'login' | 'signup') {
    trackAuth({ action: flow, status: 'started', method, flow });
}

export function trackSocialAuthSuccess(method: AuthMethod, flow: 'login' | 'signup', isNewUser: boolean = false) {
    trackAuth({ action: flow, status: 'success', method, is_new_user: isNewUser, flow });
}

export function trackSocialAuthFailed(method: AuthMethod, flow: 'login' | 'signup', errorType: AuthErrorType = 'oauth_error') {
    trackAuth({ action: flow, status: 'failed', method, error_type: errorType, flow });
}

export function trackSocialAuthCancelled(method: AuthMethod, flow: 'login' | 'signup') {
    trackAuth({ action: flow, status: 'cancelled', method, flow });
}

// --- Legacy Google-specific functions (for backwards compatibility) ---

export function trackGoogleAuthInitiated(flow: 'login' | 'signup') {
    trackSocialAuthInitiated('google', flow);
}

export function trackGoogleAuthSuccess(flow: 'login' | 'signup', isNewUser: boolean = false) {
    trackSocialAuthSuccess('google', flow, isNewUser);
}

export function trackGoogleAuthFailed(flow: 'login' | 'signup', errorType: AuthErrorType = 'oauth_error', errorMessage?: string) {
    if (!canTrack()) return;
    trackAuth({ action: flow, status: 'failed', method: 'google', error_type: errorType, error_message: errorMessage, flow });
}

export function trackGoogleAuthCancelled(flow: 'login' | 'signup') {
    trackSocialAuthCancelled('google', flow);
}

// --- Password Reset ---

export function trackPasswordResetRequested() {
    trackAuth({ action: 'password_reset', status: 'started', method: 'email' });
}

export function trackPasswordResetEmailSent() {
    trackAuth({ action: 'password_reset', status: 'success', method: 'email' });
}

export function trackPasswordResetFailed(errorType: AuthErrorType = 'unknown') {
    trackAuth({ action: 'password_reset', status: 'failed', method: 'email', error_type: errorType });
}

export function trackPasswordUpdated() {
    trackAuth({ action: 'password_update', status: 'success', method: 'email' });
}

// --- Session ---

export function trackSessionStarted(method: AuthMethod = 'email') {
    trackAuth({ action: 'login', status: 'success', method });
}

export function trackSessionExpired() {
    trackAuth({ action: 'session_expire', status: 'success', method: 'email' });
}

export function trackLogout() {
    trackAuth({ action: 'logout', status: 'success', method: 'email' });
}

// --- Email Verification ---

export function trackEmailVerificationSent() {
    trackAuth({ action: 'email_verify', status: 'started', method: 'email' });
}

export function trackEmailVerified() {
    trackAuth({ action: 'email_verify', status: 'success', method: 'email' });
}

export function trackEmailVerificationFailed(errorType: AuthErrorType = 'unknown') {
    trackAuth({ action: 'email_verify', status: 'failed', method: 'email', error_type: errorType });
}

// --- Onboarding ---

export function trackOnboardingStarted(authMethod: AuthMethod = 'email') {
    trackOnboarding({ action: 'started', auth_method: authMethod });
}

export function trackOnboardingPlanViewed(planName: string) {
    trackOnboarding({ action: 'plan_viewed', plan_name: planName });
}

/**
 * Track plan selection with details
 * Accepts either a PlanSelectionDetails object or individual params
 */
export function trackOnboardingPlanSelected(
    planNameOrDetails: string | PlanSelectionDetails,
    priceId?: string,
    billingCycle?: 'monthly' | 'yearly'
) {
    const isDetailsObject = typeof planNameOrDetails === 'object' && planNameOrDetails !== null;

    if (isDetailsObject) {
        trackOnboarding({
            action: 'plan_selected',
            plan_name: planNameOrDetails.planName,
            price_id: planNameOrDetails.priceId,
            billing_cycle: planNameOrDetails.billingCycle,
            price_amount: planNameOrDetails.priceAmount,
            currency: planNameOrDetails.currency,
            position: planNameOrDetails.position,
        });
    } else {
        trackOnboarding({
            action: 'plan_selected',
            plan_name: planNameOrDetails,
            price_id: priceId,
            billing_cycle: billingCycle,
        });
    }
}

export function trackOnboardingCompleted(planName?: string) {
    trackOnboarding({ action: 'completed', plan_name: planName });
}

export function trackOnboardingSkipped() {
    trackOnboarding({ action: 'skipped' });
}

// --- Legacy page view functions (kept for backwards compatibility) ---

export function trackLoginPageViewed() {
    // Can be implemented with page view if needed
}

export function trackRegisterPageViewed() {
    // Can be implemented with page view if needed
}
