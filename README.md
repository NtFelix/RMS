# Rent-Managing-System (RMS)

Das Rent-Managing-System oder auch RMS ist dazu da um Mieteingänge, Mieter und Wohnungen zu verwalten. 

Es ist mit einer Supabase Datenbank verbunden um alle Daten zentral zu speichern und einen einfachen Zugriff auf die Daten zu ermöglichen. Diese Daten werden im Webbrowser über html, css und in Kombination mit javascript verwaltet.

Das System bietet eine intelligente Benutzerführung mit unterschiedlichen Authentifizierungsflüssen je nach Einstiegspunkt - neue Nutzer werden nach der Anmeldung direkt zum Dashboard weitergeleitet, während wiederkehrende Nutzer auf der aktuellen Seite bleiben.

## Recent Updates

### PostHog Analytics Integration (NEW)
Comprehensive user behavior tracking and analytics with PostHog:
- **User Identification**: Automatic user identification across sessions
- **Event Tracking**: Detailed tracking of user actions and conversions
- **Funnel Analysis**: Built-in funnel analysis for key user journeys
- **Database Integration**: Connect Supabase data with PostHog for unified analytics
- **Custom Properties**: Track custom user properties and events
- **Privacy-First**: Built with privacy in mind, respecting user consent

### Smart Authentication Flow
Enhanced user experience with intelligent authentication routing:
- **"Jetzt loslegen" Flow**: Direct redirect to dashboard after authentication for new users
- **"Anmelden" Flow**: Stay on current page after authentication for returning users
- **Intent-Based Routing**: Uses sessionStorage to track user intent and redirect accordingly
- **Browser Requirements**: Requires sessionStorage support for proper functionality. The "Jetzt loslegen" flow will not work as expected in environments where sessionStorage is not available.
- **Error Handling**: Logs a warning to the console when sessionStorage is not available
- **Comprehensive Testing**: 70+ tests covering all authentication scenarios and edge cases

### Finance Landing Showcase (NEW)
A comprehensive finance showcase section has been added to the landing page, featuring:
- **Interactive Tabbed Interface**: Four tabs demonstrating different aspects of financial management
- **Visual Product Demonstrations**: Real screenshots of the finance dashboard and analytics
- **Comprehensive Feature Coverage**: Detailed explanations of filtering, searching, and tracking capabilities
- **Full Accessibility Support**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Responsive Design**: Optimized for all device sizes with touch-friendly interactions
- **Robust Error Handling**: Graceful fallbacks for image loading failures with retry mechanisms

### Enhanced Testing Infrastructure
- **Comprehensive Test Coverage**: Over 2000 lines of tests covering functionality, accessibility, and edge cases
- **Accessibility Testing**: Dedicated test suite ensuring WCAG 2.1 AA compliance
- **Performance Testing**: Memory leak prevention and cleanup verification
- **Integration Testing**: Cross-component interaction and landing page integration testing

## API Endpoints

### User Profile API (`/api/user/profile`)

The user profile endpoint provides comprehensive user information including subscription details and current usage statistics.

**GET** `/api/user/profile`

Returns user profile data with the following structure:
- `id` - User profile ID
- `email` - User's primary email from authentication
- `stripe_customer_id` - Stripe customer identifier
- `stripe_subscription_id` - Active Stripe subscription ID
- `stripe_subscription_status` - Current subscription status
- `stripe_price_id` - Associated Stripe price/plan ID
- `stripe_current_period_end` - Subscription period end date
- `stripe_cancel_at_period_end` - Whether subscription will cancel at period end
- `activePlan` - Detailed plan information from Stripe
- `hasActiveSubscription` - Boolean indicating active subscription status
- `currentWohnungenCount` - Current number of apartments managed by user

### Stripe Plans API (`/api/stripe/plans`)

The plans endpoint provides subscription plan information for the pricing component.

**GET** `/api/stripe/plans`

Returns an array of available subscription plans with the following structure:
- `id` - Stripe Price ID
- `name` - Plan display name
- `price` - Price in cents
- `currency` - Currency code (e.g., 'eur')
- `interval` - Billing interval ('month' or 'year')
- `interval_count` - Number of intervals
- `features` - Array of plan features
- `limit_wohnungen` - Maximum number of apartments allowed
- `priceId` - Stripe Price ID (same as id)
- `position` - Display order position
- `productName` - Common product name (e.g., "Basic", "Professional")
- `description` - Plan description from Stripe product

## Installation

```bash
npm install
```

## Starten

```bash
npm run dev
```

## Deployment

```bash
npm run build
npm run start
```

## Environment Variables

To run this project, you will need to set up the following environment variables. It's recommended to create a `.env.local` file in the root of your project for local development. This file should be included in your `.gitignore`.

-   `NEXT_PUBLIC_SUPABASE_URL`: The URL for your Supabase project.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for your Supabase project, used for client-side access.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project. This key has elevated privileges and should be used carefully, typically for backend operations or serverless functions (e.g., the Stripe webhook Supabase Edge Function).
-   `STRIPE_SECRET_KEY`: Your Stripe secret key (e.g., `sk_test_...` or `sk_live_...`). This is used for all backend Stripe API interactions.
-   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (e.g., `pk_test_...` or `pk_live_...`). This is used by Stripe.js on the frontend.
-   `STRIPE_WEBHOOK_SIGNING_SECRET`: Your Stripe webhook signing secret (e.g., `whsec_...`). This is used to verify the authenticity of webhooks received from Stripe, specifically in the Supabase `stripe-webhook` Edge Function.

Example `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SIGNING_SECRET=your_stripe_webhook_signing_secret
```

## Testing

The application includes comprehensive testing coverage across multiple areas:

### Test Structure
- **Unit Tests**: Component-level testing with Jest and React Testing Library
- **Integration Tests**: Cross-component interaction testing
- **Accessibility Tests**: WCAG 2.1 AA compliance verification
- **Performance Tests**: Memory leak and performance optimization testing

### Key Test Files
- `app/modern/components/finance-showcase.test.tsx` - Comprehensive Finance Showcase testing
- `app/modern/components/finance-showcase.accessibility.test.tsx` - Accessibility compliance testing
- `app/landing/page.integration.test.tsx` - Landing page integration testing
- `components/auth-modal-provider.test.tsx` - Authentication modal and flow testing (NEW)
- `app/modern/components/call-to-action.test.tsx` - Call-to-action button and intent testing (NEW)
- `app/modern/components/navigation.test.tsx` - Navigation and login flow testing (NEW)
- `app/auth/login/page.test.tsx` - Standalone login page testing (NEW)
- `integration/jetzt-loslegen-flow.test.tsx` - End-to-end authentication flow testing (NEW)

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- --coverage     # Run tests with coverage report

# Authentication Flow Tests
npm test -- --testPathPatterns="auth-modal-provider|call-to-action|navigation"
npm test -- components/auth-modal-provider.test.tsx
npm test -- app/modern/components/call-to-action.test.tsx
npm test -- app/modern/components/navigation.test.tsx
```

### Test Coverage Areas
- **Component Rendering**: Ensures all components render correctly
- **User Interactions**: Tab navigation, image modals, form submissions, authentication flows
- **Authentication Logic**: "Jetzt loslegen" vs "Anmelden" flow differentiation
- **Error Handling**: Network failures, image loading errors, sessionStorage issues, edge cases
- **Accessibility**: Keyboard navigation, screen reader support, WCAG compliance
- **Responsive Design**: Mobile and desktop layout testing
- **Performance**: Memory management and cleanup testing
- **Integration Testing**: End-to-end user flow validation

## Stripe Configuration

For the subscription plans and their associated features/limits to function correctly within the application, specific metadata fields must be configured on your Stripe Price objects.

When creating or updating products and their prices in your Stripe Dashboard:

-   **On the Price object (or its associated Product object as a fallback):**
    -   `features`: Add a metadata field with the key `features`. Its value should be a comma-separated string detailing the features of the plan. For example: `"Access to core features,Up to 5 projects,Basic email support"`. The application will parse this string into a list of features to display to the user.
    -   `limit_wohnungen`: Add a metadata field with the key `limit_wohnungen`. Its value should be a string representing the maximum number of 'Wohnungen' (apartments/listings) allowed for this plan. For example: `"5"`, `"10"`, `"25"`.
        -   If this field is missing, not a valid number, or set to `"0"` (or a negative number), the current backend implementation may interpret this as allowing an unlimited number of 'Wohnungen'. This behavior should be kept in mind when setting up plans.

Ensuring this metadata is correctly set in Stripe is crucial for the dynamic display of plan details and for the enforcement of plan limits (like the 'Wohnungen' count).

## Authentication Flow Architecture

The RMS platform features an intelligent authentication system that provides different user experiences based on entry point:

### Smart Authentication Routing
The authentication system differentiates between two primary user flows:

#### "Jetzt loslegen" Flow (Get Started)
- **Target Users**: New users ready to start using the platform
- **Behavior**: After successful authentication, users are automatically redirected to the dashboard (`/home`)
- **Intent Tracking**: Uses `sessionStorage` to track user intent across the authentication process
- **Components**: Hero section, CTA section call-to-action buttons

#### "Anmelden" Flow (Login)
- **Target Users**: Returning users who want to stay on the current page
- **Behavior**: After successful authentication, users remain on the landing page
- **Intent Clearing**: Clears any existing "get started" intent to prevent unwanted redirects
- **Components**: Navigation login button, mobile menu login

### Technical Implementation
```typescript
// Setting get-started intent
sessionStorage.setItem('authIntent', 'get-started');

// Checking intent after authentication
const authIntent = sessionStorage.getItem('authIntent');
if (authIntent === 'get-started') {
  sessionStorage.removeItem('authIntent');
  router.push('/home');
} else {
  router.refresh(); // Stay on current page
}
```

### Error Handling & Compatibility
- **SessionStorage Fallback**: Graceful degradation for browsers without sessionStorage support
- **Modal Cancellation**: Clears auth intent if user closes modal without authenticating
- **Cross-Browser Support**: Works consistently across all modern browsers
- **Error Recovery**: Handles sessionStorage errors without breaking functionality

### URL Parameter Support
The system also supports direct "get started" flow via URL parameters:
```
/landing?getStarted=true
```
This automatically opens the authentication modal with get-started intent.

## Landing Page Architecture

The modern landing page (`app/landing/page.tsx`) provides a comprehensive showcase of the RMS platform with the following structure:

1. **Navigation** - User authentication and navigation controls with smart login routing
2. **Hero Section** - Primary call-to-action with "Jetzt loslegen" button
3. **Feature Sections** - Core platform capabilities with product screenshots
4. **Finance Showcase** - Dedicated financial management demonstration (NEW)
5. **More Features** - Additional platform capabilities
6. **Pricing** - Subscription plans and pricing information
7. **Call-to-Action** - Final conversion opportunity with "Jetzt loslegen" button
8. **Footer** - Additional links and information

### Recent Landing Page Updates
- **Smart Authentication Flow**: Intelligent routing based on user entry point (NEW)
- **Finance Showcase Integration**: Added dedicated section showcasing financial management capabilities
- **Enhanced User Journey**: Improved flow from features to detailed finance demonstration to pricing
- **Responsive Design**: Optimized mobile experience across all sections
- **Performance Improvements**: Lazy loading and image optimization throughout

## Components
### Feature Sections (`app/modern/components/feature-sections.tsx`)

The feature sections component showcases the key capabilities of the RMS platform through an interactive, visually appealing layout on the modern landing page.

#### Recent Visual Improvements
- **Enhanced Image Rendering**: Improved image display with proper aspect ratio handling and responsive design
- **Modern Glass-morphism Effects**: Added backdrop blur and subtle border effects for a premium visual appearance
- **Optimized Image Loading**: Switched from `layout="fill"` to explicit width/height for better performance and Next.js 15 compatibility
- **Smooth Hover Interactions**: Refined hover effects with subtle scaling and gradient overlays
- **Performance Optimizations**: Added priority loading for above-the-fold images and improved object-fit handling
- **Keyboard Navigation**: Added Escape key support to close image preview modal for improved accessibility
- **React Hook Optimization**: Implemented `useCallback` and `useEffect` for better performance and memory management
- **Accessibility Enhancements**: Added proper ARIA labels for interactive elements including modal close buttons

#### Key Features
- **Responsive Layout**: Alternating left-right layout for visual variety on desktop
- **Motion Animations**: Smooth scroll-triggered animations using Framer Motion
- **Product Screenshots**: Real dashboard screenshots showcasing:
  - `haus-page.png`: House and tenant management interface
  - `nebenkosten-overview.png`: Operating costs calculation and overview
  - `finance-page.png`: Financial dashboard with income and expense tracking
- **Feature Highlights**: Bullet-point lists with check icons for each feature set
- **German Localization**: All content in German for the target market
- **Modern Visual Design**: Glass-morphism effects with backdrop blur and subtle borders for enhanced visual appeal

#### Visual Assets
The component now uses authentic product screenshots hosted on Supabase:
- **House Management**: Shows the property and tenant management interface
- **Operating Costs**: Displays the detailed operating cost calculation system
- **Financial Overview**: Demonstrates the comprehensive financial tracking dashboard

#### Component Structure
```javascript
const features = [
{
title: "Zentrale Haus- & Mieterverwaltung",
description: "...",
points: ["...", "...", "..."],
image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/haus-page.png",
image_alt: "Screenshot der Haus- und Mieterverwaltung im RMS Dashboard",
},
// Additional features...
]
```

### Call-to-Action Component (`app/modern/components/call-to-action.tsx`)

The Call-to-Action component provides the primary conversion buttons for the landing page, featuring intelligent authentication flow routing.

#### Key Features
- **Smart Authentication Intent**: "Jetzt loslegen" button sets get-started intent for dashboard redirect
- **Multiple Variants**: Supports hero, cta, and default variants with different secondary actions
- **Demo Booking Integration**: Alert dialog for scheduling product demonstrations
- **External Link Handling**: Notion calendar integration for demo bookings
- **Responsive Design**: Mobile-optimized button layouts and interactions

#### Authentication Flow Integration
```typescript
const handleGetStarted = () => {
  // Set intent for dashboard redirect after authentication
  sessionStorage.setItem('authIntent', 'get-started');
  openAuthModal('login');
};
```

#### Variant Behaviors
- **Hero Variant**: "Jetzt loslegen" + "Beispiel-Abrechnung" (PDF download link)
- **CTA Variant**: "Jetzt loslegen" + "Demo anfordern" (booking dialog)
- **Default Variant**: "Jetzt loslegen" + "Demo anfordern" (booking dialog)

### Finance Showcase (`app/modern/components/finance-showcase.tsx`)

The Finance Showcase is a comprehensive landing page component that demonstrates the financial management capabilities of the RMS platform through an interactive tabbed interface.

#### Key Features
- **Tabbed Interface**: Four distinct tabs showcasing different aspects of financial management
- **Interactive Navigation**: Smooth tab switching with keyboard and mouse support
- **Visual Demonstrations**: Product screenshots showing actual finance dashboard functionality
- **Responsive Design**: Mobile-first approach with touch-friendly interactions
- **Error Handling**: Robust image loading with fallback states and retry mechanisms
- **Accessibility**: Full WCAG 2.1 AA compliance with screen reader support

#### Tab Structure
The component features four main tabs:

1. **Dashboard Übersicht** - Central finance overview with key metrics and real-time data updates
2. **Charts & Analytics** - Interactive charts showing income/expense trends and distributions
3. **Transaktionsverwaltung** - Comprehensive transaction management with filtering and search
4. **Reporting & Export** - Financial reporting and data export capabilities for accounting

#### Technical Implementation
```typescript
interface FinanceTab {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  features: string[];
  dataCapabilities: {
    filtering: string[];
    searching: string[];
    tracking: string[];
  };
}
```

#### Integration
- **Landing Page Position**: Positioned between feature sections and pricing for optimal user journey
- **Design Consistency**: Uses the same UI components and styling patterns as other landing page sections
- **Performance Optimized**: Lazy loading, image optimization, and smooth animations using Framer Motion

#### Accessibility Features
- **Keyboard Navigation**: Full arrow key, Home/End key support for tab navigation
- **Screen Reader Support**: Proper ARIA labels, roles, and state management
- **Focus Management**: Visible focus indicators and logical tab order
- **High Contrast Support**: Compatible with high contrast mode and reduced motion preferences
- **Touch Accessibility**: Minimum 44px touch targets for mobile devices

#### Error Handling
- **Image Fallbacks**: Graceful degradation when product images fail to load
- **Retry Mechanism**: Manual retry option with "Erneut versuchen" button for failed image loads
- **Loading States**: Visual feedback during tab transitions and image loading
- **Error Recovery**: User-friendly error messages with retry options

#### Testing Coverage
- **Unit Tests**: Comprehensive test suite covering component functionality, error states, and edge cases
- **Accessibility Tests**: WCAG 2.1 AA compliance testing with screen reader simulation
- **Integration Tests**: Landing page integration and responsive behavior testing
- **Performance Tests**: Memory leak prevention and cleanup testing

### Navigation Component (`app/modern/components/navigation.tsx`)

The navigation component provides the primary site navigation and authentication controls with intelligent flow management.

#### Authentication Flow Features
- **Intent Clearing**: "Anmelden" button clears any existing get-started intent
- **User State Management**: Dynamic rendering based on authentication status
- **Mobile Navigation**: Responsive navigation with mobile-optimized authentication controls
- **Logout Handling**: Secure logout with proper state cleanup

#### Smart Login Behavior
```typescript
const handleOpenLoginModal = () => {
  // Clear any existing auth intent for regular login
  sessionStorage.removeItem('authIntent');
  openAuthModal('login');
};
```

#### Key Features
- **Responsive Design**: Mobile hamburger menu with full navigation options
- **User Avatar Display**: Shows user avatar when authenticated
- **Smooth Scrolling**: Anchor-based navigation for landing page sections
- **Brand Integration**: Consistent branding with logo and color scheme
- **Error Handling**: Graceful handling of sessionStorage and authentication errors

### Financial Analytics (`app/(dashboard)/finanzen/client-wrapper.tsx`)

The financial analytics component provides comprehensive financial tracking and projection calculations for property management.

#### Recent Calculation Improvements
- **Accurate Monthly Averages**: Improved average calculation logic that only considers months that have already passed in the current year
- **Time-Aware Projections**: Monthly averages now exclude future months to provide more realistic financial projections
- **Enhanced Yearly Projections**: Yearly cashflow projections based on actual historical data rather than including future months with zero values

#### Key Features
- **Monthly Income/Expense Tracking**: Aggregates financial data by month for detailed analysis
- **Average Monthly Calculations**: Calculates realistic monthly averages based only on elapsed months
- **Yearly Cashflow Projections**: Projects annual financial performance based on historical trends
- **Real-time Data Processing**: Processes financial entries to provide up-to-date analytics

#### Calculation Logic
The component now uses improved logic for financial averages:
```javascript
// Only consider months that have passed for accurate averages
const now = new Date();
const currentMonthIndex = now.getMonth(); // 0-based (0 = January)
const monthsPassed = currentMonthIndex + 1;
const totalsForPassedMonths = Object.entries(monthlyData).reduce(
(acc, [monthKey, data]) => {
const monthIndex = Number(monthKey);
if (monthIndex <= currentMonthIndex) {
acc.income += data.income;
acc.expenses += data.expenses;
}
return acc;
},
{ income: 0, expenses: 0 }
);
const averageMonthlyIncome = totalsForPassedMonths.income / monthsPassed;
const averageMonthlyExpenses = totalsForPassedMonths.expenses / monthsPassed;
```

This ensures that:
- **January calculations** use only January data (1 month)
- **June calculations** use January through June data (6 months)
- **December calculations** use the full year data (12 months)
- Future months with no data don't artificially lower the averages
### Operating Costs Table (`components/operating-costs-table.tsx`)

The operating costs table component manages the display and interaction with Betriebskosten (operating costs) data, providing access to water meter readings and cost calculations.

#### Recent Architectural Improvements
- **Modal Store Integration**: Migrated from local state management to centralized Zustand modal store
- **Enhanced Error Handling**: Improved error propagation and user feedback with toast notifications
- **Streamlined Data Flow**: Simplified modal opening process with better separation of concerns
- **Robust Error Recovery**: Better handling of partial failures when loading modal data

#### Key Features
- **Water Meter Modal Integration**: Opens Wasserzähler modal for meter readings management
- **Async Data Loading**: Fetches tenant and existing meter reading data before modal display
- **Error State Management**: Comprehensive error handling with user-friendly German messages
- **Loading State Indicators**: Visual feedback during data fetching operations

#### Modal Opening Process
The component follows a streamlined process for opening the water meter modal:

1. **Validation**: Checks for required `haeuser_id` and `jahr` fields
2. **Data Fetching**: Loads tenant data and existing meter readings in parallel
3. **Error Handling**: Provides specific error messages for different failure scenarios
4. **Modal Store Integration**: Uses `openWasserzaehlerModal()` from the global modal store

```typescript
// Simplified modal opening with modal store
const handleOpenWasserzaehlerModal = async (item: Nebenkosten) => {
  // Validation and data loading...
  openWasserzaehlerModal(
    item,
    mieterResult.data,
    existingReadings,
    handleSaveWasserzaehler
  );
};
```

#### Save Handler Improvements
The save handler now includes better error propagation to prevent modal closure on failures:

```typescript
const handleSaveWasserzaehler = async (data: WasserzaehlerFormData) => {
  try {
    const result = await saveWasserzaehlerData(data);
    if (result.success) {
      toast.success("Wasserzählerdaten erfolgreich gespeichert!");
      // Modal closes automatically on success
    } else {
      throw new Error(result.message); // Prevents modal from closing
    }
  } catch (error) {
    // Re-throw errors to prevent modal closure on failure
    throw error instanceof Error ? error : new Error("Unerwarteter Fehler");
  }
};
```

### Wasserzähler Modal (`components/wasserzaehler-modal.tsx`)

The water meter readings modal provides a comprehensive interface for managing water meter readings for tenants in operating cost calculations. This modal is now globally available in the dashboard layout.

#### Key Features
- **Centralized State Management**: Integrated with Zustand modal store for consistent state handling
- **Dirty State Tracking**: Automatically detects unsaved changes and prevents accidental data loss
- **Form Validation**: Real-time validation of meter readings and consumption values
- **Responsive Design**: Optimized layout for desktop and mobile devices with adaptive grid layouts
- **Error Handling**: Comprehensive error handling with user-friendly toast notifications
- **Data Persistence**: Automatic saving of form state with rollback capabilities
- **Global Availability**: Rendered in dashboard layout for access from any dashboard page

#### Modal State Management
The component uses the global modal store (`useModalStore`) with strongly typed state properties:
- `isWasserzaehlerModalOpen`: Controls modal visibility
- `wasserzaehlerNebenkosten?: Nebenkosten`: Typed operating cost data for the modal
- `wasserzaehlerMieterList: Mieter[]`: Strongly typed list of tenants for meter readings
- `wasserzaehlerExistingReadings?: Wasserzaehler[] | null`: Typed previously saved meter readings
- `wasserzaehlerOnSave?: (data: WasserzaehlerFormData) => Promise<void>`: Typed save callback function
- `isWasserzaehlerModalDirty`: Tracks unsaved changes
- `closeWasserzaehlerModal()`: Handles modal closing with dirty state checks
- `setWasserzaehlerModalDirty()`: Updates dirty state

#### Type Safety Improvements
Recent updates have enhanced type safety throughout the Wasserzähler modal system:
- **Strongly Typed Props**: All modal store properties now use proper TypeScript types instead of `any`
- **Type-Safe Callbacks**: The `openWasserzaehlerModal` function now accepts properly typed parameters
- **Enhanced IntelliSense**: Developers now get full autocomplete and type checking for all modal interactions
- **Runtime Safety**: Reduced risk of runtime errors through compile-time type validation

#### Form Data Structure
```typescript
interface WasserzaehlerFormEntry {
  mieter_id: string;
  mieter_name: string;
  ablese_datum: string | null;  // Date in YYYY-MM-DD format
  zaehlerstand: string | number; // Meter reading value
  verbrauch: string | number;    // Consumption amount
}

interface WasserzaehlerFormData {
  nebenkosten_id: string;
  entries: WasserzaehlerFormEntry[];
}
```

#### Recent Architectural Changes
- **Dashboard Layout Integration**: Modal is now rendered globally in the dashboard layout (`app/(dashboard)/layout.tsx`)
- **Automatic Dirty State Detection**: Compares current form data with initial state to track changes
- **Enhanced Error Handling**: Toast notifications for both success and error states with German localization
- **Forced Close Option**: Ability to force close modal after successful save operations
- **Deep Copy State Management**: Prevents reference issues with form state tracking
- **Improved UX**: Better feedback for user actions and form validation

#### Usage Pattern
The modal is automatically rendered in the dashboard layout and controlled through the global modal store:

```typescript
// Opening the modal from any dashboard component
const { openWasserzaehlerModal } = useModalStore();
openWasserzaehlerModal(
  nebenkosten,
  mieterList,
  existingReadings,
  handleSaveWasserzaehler
);

// The modal handles its own state and closing logic
// No need to import or render the modal component directly
```

#### Integration with Operating Costs
The modal is primarily accessed through the Operating Costs Table component, which handles:
- Data validation before opening the modal
- Fetching tenant and existing meter reading data
- Error handling for data loading failures
- Save callback implementation with proper error propagation

### Pricing Component (`app/modern/components/pricing.tsx`)

The pricing component provides a comprehensive subscription plan display with the following features:

#### Key Features
- **Dynamic Plan Loading**: Fetches subscription plans from `/api/stripe/plans`
- **Billing Cycle Toggle**: Switch between monthly and yearly pricing with automatic discount display
- **Plan Grouping**: Groups monthly and yearly versions of the same product together
- **Popular Plan Highlighting**: Automatically marks popular plans with badges and enhanced styling
- **User-Aware Button States**: Dynamic button text and states based on user subscription status
- **Trial Eligibility Detection**: Shows trial messaging for eligible users
- **German Localization**: All text and currency formatting in German

#### Component Props
```typescript
interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  userProfile: Profile | null;
  isLoading?: boolean; // Checkout processing state
}
```

#### Plan Data Structure
The component expects plan data with the following structure from the API:
```typescript
interface Plan {
  id: string;              // Stripe Price ID
  name: string;            // Plan display name
  price: number;           // Price in cents
  currency: string;        // Currency code
  interval: string | null; // 'month' or 'year'
  features: string[];      // Array of plan features
  limit_wohnungen?: number;// Apartment limit
  priceId: string;         // Stripe Price ID
  position?: number;       // Display order
  productName: string;     // Common product name
  description?: string;    // Plan description
}
```

#### Button States
The component intelligently handles different user states:
- **Logged out users**: "Kostenlos testen" (Start Free Trial)
- **Trial eligible users**: "Kostenlos testen" 
- **Non-trial eligible users**: "Abo auswählen" (Select Subscription)
- **Current plan users**: "Abonnement verwalten" (Manage Subscription)
- **Different plan users**: "Plan wechseln" (Switch Plan)
- **Processing state**: "Wird verarbeitet..." (Processing...)

#### Usage Example
```typescript
<Pricing 
  onSelectPlan={(priceId) => handlePlanSelection(priceId)}
  userProfile={userProfile}
  isLoading={isCheckoutProcessing}
/>
```

#### Stripe Metadata Requirements
For proper functionality, ensure your Stripe products include:
- `position`: Numeric value for display ordering
- `features`: Comma-separated feature list
- `limit_wohnungen`: Apartment limit for the plan
- Product descriptions for plan descriptions

## Lizenz

MIT

## Quellen

- [Supabase](https://supabase.com/)
- [Next.js](https://nextjs.org/)
- [Shadcn](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prisma](https://www.prisma.io/)
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
