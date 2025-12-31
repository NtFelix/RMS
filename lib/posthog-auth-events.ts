/**
 * PostHog Authentication Event Tracking
 * 
 * Centralized utilities for tracking user authentication interactions.
 * All events are type-safe and GDPR-compliant.
 * 
 * Events are only captured if the user has explicitly opted in to tracking.
 */

import posthog from 'posthog-js';

// ============================================================================
// Event Names
// ============================================================================

export const AUTH_EVENTS = {
    // Login Events
    LOGIN_PAGE_VIEWED: 'auth_login_page_viewed',
    LOGIN_STARTED: 'auth_login_started',
    LOGIN_SUCCESS: 'auth_login_success',
    LOGIN_FAILED: 'auth_login_failed',

    // Registration Events
    REGISTER_PAGE_VIEWED: 'auth_register_page_viewed',
    REGISTER_STARTED: 'auth_register_started',
    REGISTER_SUCCESS: 'auth_register_success',
    REGISTER_FAILED: 'auth_register_failed',

    // Google OAuth Events
    GOOGLE_AUTH_INITIATED: 'auth_google_initiated',
    GOOGLE_AUTH_SUCCESS: 'auth_google_success',
    GOOGLE_AUTH_FAILED: 'auth_google_failed',
    GOOGLE_AUTH_CANCELLED: 'auth_google_cancelled',

    // Password Events
    PASSWORD_RESET_REQUESTED: 'auth_password_reset_requested',
    PASSWORD_RESET_EMAIL_SENT: 'auth_password_reset_email_sent',
    PASSWORD_RESET_FAILED: 'auth_password_reset_failed',
    PASSWORD_UPDATED: 'auth_password_updated',

    // Session Events
    SESSION_STARTED: 'auth_session_started',
    SESSION_EXPIRED: 'auth_session_expired',
    LOGOUT: 'auth_logout',

    // Email Verification Events
    EMAIL_VERIFICATION_SENT: 'auth_email_verification_sent',
    EMAIL_VERIFIED: 'auth_email_verified',
    EMAIL_VERIFICATION_FAILED: 'auth_email_verification_failed',

    // Onboarding Events
    ONBOARDING_STARTED: 'auth_onboarding_started',
    ONBOARDING_PLAN_VIEWED: 'auth_onboarding_plan_viewed',
    ONBOARDING_PLAN_SELECTED: 'auth_onboarding_plan_selected',
    ONBOARDING_COMPLETED: 'auth_onboarding_completed',
    ONBOARDING_SKIPPED: 'auth_onboarding_skipped',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export type AuthProvider = 'email' | 'google' | 'magic_link';
export type AuthFlow = 'login' | 'signup';
export type AuthErrorType =
    | 'invalid_credentials'
    | 'email_not_confirmed'
    | 'user_already_exists'
    | 'weak_password'
    | 'rate_limited'
    | 'network_error'
    | 'oauth_cancelled'
    | 'oauth_error'
    | 'unknown';

export type OnboardingPlan = 'free' | 'basic' | 'pro' | string;

/**
 * Details for subscription plan selection tracking
 */
export interface PlanSelectionDetails {
    planName: string;
    priceId: string;
    billingCycle: 'monthly' | 'yearly';
    priceAmount?: number; // Price in base currency (e.g., euros, not cents)
    currency?: string;
    position?: number; // Position in plan list (0 = free, 1 = basic, etc.)
}

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
 * Get common properties for all auth events
 */
function getCommonProperties() {
    return {
        timestamp: new Date().toISOString(),
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    };
}

// ============================================================================
// Login Tracking
// ============================================================================

/**
 * Track login page view
 */
export function trackLoginPageViewed() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.LOGIN_PAGE_VIEWED, {
        ...getCommonProperties(),
    });
}

/**
 * Track login started (form submission or OAuth initiated)
 */
export function trackLoginStarted(provider: AuthProvider) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.LOGIN_STARTED, {
        ...getCommonProperties(),
        provider,
    });
}

/**
 * Track successful login
 */
export function trackLoginSuccess(provider: AuthProvider, isNewUser: boolean = false) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.LOGIN_SUCCESS, {
        ...getCommonProperties(),
        provider,
        is_new_user: isNewUser,
    });
}

/**
 * Track failed login attempt
 */
export function trackLoginFailed(provider: AuthProvider, errorType: AuthErrorType) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.LOGIN_FAILED, {
        ...getCommonProperties(),
        provider,
        error_type: errorType,
    });
}

// ============================================================================
// Registration Tracking
// ============================================================================

/**
 * Track registration page view
 */
export function trackRegisterPageViewed() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.REGISTER_PAGE_VIEWED, {
        ...getCommonProperties(),
    });
}

/**
 * Track registration started
 */
export function trackRegisterStarted(provider: AuthProvider) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.REGISTER_STARTED, {
        ...getCommonProperties(),
        provider,
    });
}

/**
 * Track successful registration
 */
export function trackRegisterSuccess(provider: AuthProvider) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.REGISTER_SUCCESS, {
        ...getCommonProperties(),
        provider,
    });
}

/**
 * Track failed registration
 */
export function trackRegisterFailed(provider: AuthProvider, errorType: AuthErrorType) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.REGISTER_FAILED, {
        ...getCommonProperties(),
        provider,
        error_type: errorType,
    });
}

// ============================================================================
// Google OAuth Tracking
// ============================================================================

/**
 * Track Google OAuth initiated (button clicked)
 */
export function trackGoogleAuthInitiated(flow: AuthFlow) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.GOOGLE_AUTH_INITIATED, {
        ...getCommonProperties(),
        flow,
    });
}

/**
 * Track successful Google OAuth completion
 */
export function trackGoogleAuthSuccess(flow: AuthFlow, isNewUser: boolean = false) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.GOOGLE_AUTH_SUCCESS, {
        ...getCommonProperties(),
        flow,
        is_new_user: isNewUser,
    });
}

/**
 * Track failed Google OAuth
 */
export function trackGoogleAuthFailed(flow: AuthFlow, errorType: AuthErrorType, errorMessage?: string) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.GOOGLE_AUTH_FAILED, {
        ...getCommonProperties(),
        flow,
        error_type: errorType,
        error_message: errorMessage,
    });
}

/**
 * Track cancelled Google OAuth (user closed popup or cancelled)
 */
export function trackGoogleAuthCancelled(flow: AuthFlow) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.GOOGLE_AUTH_CANCELLED, {
        ...getCommonProperties(),
        flow,
    });
}

// ============================================================================
// Password Reset Tracking
// ============================================================================

/**
 * Track password reset request started
 */
export function trackPasswordResetRequested() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, {
        ...getCommonProperties(),
    });
}

/**
 * Track password reset email sent successfully
 */
export function trackPasswordResetEmailSent() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.PASSWORD_RESET_EMAIL_SENT, {
        ...getCommonProperties(),
    });
}

/**
 * Track password reset failed
 */
export function trackPasswordResetFailed(errorType: AuthErrorType) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.PASSWORD_RESET_FAILED, {
        ...getCommonProperties(),
        error_type: errorType,
    });
}

/**
 * Track password updated successfully
 */
export function trackPasswordUpdated() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.PASSWORD_UPDATED, {
        ...getCommonProperties(),
    });
}

// ============================================================================
// Session Tracking
// ============================================================================

/**
 * Track session started (user authenticated and session created)
 */
export function trackSessionStarted(provider: AuthProvider) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.SESSION_STARTED, {
        ...getCommonProperties(),
        provider,
    });
}

/**
 * Track session expired
 */
export function trackSessionExpired() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.SESSION_EXPIRED, {
        ...getCommonProperties(),
    });
}

/**
 * Track user logout
 */
export function trackLogout() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.LOGOUT, {
        ...getCommonProperties(),
    });
}

// ============================================================================
// Email Verification Tracking
// ============================================================================

/**
 * Track email verification sent
 */
export function trackEmailVerificationSent() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.EMAIL_VERIFICATION_SENT, {
        ...getCommonProperties(),
    });
}

/**
 * Track email verified successfully
 */
export function trackEmailVerified() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.EMAIL_VERIFIED, {
        ...getCommonProperties(),
    });
}

/**
 * Track email verification failed
 */
export function trackEmailVerificationFailed(errorType: AuthErrorType) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.EMAIL_VERIFICATION_FAILED, {
        ...getCommonProperties(),
        error_type: errorType,
    });
}

// ============================================================================
// Onboarding Tracking
// ============================================================================

/**
 * Track onboarding started
 */
export function trackOnboardingStarted(provider: AuthProvider) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.ONBOARDING_STARTED, {
        ...getCommonProperties(),
        provider,
    });
}

/**
 * Track onboarding plan viewed
 */
export function trackOnboardingPlanViewed(planName: OnboardingPlan) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.ONBOARDING_PLAN_VIEWED, {
        ...getCommonProperties(),
        plan_name: planName,
    });
}

/**
 * Track onboarding plan selected
 * 
 * Can be called with either:
 * - A PlanSelectionDetails object for full details
 * - Individual parameters for backwards compatibility
 */
export function trackOnboardingPlanSelected(
    planNameOrDetails: OnboardingPlan | PlanSelectionDetails,
    priceId?: string,
    billingCycle?: 'monthly' | 'yearly'
) {
    if (!canTrack()) return;

    // Determine if we received a details object or individual params
    const isDetailsObject = typeof planNameOrDetails === 'object' && planNameOrDetails !== null;

    const properties = isDetailsObject
        ? {
            ...getCommonProperties(),
            plan_name: planNameOrDetails.planName,
            price_id: planNameOrDetails.priceId,
            billing_cycle: planNameOrDetails.billingCycle,
            price_amount: planNameOrDetails.priceAmount,
            currency: planNameOrDetails.currency,
            position: planNameOrDetails.position,
        }
        : {
            ...getCommonProperties(),
            plan_name: planNameOrDetails,
            price_id: priceId,
            billing_cycle: billingCycle,
        };

    posthog.capture(AUTH_EVENTS.ONBOARDING_PLAN_SELECTED, properties);
}

/**
 * Track onboarding completed
 */
export function trackOnboardingCompleted(planName: OnboardingPlan) {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.ONBOARDING_COMPLETED, {
        ...getCommonProperties(),
        plan_name: planName,
    });
}

/**
 * Track onboarding skipped
 */
export function trackOnboardingSkipped() {
    if (!canTrack()) return;

    posthog.capture(AUTH_EVENTS.ONBOARDING_SKIPPED, {
        ...getCommonProperties(),
    });
}
