"use client"

import { useState, useEffect } from "react"
import { usePostHog, useActiveFeatureFlags, useFeatureFlagEnabled } from 'posthog-js/react'
import { useRouter } from 'next/navigation'
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog" // DialogOverlay removed, DialogDescription added
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog";
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
// Only import icons that are actually used in this component
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  CreditCard, 
  Trash2, 
  DownloadCloud, 
  Info, 
  Monitor, 
  FlaskConical, 
  CheckCircle2, 
  AlertCircle,
  Circle,
  CheckCircle,
  PanelLeft,
  PanelLeftClose
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase'; // Import and alias Profile type
import { Elements, AddressElement } from '@stripe/react-stripe-js';
import { getUserProfileForSettings, getBillingAddress, updateBillingAddress, createSetupIntent } from '@/app/user-profile-actions'; // Import the server actions
import Pricing from "@/app/modern/components/pricing"; // Corrected: Import Pricing component as default
import { useDataExport } from '@/hooks/useDataExport'; // Import the custom hook
import SubscriptionPaymentMethods from '@/components/subscription-payment-methods';
import SubscriptionPaymentHistory from '@/components/subscription-payment-history';
import { useToast } from "@/hooks/use-toast"; // Import the custom toast hook
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { getCookie, setCookie } from "@/utils/cookies";
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from "@/constants/guide";
import { BILLING_COUNTRIES } from "@/lib/constants";
import { ThemeSwitcherCards } from "@/components/theme-switcher-cards";

// Define a more specific type for the profile state in this component
interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  activePlan?: {
    priceId: string;
    name: string;
    productName?: string;
    description?: string;
    price: number | null;
    currency: string;
    interval?: string | null;
    interval_count?: number | null;
    features: string[];
    limitWohnungen: number | null;
  } | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_cancel_at_period_end?: boolean | null; // Added for UI clarity
}

// Define the Plan type
interface Plan {
  id: string;
  name: string;
  productName?: string;
  description?: string;
  price: number | null;
  currency: string;
  interval?: string | null;
  interval_count?: number | null;
  features: string[];
  limitWohnungen: number | null;
  priceId: string; // priceId is the lookup key for Stripe
}

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// No separate import for lucide-react here as it's handled above

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void }
type Tab = { value: string; label: string; icon: React.ElementType; content: React.ReactNode }

// Enhanced card component for consistent styling
const SettingsCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

// Enhanced section component for better visual hierarchy
type SettingsSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SettingsSection = ({ title, description, children, className, ...props }: SettingsSectionProps) => (
  <div className={cn("space-y-4", className)} {...props}>
    {title && (
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )}
    {children}
  </div>
)

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [packageJsonVersion, setPackageJsonVersion] = useState<string>("v2.0.0"); // Initialize with updated hardcoded version
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [isSavingBilling, setIsSavingBilling] = useState<boolean>(false);
  const [isBillingAddressLoading, setIsBillingAddressLoading] = useState<boolean>(false);
  // Billing address state with proper typing
  const [billingAddress, setBillingAddress] = useState<{
    name: string;
    companyName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>({
    name: "",
    companyName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "DE", // Default to Germany
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [addressElementValue, setAddressElementValue] = useState<any>(null);
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [emailError, setEmailError] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<boolean>(false)

  // PostHog early access features
  const posthog = usePostHog()
  const activeFlags = useActiveFeatureFlags()
  const darkModeEnabled = useFeatureFlagEnabled('dark-mode')

  // Theme labels for toast messages
  const themeLabels = {
    light: 'Heller Modus',
    dark: 'Dunkler Modus',
    system: 'System-Modus'
  };

  type EarlyAccessStage = 'concept' | 'beta' | 'alpha' | 'other'
  interface EarlyAccessFeature {
    flagKey: string
    name: string
    description?: string
    documentationUrl?: string | null
    stage: EarlyAccessStage
    enabled?: boolean
  }

  // State for each feature stage
  const [alphaFeatures, setAlphaFeatures] = useState<EarlyAccessFeature[]>([])
  const [betaFeatures, setBetaFeatures] = useState<EarlyAccessFeature[]>([])
  const [conceptFeatures, setConceptFeatures] = useState<EarlyAccessFeature[]>([])
  const [otherFeatures, setOtherFeatures] = useState<EarlyAccessFeature[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false)
  const [useLocalFeatures, setUseLocalFeatures] = useState<boolean>(false)
  
  // Helper to get display name for each stage
  const getStageDisplayName = (stage: string) => {
    switch (stage) {
      case 'alpha': return 'Alpha';
      case 'beta': return 'Beta';
      case 'concept': return 'Geplant';
      default: return stage.charAt(0).toUpperCase() + stage.slice(1);
    }
  }

  // Account deletion states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false)
  const [reauthCode, setReauthCode] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [showDeleteAccountConfirmModal, setShowDeleteAccountConfirmModal] = useState(false);

  // State for subscription tab
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null); // Use the new extended type

  // Load billing address when modal is opened or profile changes
  useEffect(() => {
    const loadBillingAddress = async () => {
      if (open && profile?.stripe_customer_id) {
        setIsBillingAddressLoading(true);
        try {
          const result = await getBillingAddress(profile.stripe_customer_id);
          
          if ('error' in result) {
            console.error('Error loading billing address:', result.error);
            return;
          }
          
          // Update the billing address state with the loaded data
          setBillingAddress(prev => ({
            ...prev,
            name: result.name || '',
            companyName: result.companyName || '',
            line1: result.address?.line1 || '',
            line2: result.address?.line2 || '',
            city: result.address?.city || '',
            state: result.address?.state || '',
            postal_code: result.address?.postal_code || '',
            country: result.address?.country || 'DE',
          }));
          
          // Set the address as complete if we have the required fields
          if (result.address?.line1 && result.address.city && result.address.postal_code && result.address.country) {
            setIsAddressComplete(true);
          }
        } catch (error) {
          console.error('Error loading billing address:', error);
        } finally {
          setIsBillingAddressLoading(false);
        }
      }
    };
    
    loadBillingAddress();
  }, [open, profile?.stripe_customer_id]);
  // isLoadingSub removed as Pricing component is removed
  const [isFetchingStatus, setIsFetchingStatus] = useState(true); // For initial profile load
  // isCancellingSubscription removed
  const [isManagingSubscription, setIsManagingSubscription] = useState<boolean>(false);
  const { isExporting, handleDataExport: performDataExport } = useDataExport(); // Use the custom hook
  // Settings: Betriebskosten Guide visibility
  const [betriebskostenGuideEnabled, setBetriebskostenGuideEnabled] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getUser().then(res => {
      const user = res.data.user
      if (user) {
        setFirstName(user.user_metadata?.first_name || "")
        setLastName(user.user_metadata?.last_name || "")
        setEmail(user.email || "")
        setConfirmEmail(user.email || "")
      }
    });
    // Fetch package.json version
    // In a real app, you might fetch this from a server endpoint or build-time variable
    // For this example, simulating a fetch or direct import if possible (not directly in client component for package.json)
    // For now, we'll use a placeholder and update it in the next step if a package.json read is feasible.
    // As per user instruction, it will be hardcoded in the next step.
    // For now, just setting a loading state.
    // setPackageJsonVersion("0.1.0"); // Placeholder, will be properly set in the "Informationen" tab content step
  }, [supabase]);

  const refreshUserProfile = async () => {
    setIsFetchingStatus(true);
    try {
      const userProfileData = await getUserProfileForSettings();
      if ('error' in userProfileData && userProfileData.error) {
        console.error("Failed to fetch profile via server action:", userProfileData.error, userProfileData.details);
        toast({
          title: "Fehler",
          description: `Abo-Details konnten nicht geladen werden: ${userProfileData.error}`,
          variant: "destructive",
        });
        const currentEmail = profile?.email || '';
        setProfile({
          id: profile?.id || '',
          email: currentEmail,
          stripe_subscription_status: 'error',
          currentWohnungenCount: 0,
          activePlan: null,
        } as UserProfileWithSubscription);
      } else {
        setProfile(userProfileData as UserProfileWithSubscription);
      }
    } catch (error) {
      console.error("Exception when calling getUserProfileForSettings:", error);
      toast({
        title: "Fehler",
        description: `Ein unerwarteter Fehler ist aufgetreten (Profil): ${(error as Error).message}`,
        variant: "destructive",
      });
      const currentEmail = profile?.email || '';
      setProfile({
        id: profile?.id || '',
        email: currentEmail,
        stripe_subscription_status: 'error',
        currentWohnungenCount: 0,
        activePlan: null,
      } as UserProfileWithSubscription);
    } finally {
      setIsFetchingStatus(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!reauthCode) {
      toast({
        title: "Fehler",
        description: "Bestätigungscode ist erforderlich.",
        variant: "destructive",
      });
      return;
    }
    setIsDeleting(true);
    try {
      const localSupabase = createClient(); // Create a new client instance if needed or use the existing one
      const { error: functionError } = await localSupabase.functions.invoke("delete-user-account", {});

      if (functionError) {
        toast({
          title: "Fehler",
          description: `Fehler beim Löschen des Kontos: ${functionError.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Ihr Konto wurde erfolgreich gelöscht. Sie werden abgemeldet.",
          variant: "success",
        });
        const { error: signOutError } = await localSupabase.auth.signOut();
        if (signOutError) {
          // Log the error, but proceed with redirect as the account is deleted.
          // The redirect to login should resolve any client-side session inconsistencies.
          console.error("Error signing out after account deletion:", signOutError);
        }
        router.push("/auth/login"); // Redirect to login page
        if (onOpenChange) onOpenChange(false); // Close modal
      }
    } catch (error) {
      console.error("Delete account exception:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist beim Löschen des Kontos aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccountInitiation = async () => {
    setIsDeleting(true);
    setShowDeleteConfirmation(false); // Reset confirmation visibility
    try {
      // This call might trigger a CAPTCHA if enabled, or other checks.
      // For sensitive operations, Supabase might send a confirmation email even without explicit MFA.
      const { error } = await supabase.auth.reauthenticate();
      if (error) {
        toast({
          title: "Fehler",
          description: `Fehler bei der erneuten Authentifizierung: ${error.message}`,
          variant: "destructive",
        });
        setShowDeleteConfirmation(false);
      } else {
        setShowDeleteConfirmation(true);
        toast({
          title: "Erfolg",
          description: "Bestätigungscode wurde an Ihre E-Mail gesendet. Bitte Code unten eingeben.",
          variant: "success",
        });
        setShowDeleteAccountConfirmModal(false); // Close the confirmation modal on success
        // The UI for code input is already part of showDeleteConfirmation logic
      }
    } catch (error) {
      console.error("Reauthentication exception:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist bei der erneuten Authentifizierung aufgetreten.",
        variant: "destructive",
      });
      setShowDeleteConfirmation(false);
      setShowDeleteAccountConfirmModal(false); // Close the confirmation modal on error
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (open && (activeTab === 'subscription' || activeTab === 'profile')) {
        await refreshUserProfile();
      }
    };

    fetchInitialData();
  }, [open, activeTab]);

  useEffect(() => {
    if (open && profile?.stripe_customer_id) {
      const fetchClientSecret = async () => {
        const result = await createSetupIntent(profile.stripe_customer_id!);
        if ('error' in result) {
          toast({
            title: "Fehler",
            description: "Stripe konnte nicht initialisiert werden.",
            variant: "destructive",
          });
        } else {
          setClientSecret(result.clientSecret);
        }
      };
      fetchClientSecret();
    }
  }, [open, profile]);

  // When modal opens, initialize guide setting from cookie
  useEffect(() => {
    if (open) {
      const hidden = getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE);
      setBetriebskostenGuideEnabled(hidden !== 'true');
    }
  }, [open]);

  // Load early access features using PostHog JS SDK per docs
  useEffect(() => {
    if (!posthog || !posthog.__loaded) {
      console.log('PostHog not ready for early access features', { posthog: !!posthog, loaded: posthog?.__loaded });
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false);
      return;
    }
    
    // Check if user has opted in to capturing
    if (posthog.has_opted_out_capturing?.()) {
      console.log('PostHog tracking is opted out, early access features not available');
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false);
      return;
    }
    
    setIsLoadingFeatures(true)
    console.log('Loading early access features...');
    
    try {
      // Check if the method exists
      if (typeof posthog.getEarlyAccessFeatures !== 'function') {
        console.warn('getEarlyAccessFeatures method not available on PostHog instance');
        setUseLocalFeatures(true);
        setIsLoadingFeatures(false);
        return;
      }
      
      // Set a timeout to handle blocked requests
      const timeoutId = setTimeout(() => {
        console.warn('Early access features loading timed out (likely blocked by ad blocker)');
        setUseLocalFeatures(true);
        setIsLoadingFeatures(false);
      }, 5000); // 5 second timeout
      
      // force_reload = true to avoid cached list; include all stages
      // @ts-ignore: method is available on Web SDK, types may lag
      posthog.getEarlyAccessFeatures((features: EarlyAccessFeature[]) => {
        clearTimeout(timeoutId);
        console.log('Received early access features:', features);
        const active = activeFlags || []

        // Group features by their stage and add enabled status
        const featuresByStage: Record<string, EarlyAccessFeature[]> = {}

        features.forEach((f) => {
          const stage = f.stage || 'other'
          if (!featuresByStage[stage]) {
            featuresByStage[stage] = []
          }
          featuresByStage[stage].push({
            ...f,
            enabled: active.includes(f.flagKey)
          })
        })

        setBetaFeatures(featuresByStage['beta'] || [])
        setConceptFeatures(featuresByStage['concept'] || [])
        setAlphaFeatures(featuresByStage['alpha'] || [])
        setOtherFeatures(featuresByStage['other'] || [])
        setUseLocalFeatures(false);
        setIsLoadingFeatures(false)
        console.log('Early access features loaded and categorized');
      }, true, ['alpha', 'beta', 'concept'])
    } catch (e) {
      console.error('Failed to load early access features', e)
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posthog, posthog?.__loaded, JSON.stringify(activeFlags)])

  // Toggle early access enrollment
  const toggleEarlyAccess = async (flagKey: string, enable: boolean) => {
    console.log(`Toggling early access for ${flagKey}: ${enable}`);

    if (useLocalFeatures) {
      // Show error message when trying to toggle in blocked mode
      toast({
        title: "Fehler",
        description: "Early-Access-Funktionen sind nicht verfügbar. Bitte überprüfen Sie Ihre Browser-Einstellungen.",
        variant: "destructive",
      });
      return;
    }

    if (!posthog || !posthog.__loaded) {
      console.warn('PostHog not ready for toggling early access');
      toast({
        title: "Fehler",
        description: "PostHog ist nicht bereit. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
      return;
    }

    // Helper to update the enabled state for a feature in any state array
    const updateFeatureState = (prev: EarlyAccessFeature[]) =>
      prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: enable } : f))

    // Optimistic UI update for all feature states
    setAlphaFeatures(updateFeatureState)
    setBetaFeatures(updateFeatureState)
    setConceptFeatures(updateFeatureState)
    setOtherFeatures(updateFeatureState)

    try {
      // Check if the method exists
      if (typeof posthog.updateEarlyAccessFeatureEnrollment !== 'function') {
        throw new Error('updateEarlyAccessFeatureEnrollment method not available');
      }
      
      // @ts-ignore: available on Web SDK
      posthog.updateEarlyAccessFeatureEnrollment(flagKey, enable)
      
      // @ts-ignore: optional method to refresh flags
      if (typeof posthog.reloadFeatureFlags === 'function') {
        await posthog.reloadFeatureFlags();
        console.log(`Successfully toggled ${flagKey} and reloaded feature flags`);
      } else {
        console.log(`Successfully toggled ${flagKey} (reloadFeatureFlags not available)`);
      }
      
      // Show success toast
      toast({
        title: "Erfolg",
        description: `Feature "${flagKey}" wurde ${enable ? 'aktiviert' : 'deaktiviert'}.`,
        variant: "success",
      });
    } catch (e) {
      console.error('Failed to toggle early access', e)
      
      // Show error toast
      toast({
        title: "Fehler",
        description: `Feature konnte nicht ${enable ? 'aktiviert' : 'deaktiviert'} werden.`,
        variant: "destructive",
      });
      
      // Revert on error for all feature states
      const revertFeatureState = (prev: EarlyAccessFeature[]) =>
        prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: !enable } : f))

      setAlphaFeatures(revertFeatureState)
      setBetaFeatures(revertFeatureState)
      setConceptFeatures(revertFeatureState)
      setOtherFeatures(revertFeatureState)
    }
  }

  const handleProfileSave = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Profil speichern",
        variant: "destructive",
      })
    } else if (data.user) {
      const savedFirstName = data.user.user_metadata.first_name ?? '';
      const savedLastName = data.user.user_metadata.last_name ?? '';
      toast({
        title: "Erfolg",
        description: `Hallo ${savedFirstName} ${savedLastName}, Ihr Profil wurde erfolgreich gespeichert.`,
        variant: "success",
      })
    } else {
      // Fallback for when user data is not returned but no error occurred
      toast({
        title: "Erfolg",
        description: "Profil gespeichert",
        variant: "success",
      })
    }
  }

  const handleBillingAddressSave = async () => {
    if (!profile?.stripe_customer_id) {
      toast({
        title: "Fehler",
        description: "Stripe-Kunden-ID nicht gefunden.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all required fields are filled
    const requiredFields = [
      billingAddress.name,
      billingAddress.line1,
      billingAddress.city,
      billingAddress.postal_code,
      billingAddress.country
    ];
    
    const allFieldsFilled = requiredFields.every(field => Boolean(field));
    
    if (!allFieldsFilled) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Adressfelder aus.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingBilling(true);
    
    try {
      const result = await updateBillingAddress(
        profile.stripe_customer_id,
        {
          name: billingAddress.name,
          address: {
            line1: billingAddress.line1,
            line2: billingAddress.line2 || '',
            city: billingAddress.city,
            state: billingAddress.state || '',
            postal_code: billingAddress.postal_code,
            country: billingAddress.country,
          },
          companyName: billingAddress.companyName || '',
        }
      );
      
      // Update the address complete state
      setIsAddressComplete(allFieldsFilled);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: "Ihre Rechnungsadresse wurde erfolgreich gespeichert.",
          variant: "success",
        });
      } else {
        throw new Error(result.error || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Rechnungsadresse: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleEmailSave = async () => {
    if (email !== confirmEmail) {
      setEmailError(true)
      toast({
        title: "Fehler",
        description: "Die E-Mail-Adressen stimmen nicht überein.",
        variant: "destructive",
      })
      return
    }
    setEmailError(false)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim E-Mail speichern",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "E-Mail erfolgreich gespeichert",
        variant: "success",
      })
    }
  }
  const handlePasswordSave = async () => {
    if (password !== confirmPassword) {
      setPasswordError(true)
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      })
      return
    }
    setPasswordError(false)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Passwort speichern",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "Passwort erfolgreich gespeichert",
        variant: "success",
      })
    }
  }

  // handlePlanSelected removed as Pricing component is removed
  // handleCancelSubscription removed

  const handleManageSubscription = async () => {
    if (!profile || !profile.stripe_customer_id) {
      toast({
        title: "Fehler",
        description: "Kunden-ID nicht gefunden. Verwaltung nicht möglich.",
        variant: "destructive",
      });
      return;
    }
    setIsManagingSubscription(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stripeCustomerId: profile.stripe_customer_id,
          return_url: window.location.href
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kundenportal konnte nicht geöffnet werden.");
      }

      const { url } = await response.json();
      if (url) {
        // Validate URL has proper scheme
        try {
          new URL(url);
          window.location.href = url;
        } catch (urlError) {
          throw new Error("Ungültige URL für Kundenportal erhalten.");
        }
      } else {
        throw new Error("URL für Kundenportal nicht erhalten.");
      }
    } catch (error) {
      console.error("Manage subscription error:", error);
      toast({
        title: "Fehler",
        description: (error as Error).message || "Kundenportal konnte nicht geöffnet werden.",
        variant: "destructive",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // const handleDataExport = async () => { // Original function removed, now using hook
  //   setIsExporting(true);
  //   toast.info("Datenexport wird vorbereitet...");
  //   try {
  //     const response = await fetch('/api/export', {
  //       method: 'GET',
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || "Datenexport fehlgeschlagen.");
  //     }

  //     const blob = await response.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = "datenexport.zip";
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //     toast.success("Daten erfolgreich exportiert und heruntergeladen.");

  //   } catch (error) {
  //     console.error("Data export error:", error);
  //     toast.error((error as Error).message || "Datenexport fehlgeschlagen.");
  //   } finally {
  //     setIsExporting(false);
  //   }
  // };

  const subscriptionStatus = profile?.stripe_subscription_status;
  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE') // Apply de-DE locale for DD.MM.YYYY
    : null;

  const tabs: Tab[] = [
    {
      value: "profile",
      label: "Profil",
      icon: UserIcon,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="Persönliche Informationen"
            description="Verwalten Sie Ihre Profildaten und persönlichen Informationen."
          >
            <SettingsCard>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Vorname
                  </label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Nachname
                  </label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dieser Name wird für die Betriebskostenabrechnung verwendet.
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={handleProfileSave} disabled={loading} size="sm">
                  {loading ? "Speichern..." : "Profil speichern"}
                </Button>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection
            title="Rechnungsadresse"
            description="Verwalten Sie Ihre Rechnungsadresse für Rechnungen."
          >
            <SettingsCard>
              {isFetchingStatus || isBillingAddressLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Skeleton className="h-9 w-48" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="companyName" className="text-sm font-medium leading-none">
                        Firmenname (optional)
                      </label>
                      <Input
                        id="companyName"
                        value={billingAddress.companyName || ''}
                        onChange={(e) => setBillingAddress(prev => ({...prev, companyName: e.target.value}))}
                        placeholder="Firmenname"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium leading-none">
                        Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="name"
                        value={billingAddress.name || ''}
                        onChange={(e) => setBillingAddress(prev => ({...prev, name: e.target.value}))}
                        placeholder="Vor- und Nachname"
                        className="w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="line1" className="text-sm font-medium leading-none">
                      Straße und Hausnummer <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="line1"
                      value={billingAddress.line1 || ''}
                      onChange={(e) => setBillingAddress(prev => ({...prev, line1: e.target.value}))}
                      placeholder="Musterstraße 123"
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="line2" className="text-sm font-medium leading-none">
                      Adresszeile 2 (optional)
                    </label>
                    <Input
                      id="line2"
                      value={billingAddress.line2 || ''}
                      onChange={(e) => setBillingAddress(prev => ({...prev, line2: e.target.value}))}
                      placeholder="Zusätzliche Adresszeile"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="postal_code" className="text-sm font-medium leading-none">
                        PLZ <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="postal_code"
                        value={billingAddress.postal_code || ''}
                        onChange={(e) => setBillingAddress(prev => ({...prev, postal_code: e.target.value}))}
                        placeholder="12345"
                        className="w-full"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="city" className="text-sm font-medium leading-none">
                        Stadt <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="city"
                        value={billingAddress.city || ''}
                        onChange={(e) => setBillingAddress(prev => ({...prev, city: e.target.value}))}
                        placeholder="Musterstadt"
                        className="w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium leading-none">
                      Land <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={billingAddress.country || 'DE'}
                      onValueChange={(value) => setBillingAddress(prev => ({...prev, country: value}))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Land auswählen" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {/* DACH countries at the top */}
                        {BILLING_COUNTRIES.dach.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                        
                        <SelectSeparator className="my-1" />
                        
                        {/* Rest of Europe */}
                        {BILLING_COUNTRIES.europe.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                        
                        <SelectSeparator className="my-1" />
                        
                        {/* Major non-European countries */}
                        {BILLING_COUNTRIES.other.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleBillingAddressSave} 
                      disabled={isSavingBilling || !billingAddress.name || !billingAddress.line1 || !billingAddress.postal_code || !billingAddress.city || !billingAddress.country}
                      size="sm"
                    >
                      {isSavingBilling ? "Speichern..." : "Rechnungsadresse speichern"}
                    </Button>
                  </div>
                </div>
              )}
            </SettingsCard>
          </SettingsSection>

          <SettingsSection 
            title="Gefährliche Aktionen"
            description="Irreversible Aktionen, die Ihr Konto dauerhaft beeinträchtigen."
          >
            <SettingsCard className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Konto löschen</h4>
                    <p className="text-sm text-muted-foreground">
                      Alle Ihre Daten, einschließlich Häuser, Wohnungen, Mieter und Finanzdaten, werden unwiderruflich entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteAccountConfirmModal(true)}
                      disabled={isDeleting}
                      className="mt-3"
                    >
                      {isDeleting ? "Wird vorbereitet..." : "Konto löschen"}
                    </Button>
                  </div>
                </div>

                {showDeleteConfirmation && (
                  <div className="mt-4 p-4 border border-destructive/50 rounded-xl bg-destructive/10 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      Zur Bestätigung wurde ein Code an Ihre E-Mail-Adresse gesendet. Bitte geben Sie den Code hier ein, um die Kontolöschung abzuschließen.
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="reauthCode" className="text-sm font-medium text-destructive">
                        Bestätigungscode (OTP)
                      </label>
                      <Input
                        id="reauthCode"
                        type="text"
                        value={reauthCode}
                        onChange={e => setReauthCode(e.target.value)}
                        placeholder="Code aus E-Mail eingeben"
                        className="border-destructive focus:ring-destructive"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleConfirmDeleteAccount}
                      disabled={!reauthCode || isDeleting}
                      size="sm"
                      className="w-full"
                    >
                      {isDeleting ? "Wird gelöscht..." : "Code bestätigen und Konto löschen"}
                    </Button>
                  </div>
                )}
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      ),
    },
    {
      value: "display",
      label: "Darstellung",
      icon: Monitor,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="Darstellung"
            description="Passen Sie das Aussehen der Anwendung an Ihre Vorlieben an."
          >
            {darkModeEnabled && (
              <SettingsCard>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Design-Modus
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Wählen Sie zwischen hellem, dunklem Design oder folgen Sie den Systemeinstellungen.
                    </p>
                  </div>
                  <ThemeSwitcherCards />
                </div>
              </SettingsCard>
            )}
            
            <SettingsCard>
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Anleitung auf Betriebskosten-Seite
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Blendet die Schritt-für-Schritt Anleitung für die Betriebskostenabrechnung ein oder aus.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={betriebskostenGuideEnabled}
                    onCheckedChange={(checked) => {
                      setBetriebskostenGuideEnabled(checked);
                      // Persist in cookie and notify listeners
                      setCookie(BETRIEBSKOSTEN_GUIDE_COOKIE, checked ? 'false' : 'true', 365);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, { detail: { hidden: !checked } }));
                      }
                    }}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input hover:scale-105 transition-transform duration-150 ease-in-out"
                  />
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      ),
    },
    {
      value: "security",
      label: "Sicherheit",
      icon: Lock,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="E-Mail-Adresse"
            description="Ändern Sie Ihre E-Mail-Adresse für Ihr Konto."
          >
            <SettingsCard>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        E-Mail
                      </label>
                    </div>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative h-4 w-4 flex items-center justify-center">
                        {emailError ? (
                          <AlertCircle className="h-4 w-4 text-destructive absolute transition-opacity duration-200" />
                        ) : email && confirmEmail && email === confirmEmail ? (
                          <CheckCircle className="h-4 w-4 text-green-500 absolute transition-all duration-200" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/50 absolute transition-all duration-200" />
                        )}
                      </div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        E-Mail bestätigen
                      </label>
                    </div>
                    <Input
                      type="email"
                      value={confirmEmail}
                      onChange={e => {
                        setConfirmEmail(e.target.value)
                        setEmailError(false)
                      }}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleEmailSave} disabled={loading} size="sm">
                    {loading ? "Speichern..." : "E-Mail speichern"}
                  </Button>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection 
            title="Passwort"
            description="Ändern Sie Ihr Passwort für zusätzliche Sicherheit."
          >
            <SettingsCard>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Neues Passwort
                      </label>
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative h-4 w-4 flex items-center justify-center">
                        {passwordError ? (
                          <AlertCircle className="h-4 w-4 text-destructive absolute transition-opacity duration-200" />
                        ) : password && confirmPassword && password === confirmPassword ? (
                          <CheckCircle className="h-4 w-4 text-green-500 absolute transition-all duration-200" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/50 absolute transition-all duration-200" />
                        )}
                      </div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Passwort bestätigen
                      </label>
                    </div>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value)
                        setPasswordError(false)
                      }}
                      className="w-full"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handlePasswordSave} disabled={loading} size="sm">
                    {loading ? "Speichern..." : "Passwort speichern"}
                  </Button>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      ),
    },
    {
      value: "subscription",
      label: "Abo",
      icon: CreditCard,
      content: (
        <div className="space-y-6">
          {isFetchingStatus ? (
            <>
              {/* Subscription Overview Skeleton */}
              <SettingsSection 
                title="Abonnement-Übersicht"
                description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsdetails"
              >
                <SettingsCard className="space-y-6">
                  <div className="space-y-4">
                    {/* Plan Information Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-7 w-32" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Subscription Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-5 w-24" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </SettingsSection>

              {/* Payment Methods Skeleton */}
              <SettingsSection 
                title="Zahlungsmethoden"
                description="Verwalten Sie Ihre gespeicherten Zahlungsmethoden"
              >
                <SettingsCard>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <div></div>
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                    
                    {/* Credit Card Skeleton */}
                    <div className="flex justify-center">
                      <Skeleton className="w-full max-w-md aspect-[1.586/1] rounded-2xl" />
                    </div>
                    
                    {/* Card Details Skeleton */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </SettingsSection>

              {/* Payment History Skeleton */}
              <SettingsSection 
                title="Rechnungshistorie"
                description="Alle Ihre Rechnungen und Zahlungen im Überblick"
              >
                <SettingsCard>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div></div>
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                    
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </div>
                              <Skeleton className="h-4 w-48" />
                              <div className="flex items-center gap-4 text-sm">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-28" />
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <Skeleton className="h-6 w-20" />
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-16 rounded" />
                                <Skeleton className="h-8 w-12 rounded" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Invoice Line Items Skeleton */}
                          <div className="pt-2 border-t">
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SettingsCard>
              </SettingsSection>
            </>
          ) : subscriptionStatus === 'error' || !profile ? (
            <SettingsSection 
              title="Abonnement"
              description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsinformationen."
            >
              <SettingsCard className="border-destructive/20 bg-destructive/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <CreditCard className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive">
                    Abo-Details konnten nicht geladen werden. Bitte stelle sicher, dass du angemeldet bist und versuche es erneut.
                  </p>
                </div>
              </SettingsCard>
            </SettingsSection>
          ) : (
            <>
              {/* Subscription Overview Section */}
              <SettingsSection 
                title="Abonnement-Übersicht"
                description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsdetails"
              >
                <SettingsCard className="space-y-6">
                  {profile.activePlan ? (
                    <div className="space-y-4">
                      {/* Plan Information */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">
                              {profile.activePlan.productName || 'Abonnement'}
                            </h3>
                            {profile.stripe_subscription_status && (
                              <div className="inline-flex">
                                {profile.stripe_subscription_status === 'active' && (
                                  <div className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                                    Aktiv
                                  </div>
                                )}
                                {profile.stripe_subscription_status === 'trialing' && (
                                  <div className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                                    Testphase
                                  </div>
                                )}
                                {profile.stripe_subscription_status === 'canceled' && (
                                  <div className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full">
                                    Gekündigt
                                  </div>
                                )}
                                {profile.stripe_subscription_status === 'past_due' && (
                                  <div className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
                                    Überfällig
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {profile.activePlan.description && (
                            <p className="text-sm text-muted-foreground">
                              {profile.activePlan.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {profile.activePlan.price && (
                            <div className="text-2xl font-bold">
                              {(profile.activePlan.price / 100).toFixed(2)} {profile.activePlan.currency.toUpperCase()}
                            </div>
                          )}
                          {profile.activePlan.interval && (
                            <div className="text-sm text-muted-foreground">
                              {profile.activePlan.interval === 'month' ? 'Monatlich' : 
                               profile.activePlan.interval === 'year' ? 'Jährlich' : 
                               profile.activePlan.interval}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      {/* Subscription Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentPeriodEnd && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                              {profile.stripe_cancel_at_period_end ? 'Endet am' : 'Nächste Verlängerung'}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{currentPeriodEnd}</span>
                            </div>
                          </div>
                        )}

                        {profile.currentWohnungenCount !== undefined && profile.activePlan.limitWohnungen && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">Wohnungen genutzt</div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>{profile.currentWohnungenCount} / {profile.activePlan.limitWohnungen}</span>
                                <span className="text-muted-foreground">
                                  {Math.round((profile.currentWohnungenCount / profile.activePlan.limitWohnungen) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${Math.min((profile.currentWohnungenCount / profile.activePlan.limitWohnungen) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cancellation Notice */}
                      {profile.stripe_cancel_at_period_end && profile.stripe_current_period_end && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start gap-3">
                            <div>
                              <h4 className="font-medium text-orange-800 dark:text-orange-200">
                                Kündigung geplant
                              </h4>
                              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                Ihr Abonnement endet am {new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')}. 
                                Sie können es jederzeit über das Kundenportal reaktivieren.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Kein aktives Abonnement</h3>
                      <p className="text-muted-foreground mb-4">
                        Sie haben derzeit kein aktives Abonnement.
                      </p>
                    </div>
                  )}
                </SettingsCard>
              </SettingsSection>

              {/* Payment Methods Section */}
              <SettingsSection 
                title="Zahlungsmethoden"
                description="Verwalten Sie Ihre gespeicherten Zahlungsmethoden"
              >
                <SettingsCard>
                  <SubscriptionPaymentMethods 
                    profile={profile}
                  />
                </SettingsCard>
              </SettingsSection>

              {/* Payment History Section */}
              <SettingsSection 
                title="Rechnungshistorie"
                description="Alle Ihre Rechnungen und Zahlungen im Überblick"
              >
                <SettingsCard>
                  <SubscriptionPaymentHistory 
                    profile={profile}
                  />
                </SettingsCard>
              </SettingsSection>

              {profile.stripe_customer_id && (
                <SettingsSection 
                  title="Erweiterte Verwaltung"
                  description="Zusätzliche Optionen für Ihr Abonnement"
                >
                  <SettingsCard>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Du kannst dein Abonnement, deine Zahlungsmethoden und Rechnungen über das Stripe Kundenportal verwalten.
                      </p>
                      <Button
                        onClick={handleManageSubscription}
                        disabled={isManagingSubscription}
                        className="w-full"
                        variant="default"
                      >
                        {isManagingSubscription ? 'Wird geladen...' : 'Abonnement verwalten (Stripe Portal)'}
                      </Button>
                    </div>
                  </SettingsCard>
                </SettingsSection>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      value: "export",
      label: "Datenexport",
      icon: DownloadCloud,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="Daten exportieren"
            description="Laden Sie alle Ihre Daten als CSV-Dateien herunter, verpackt in einem ZIP-Archiv."
          >
            <SettingsCard>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <DownloadCloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium">Vollständiger Datenexport</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dies beinhaltet Daten zu Häusern, Wohnungen, Mietern, Finanzen und mehr.
                        Fremdschlüsselbeziehungen (Verknüpfungen zwischen Tabellen) werden nicht exportiert.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={performDataExport} 
                      disabled={isExporting} 
                      className="w-full sm:w-auto"
                      size="sm"
                    >
                      {isExporting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Exportiere...
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          Daten als ZIP herunterladen
                        </>
                      )}
                    </Button>
                    
                    {isExporting && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Der Export kann je nach Datenmenge einige Augenblicke dauern. Bitte haben Sie Geduld.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      ),
    },
    {
      value: "feature-preview",
      label: "Vorschau",
      icon: FlaskConical,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="Feature Vorschau"
            description="Verwalten Sie experimentelle Funktionen. Opt-in/Opt-out wirkt sofort für Ihr Konto."
          >
            {isLoadingFeatures ? (
              <SettingsCard>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </SettingsCard>
            ) : useLocalFeatures ? (
              <div className="space-y-4">
                <SettingsCard className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Early-Access-Funktionen können nicht geladen werden
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Die Verbindung zu unserem Feature-System konnte nicht hergestellt werden. Dies kann folgende Ursachen haben:
                        </p>
                      </div>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 list-disc">
                        <li>Werbeblocker oder Datenschutz-Erweiterungen blockieren die Anfragen</li>
                        <li>Cookies sind deaktiviert oder wurden nicht akzeptiert</li>
                        <li>Netzwerkverbindung ist eingeschränkt</li>
                      </ul>
                    </div>
                  </div>
                </SettingsCard>
                
                <SettingsCard className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          So können Sie das Problem beheben:
                        </h4>
                      </div>
                      <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                        <li>Stellen Sie sicher, dass Sie alle Cookies akzeptiert haben</li>
                        <li>Deaktivieren Sie temporär Ihren Werbeblocker für diese Seite</li>
                        <li>Erlauben Sie Anfragen an <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">eu.i.posthog.com</code> in Ihren Browser-Einstellungen</li>
                        <li>Laden Sie die Seite neu, nachdem Sie die Einstellungen geändert haben</li>
                      </ol>
                      <div className="pt-2">
                        <Button 
                          onClick={() => window.location.reload()} 
                          variant="outline"
                          size="sm"
                        >
                          Seite neu laden
                        </Button>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { stage: 'alpha', features: alphaFeatures },
                  { stage: 'beta', features: betaFeatures },
                  { stage: 'concept', features: conceptFeatures },
                  { stage: 'other', features: otherFeatures }
                ].filter(({ features }) => features.length > 0).map(({ stage, features }) => (
                  <div key={stage} className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      {getStageDisplayName(stage)}
                    </h3>
                    <div className="space-y-3">
                      {features.map((f) => (
                        <SettingsCard key={f.flagKey}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{f.name}</span>
                                {f.documentationUrl && (
                                  <a 
                                    className="text-xs text-muted-foreground underline hover:text-primary transition-colors" 
                                    href={f.documentationUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Dokumentation
                                  </a>
                                )}
                              </div>
                              {f.description && (
                                <p className="text-sm text-muted-foreground">{f.description}</p>
                              )}
                            </div>
                            <Switch
                              checked={!!f.enabled}
                              onCheckedChange={(checked) => toggleEarlyAccess(f.flagKey, checked)}
                              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input hover:scale-105 transition-transform duration-150 ease-in-out"
                              disabled={isLoadingFeatures}
                            />
                          </div>
                        </SettingsCard>
                      ))}
                    </div>
                  </div>
                ))}

                {[alphaFeatures, betaFeatures, conceptFeatures, otherFeatures].every(arr => arr.length === 0) && !isLoadingFeatures && (
                  <SettingsCard>
                    <div className="text-center py-8">
                      <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Derzeit sind keine Early-Access-Funktionen verfügbar.
                      </p>
                    </div>
                  </SettingsCard>
                )}

                <SettingsCard className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        Wichtiger Hinweis
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Diese Funktionen befinden sich in der Entwicklung und sind möglicherweise nicht vollständig funktionsfähig. Es kann zu unerwartetem Verhalten kommen. Bitte nutzen Sie diese Funktionen mit Vorsicht und melden Sie uns etwaige Probleme.
                      </p>
                    </div>
                  </div>
                </SettingsCard>
              </div>
            )}
          </SettingsSection>
        </div>
      )
    },
    {
      value: "information",
      label: "Mietfluss",
      icon: Info,
      content: (
        <div className="space-y-6">
          <SettingsSection 
            title="App Informationen"
            description="Informationen über Ihre Hausverwaltungssoftware."
          >
            <SettingsCard>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Mietfluss</h4>
                    <p className="text-sm text-muted-foreground">
                      Version: <span id="app-version" className="font-mono">{packageJsonVersion}</span>
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Dies ist Ihre Hausverwaltungssoftware. Bei Fragen oder Problemen wenden Sie sich bitte an den Support.
                  </p>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      )
    }
  ]

  // Effect to set the version number when the information tab is selected
  useEffect(() => {
    if (activeTab === 'information') {
      setPackageJsonVersion("v2.0.0");
    }
  }, [activeTab]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[900px] h-[80vh] max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>Benutzereinstellungen und Kontoverwaltung.</DialogDescription>
          </DialogHeader>
          
          <div className="flex h-full overflow-hidden p-6">
            {/* Vertical Tab-Style Sidebar with Animated Indicators */}
            <nav className={cn(
              "flex flex-col bg-background relative border-r border-border/50 rounded-2xl",
              "transition-all duration-500 ease-out",
              isSidebarCollapsed ? "w-20" : "w-60"
            )}>
              {/* Animated Background Accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none rounded-2xl" />
              
              {/* Floating Toggle Pill */}
              <div className={cn(
                "relative z-10 flex items-center justify-between p-4 pb-6",
                isSidebarCollapsed && "justify-center"
              )}>
                {!isSidebarCollapsed && (
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Einstellungen</h2>
                  </div>
                )}
                
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={cn(
                    "relative group h-9 w-9 rounded-lg transition-all duration-300",
                    "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
                    "hover:shadow-md active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isSidebarCollapsed && "mx-auto"
                  )}
                  aria-label={isSidebarCollapsed ? "Erweitern" : "Einklappen"}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isSidebarCollapsed ? (
                      <PanelLeft className="h-4 w-4 transition-transform group-hover:scale-110" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                </button>
              </div>
              
              {/* Vertical Tabs - Pill Shaped */}
              <div className="relative flex-1 px-2 pb-3">
                <div className="space-y-2">
                  {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          "group relative overflow-hidden transition-all duration-500 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
                          isSidebarCollapsed 
                            ? "h-11 w-11 rounded-full" 
                            : "w-full h-11 rounded-full"
                        )}
                        style={{
                          animationDelay: `${index * 50}ms`,
                          transform: isActive ? 'scale(1.02)' : 'scale(1)'
                        }}
                      >
                        {/* Animated Background Layer */}
                        <div className={cn(
                          "absolute inset-0 transition-all duration-500",
                          isSidebarCollapsed ? "rounded-full" : "rounded-full",
                          isActive
                            ? "bg-gradient-to-r from-primary via-primary to-primary/90 opacity-100"
                            : "bg-muted/30 opacity-0 group-hover:opacity-100"
                        )} />
                        
                        {/* Border Glow with Pulse */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                        )}
                        
                        {/* Hover Glow Effect */}
                        <div className={cn(
                          "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                          "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                        )} />
                        
                        {/* Content */}
                        <div className={cn(
                          "relative flex items-center h-full transition-all duration-500",
                          isSidebarCollapsed ? "justify-center px-2" : "px-2 gap-2.5"
                        )}>
                          {/* Icon Container with Glow */}
                          <div className="relative">
                            {isActive && (
                              <div className="absolute inset-0 bg-primary-foreground/30 blur-lg rounded-full animate-pulse" />
                            )}
                            <div className={cn(
                              "relative flex items-center justify-center rounded-full transition-all duration-500",
                              isSidebarCollapsed ? "h-7 w-7" : "h-7 w-7",
                              isActive
                                ? "bg-primary-foreground/20 shadow-lg scale-110"
                                : "bg-background/50 group-hover:bg-background/80 group-hover:scale-110"
                            )}>
                              <tab.icon className={cn(
                                "transition-all duration-500",
                                isActive 
                                  ? "h-4 w-4 text-primary-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                  : "h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:scale-110 group-hover:rotate-3"
                              )} />
                            </div>
                          </div>
                          
                          {/* Label */}
                          {!isSidebarCollapsed && (
                            <div className="flex-1 text-left min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate transition-all duration-500",
                                isActive ? "text-primary-foreground tracking-wide" : "text-foreground group-hover:text-foreground"
                              )}>
                                {tab.label}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Hover Tooltip for Collapsed - Pill Shaped */}
                        {isSidebarCollapsed && (
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 group-hover:translate-x-1">
                            <div className="relative">
                              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-popover border-l border-t border-border" />
                              <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl px-4 py-2 min-w-max">
                                <p className="text-sm font-semibold text-popover-foreground">{tab.label}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
            </nav>
            
            {/* Content area with enhanced scrolling */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6">
                <div className="max-w-3xl">
                  {tabs.find(tab => tab.value === activeTab)?.content}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ConfirmationAlertDialog
        isOpen={showDeleteAccountConfirmModal}
        onOpenChange={setShowDeleteAccountConfirmModal}
        title="Konto wirklich löschen?"
        description="Sind Sie sicher, dass Sie Ihr Konto endgültig löschen möchten? Dieser Schritt startet den Prozess zur sicheren Entfernung Ihrer Daten. Sie erhalten anschließend eine E-Mail zur Bestätigung."
        onConfirm={handleDeleteAccountInitiation}
        confirmButtonText="Löschen einleiten"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </>
  )
}
