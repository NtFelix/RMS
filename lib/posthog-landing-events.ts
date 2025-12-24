/**
 * PostHog Landing Page Event Tracking
 * 
 * Centralized utilities for tracking user interactions on landing pages.
 * All events are type-safe and follow a consistent property schema.
 */

import posthog from 'posthog-js';

// ============================================================================
// Event Names
// ============================================================================

export const LANDING_EVENTS = {
    // CTA Events
    CTA_CLICKED: 'cta_clicked',
    EXAMPLE_PDF_DOWNLOADED: 'example_pdf_downloaded',
    DEMO_REQUEST_CLICKED: 'demo_request_clicked',
    DEMO_CONFIRMED: 'demo_confirmed',

    // Navigation Events
    NAV_LINK_CLICKED: 'nav_link_clicked',
    NAV_DROPDOWN_OPENED: 'nav_dropdown_opened',
    NAV_LOGIN_CLICKED: 'nav_login_clicked',
    NAV_REGISTER_CLICKED: 'nav_register_clicked',
    NAV_LOGOUT_CLICKED: 'nav_logout_clicked',
    NAV_MOBILE_MENU_OPENED: 'nav_mobile_menu_opened',

    // Footer Events
    FOOTER_LINK_CLICKED: 'footer_link_clicked',
    FOOTER_SOCIAL_CLICKED: 'footer_social_clicked',

    // Pricing Events
    PRICING_PLAN_SELECTED: 'pricing_plan_selected',
    BILLING_CYCLE_CHANGED: 'billing_cycle_changed',
    PRICING_VIEW_ALL_CLICKED: 'pricing_view_all_clicked',

    // FAQ Events
    FAQ_QUESTION_EXPANDED: 'faq_question_expanded',

    // Scroll/Section Events
    SECTION_VIEWED: 'section_viewed',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export type CTASource = 'hero' | 'bottom_cta' | 'pricing' | 'navigation';

export type LandingSection =
    | 'hero'
    | 'features'
    | 'nebenkosten'
    | 'more_features'
    | 'pricing'
    | 'bottom_cta'
    | 'faq'
    | 'footer';

export type NavDropdown = 'produkte' | 'funktionen' | 'loesungen' | 'hilfe';

export type BillingCycle = 'monthly' | 'yearly';

export type FooterCategory = 'unternehmen' | 'plattform' | 'ressourcen' | 'rechtliches';

export type SocialPlatform = 'twitter' | 'email' | 'github' | 'linkedin';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if PostHog is available for tracking
 * Note: We check if PostHog is initialized and has not been explicitly opted out.
 * This works with opt_out_capturing_by_default configurations.
 */
function canTrack(): boolean {
    if (typeof window === 'undefined') return false;
    if (!posthog || typeof posthog.capture !== 'function') return false;

    // Check if PostHog has been explicitly opted out
    // has_opted_out_capturing returns true if user explicitly opted out
    if (posthog.has_opted_out_capturing?.()) return false;

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
// CTA Tracking
// ============================================================================

/**
 * Track CTA button clicks (Jetzt loslegen, etc.)
 */
export function trackCTAClicked(source: CTASource, buttonText: string = 'Jetzt loslegen') {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.CTA_CLICKED, {
        ...getCommonProperties(),
        source,
        button_text: buttonText,
    });
}

/**
 * Track example PDF download
 */
export function trackExamplePDFDownloaded(pdfUrl: string) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.EXAMPLE_PDF_DOWNLOADED, {
        ...getCommonProperties(),
        pdf_url: pdfUrl,
        source: 'hero',
    });
}

/**
 * Track demo request button click (opens modal)
 */
export function trackDemoRequestClicked(source: CTASource) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.DEMO_REQUEST_CLICKED, {
        ...getCommonProperties(),
        source,
    });
}

/**
 * Track demo confirmation (user confirms redirect to calendar)
 */
export function trackDemoConfirmed(calendarUrl: string) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.DEMO_CONFIRMED, {
        ...getCommonProperties(),
        calendar_url: calendarUrl,
    });
}

// ============================================================================
// Navigation Tracking
// ============================================================================

/**
 * Track navigation link clicks
 */
export function trackNavLinkClicked(linkName: string, href: string, dropdown?: NavDropdown) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_LINK_CLICKED, {
        ...getCommonProperties(),
        link_name: linkName,
        href,
        dropdown: dropdown || null,
    });
}

/**
 * Track navigation dropdown opened
 */
export function trackNavDropdownOpened(dropdownName: NavDropdown) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_DROPDOWN_OPENED, {
        ...getCommonProperties(),
        dropdown_name: dropdownName,
    });
}

/**
 * Track login button click in navigation
 */
export function trackNavLoginClicked() {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_LOGIN_CLICKED, {
        ...getCommonProperties(),
    });
}

/**
 * Track register button click in navigation
 */
export function trackNavRegisterClicked() {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_REGISTER_CLICKED, {
        ...getCommonProperties(),
    });
}

/**
 * Track logout button click in navigation
 */
export function trackNavLogoutClicked() {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_LOGOUT_CLICKED, {
        ...getCommonProperties(),
    });
}

/**
 * Track mobile menu opened
 */
export function trackNavMobileMenuOpened() {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.NAV_MOBILE_MENU_OPENED, {
        ...getCommonProperties(),
    });
}

// ============================================================================
// Footer Tracking
// ============================================================================

/**
 * Track footer link clicks
 */
export function trackFooterLinkClicked(linkName: string, category: FooterCategory, href: string) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.FOOTER_LINK_CLICKED, {
        ...getCommonProperties(),
        link_name: linkName,
        category,
        href,
    });
}

/**
 * Track footer social icon clicks
 */
export function trackFooterSocialClicked(platform: SocialPlatform, href: string) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.FOOTER_SOCIAL_CLICKED, {
        ...getCommonProperties(),
        platform,
        href,
    });
}

// ============================================================================
// Pricing Tracking
// ============================================================================

/**
 * Track pricing plan selection
 */
export function trackPricingPlanSelected(
    planName: string,
    priceId: string,
    billingCycle: BillingCycle,
    priceAmount: number,
    currency: string
) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.PRICING_PLAN_SELECTED, {
        ...getCommonProperties(),
        plan_name: planName,
        price_id: priceId,
        billing_cycle: billingCycle,
        price_amount: priceAmount,
        currency,
    });
}

/**
 * Track billing cycle toggle
 */
export function trackBillingCycleChanged(from: BillingCycle, to: BillingCycle) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.BILLING_CYCLE_CHANGED, {
        ...getCommonProperties(),
        from,
        to,
    });
}

/**
 * Track "View all plans" button click
 */
export function trackPricingViewAllClicked() {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.PRICING_VIEW_ALL_CLICKED, {
        ...getCommonProperties(),
    });
}

// ============================================================================
// Scroll/Section Tracking
// ============================================================================

/**
 * Track section viewed (for scroll-depth tracking)
 */
export function trackSectionViewed(
    section: LandingSection,
    timeOnPageMs: number,
    scrollDepthPercent: number
) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.SECTION_VIEWED, {
        ...getCommonProperties(),
        section,
        time_on_page_ms: timeOnPageMs,
        scroll_depth_percent: scrollDepthPercent,
    });
}

// ============================================================================
// FAQ Tracking
// ============================================================================

/**
 * Track FAQ question expanded
 */
export function trackFAQQuestionExpanded(questionText: string, questionIndex: number) {
    if (!canTrack()) return;

    posthog.capture(LANDING_EVENTS.FAQ_QUESTION_EXPANDED, {
        ...getCommonProperties(),
        question_text: questionText,
        question_index: questionIndex,
    });
}
