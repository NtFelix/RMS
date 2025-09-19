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
// Consolidated lucide-react import to include all used icons
import { User as UserIcon, Mail, Lock, CreditCard, Trash2, DownloadCloud, Info, Monitor, FlaskConical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase'; // Import and alias Profile type
import { getUserProfileForSettings } from '@/app/user-profile-actions'; // Import the server action
import Pricing from "@/app/modern/components/pricing"; // Corrected: Import Pricing component as default
import { useDataExport } from '@/hooks/useDataExport'; // Import the custom hook
import { useToast } from "@/hooks/use-toast"; // Import the custom toast hook
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCookie, setCookie } from "@/utils/cookies";
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from "@/constants/guide";

// Define a more specific type for the profile state in this component
interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  activePlan?: {
    priceId: string;
    name: string;
    price: number | null;
    currency: string;
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
  price: number | null;
  currency: string;
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
      "p-6 bg-muted/30 rounded-2xl border border-border/50 transition-all duration-300 hover:bg-muted/50 hover:shadow-md hover:border-ring/30",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

// Enhanced section component for better visual hierarchy
const SettingsSection = ({ title, description, children, className, ...props }: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => (
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
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [packageJsonVersion, setPackageJsonVersion] = useState<string>("v2.0.0"); // Initialize with updated hardcoded version
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

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
      if (open && activeTab === 'subscription') {
        await refreshUserProfile(); // Fetch profile
        // Plan fetching removed from here. Pricing component will fetch its own plans.
      }
    };

    fetchInitialData();
  }, [open, activeTab]);

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
  const handleEmailSave = async () => {
    if (email !== confirmEmail) {
      toast({
        title: "Fehler",
        description: "E-Mail stimmt nicht überein",
        variant: "destructive",
      })
      return
    }
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
      toast({
        title: "Fehler",
        description: "Passwörter stimmen nicht überein",
        variant: "destructive",
      })
      return
    }
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
        body: JSON.stringify({ stripeCustomerId: profile.stripe_customer_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kundenportal konnte nicht geöffnet werden.");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
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
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1 flex-1">
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
                  <div className="flex-shrink-0 w-36">
                    <Select
                      value={theme}
                      onValueChange={(value) => {
                        setTheme(value);
                        toast({
                          title: "Design geändert",
                          description: `${themeLabels[value as keyof typeof themeLabels]} aktiviert.`,
                          variant: "success",
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wählen Sie ein Design" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Hell</SelectItem>
                        <SelectItem value="dark">Dunkel</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
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
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      E-Mail bestätigen
                    </label>
                    <Input
                      type="email"
                      value={confirmEmail}
                      onChange={e => setConfirmEmail(e.target.value)}
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
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Passwort bestätigen
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
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
          <SettingsSection 
            title="Abonnement"
            description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsinformationen."
          >
            {isFetchingStatus ? (
              <SettingsCard>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Aktueller Plan:</span>
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Nächste Verlängerung am:</span>
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Genutzte Wohnungen:</span>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </SettingsCard>
            ) : subscriptionStatus === 'error' || !profile ? (
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
            ) : (
              <SettingsCard>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      {profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end && profile.stripe_current_period_end ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Aktueller Plan:</span>
                            <span className="text-sm font-semibold">{profile.activePlan?.name || 'Unbekannt'}</span>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              Dein Abonnement ist aktiv und wird zum <strong>{new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')}</strong> gekündigt.
                            </p>
                          </div>
                        </div>
                      ) : profile.stripe_subscription_status === 'active' && profile.activePlan ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Aktueller Plan:</span>
                            <span className="text-sm font-semibold">{profile.activePlan.name}</span>
                          </div>
                          {currentPeriodEnd && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Nächste Verlängerung am:</span>
                              <span className="text-sm font-medium">{currentPeriodEnd}</span>
                            </div>
                          )}
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Dein Abonnement ist aktiv.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Dein aktueller Abo-Status:</span>
                            <span className="text-sm font-medium">{profile.stripe_subscription_status ? profile.stripe_subscription_status.replace('_', ' ') : 'Nicht abonniert'}</span>
                          </div>
                          {(!profile.stripe_subscription_status || !['active', 'trialing'].includes(profile.stripe_subscription_status ?? '')) &&
                            !(profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end) && (
                              <p className="text-sm text-muted-foreground">Du hast derzeit kein aktives Abonnement.</p>
                            )}
                        </div>
                      )}

                      {profile && typeof profile.currentWohnungenCount === 'number' && profile.activePlan?.limitWohnungen != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Genutzte Wohnungen:</span>
                          <span className="text-sm font-medium">{profile.currentWohnungenCount} / {profile.activePlan.limitWohnungen}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {profile.stripe_customer_id && (
                    <div className="pt-4 border-t space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Du kannst dein Abonnement, deine Zahlungsmethoden und Rechnungen über das Stripe Kundenportal verwalten.
                      </p>
                      <Button
                        onClick={handleManageSubscription}
                        disabled={isManagingSubscription}
                        className="w-full"
                        variant="outline"
                      >
                        {isManagingSubscription ? 'Wird geladen...' : 'Abonnement verwalten (Stripe Portal)'}
                      </Button>
                    </div>
                  )}
                </div>
              </SettingsCard>
            )}
          </SettingsSection>
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
                        <SettingsCard key={f.flagKey} className="hover:scale-[1.01]">
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
                              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
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
      label: "Informationen",
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
                    <h4 className="text-sm font-medium">Rent-Managing-System (RMS)</h4>
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
        <DialogContent className="w-[900px] h-[80vh] max-w-[95vw] max-h-[95vh] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>Benutzereinstellungen und Kontoverwaltung.</DialogDescription>
          </DialogHeader>
          
          <div className="flex h-full overflow-hidden">
            {/* Enhanced sidebar navigation */}
            <nav className="w-48 min-w-[12rem] flex flex-col gap-2 py-4 px-3 mr-6 border-r border-border/50">
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight px-3">Einstellungen</h2>
                <p className="text-sm text-muted-foreground px-3 mt-1">
                  Verwalten Sie Ihre Kontoeinstellungen
                </p>
              </div>
              
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 outline-none text-left',
                    activeTab === tab.value
                      ? 'bg-primary text-primary-foreground shadow-sm font-medium scale-[1.02]'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground focus:bg-accent/60 focus:text-accent-foreground hover:scale-[1.01]',
                  )}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
            
            {/* Content area with enhanced scrolling */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto py-4 pr-2">
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
