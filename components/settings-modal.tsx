"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog";
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { User as UserIcon, Mail, Lock, CreditCard, Trash2, Download } from "lucide-react" // Added Download
import { Skeleton } from "@/components/ui/skeleton";
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase'; // Import and alias Profile type
import { getUserProfileForSettings } from '@/app/user-profile-actions'; // Import the server action
import Pricing from "@/app/modern/components/pricing"; // Corrected: Import Pricing component as default

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

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void }
type Tab = { value: string; label: string; icon: React.ElementType; content: React.ReactNode }

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

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
  const [isExporting, setIsExporting] = useState<boolean>(false); // State for export button


  useEffect(() => {
    supabase.auth.getUser().then(res => {
      const user = res.data.user
      if (user) {
        setFirstName(user.user_metadata?.first_name || "")
        setLastName(user.user_metadata?.last_name || "")
        setEmail(user.email || "")
        setConfirmEmail(user.email || "")
      }
    })
  }, [supabase])

  const refreshUserProfile = async () => {
    setIsFetchingStatus(true);
    try {
      const userProfileData = await getUserProfileForSettings();
      if ('error' in userProfileData && userProfileData.error) {
        console.error("Failed to fetch profile via server action:", userProfileData.error, userProfileData.details);
        toast.error(`Abo-Details konnten nicht geladen werden: ${userProfileData.error}`);
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
      toast.error(`Ein unerwarteter Fehler ist aufgetreten (Profil): ${(error as Error).message}`);
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

  const handleExportData = async () => {
    setIsExporting(true);
    toast.info("Datenexport wird vorbereitet...");
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Datenexport fehlgeschlagen.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datenexport.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Daten erfolgreich exportiert und heruntergeladen.");

    } catch (error) {
      console.error("Export error:", error);
      toast.error((error as Error).message || "Ein Fehler ist beim Exportieren der Daten aufgetreten.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!reauthCode) {
      toast.error("Bestätigungscode ist erforderlich.");
      return;
    }
    setIsDeleting(true);
    try {
      const localSupabase = createClient(); // Create a new client instance if needed or use the existing one
      const { error: functionError } = await localSupabase.functions.invoke("delete-user-account", {});

      if (functionError) {
        toast.error(`Fehler beim Löschen des Kontos: ${functionError.message}`);
      } else {
        toast.success("Ihr Konto wurde erfolgreich gelöscht. Sie werden abgemeldet.");
        await localSupabase.auth.signOut();
        router.push("/auth/login"); // Redirect to login page
        if (onOpenChange) onOpenChange(false); // Close modal
      }
    } catch (error) {
      console.error("Delete account exception:", error);
      toast.error("Ein unerwarteter Fehler ist beim Löschen des Kontos aufgetreten.");
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
        toast.error(`Fehler bei der erneuten Authentifizierung: ${error.message}`);
        setShowDeleteConfirmation(false);
      } else {
        setShowDeleteConfirmation(true);
        toast.success("Bestätigungscode wurde an Ihre E-Mail gesendet. Bitte Code unten eingeben.");
        // The UI for code input is already part of showDeleteConfirmation logic
      }
    } catch (error) {
      console.error("Reauthentication exception:", error);
      toast.error("Ein unerwarteter Fehler ist bei der erneuten Authentifizierung aufgetreten.");
      setShowDeleteConfirmation(false);
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

  const handleProfileSave = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
    setLoading(false)
    error ? toast.error("Fehler beim Profil speichern") : toast.success("Profil gespeichert")
  }
  const handleEmailSave = async () => {
    if (email !== confirmEmail) return toast.error("E-Mail stimmt nicht überein")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    error ? toast.error("Fehler beim E-Mail speichern") : toast.success("E-Mail gespeichert")
  }
  const handlePasswordSave = async () => {
    if (password !== confirmPassword) return toast.error("Passwörter stimmen nicht überein")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    error ? toast.error("Fehler beim Passwort speichern") : toast.success("Passwort gespeichert")
  }

  // handlePlanSelected removed as Pricing component is removed
  // handleCancelSubscription removed

  const handleManageSubscription = async () => {
    if (!profile || !profile.stripe_customer_id) {
      toast.error("Kunden-ID nicht gefunden. Verwaltung nicht möglich.");
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
      toast.error((error as Error).message || "Kundenportal konnte nicht geöffnet werden.");
    } finally {
      setIsManagingSubscription(false);
    }
  };

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
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium">Vorname</label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nachname</label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handleProfileSave} disabled={loading}>
            {loading ? "Speichern..." : "Profil speichern"}
          </Button>

          <div className="mt-6 pt-6 border-t border-destructive/50">
            <p className="text-sm text-muted-foreground mb-3">
              Hier können Sie Ihr Konto endgültig löschen. Alle Ihre Daten, einschließlich Häuser, Wohnungen, Mieter und Finanzdaten, werden unwiderruflich entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccountConfirmModal(true)}
              disabled={isDeleting} // Keep this disabled if any part of delete is in progress
              className="w-full"
            >
              {isDeleting ? "Wird vorbereitet..." : <><Trash2 className="mr-2 h-4 w-4" />Konto löschen</>}
            </Button>

            {showDeleteConfirmation && (
              <div className="mt-4 p-4 border border-destructive/50 rounded-md bg-destructive/5 space-y-3">
                <p className="text-sm text-destructive font-medium">
                  Zur Bestätigung wurde ein Code an Ihre E-Mail-Adresse gesendet. Bitte geben Sie den Code hier ein, um die Kontolöschung abzuschließen.
                </p>
                <div>
                  <label htmlFor="reauthCode" className="text-sm font-medium text-destructive">
                    Bestätigungscode (OTP)
                  </label>
                  <Input
                    id="reauthCode"
                    type="text" // Using text, but could be 'otp' if a dedicated component existed
                    value={reauthCode}
                    onChange={e => setReauthCode(e.target.value)}
                    placeholder="Code aus E-Mail eingeben"
                    className="mt-1 w-full border-destructive focus:ring-destructive"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDeleteAccount}
                  disabled={!reauthCode || isDeleting}
                  className="w-full"
                >
                  {isDeleting ? "Wird gelöscht..." : "Code bestätigen und Konto löschen"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "security",
      label: "Sicherheit",
      icon: Lock,
      content: (
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium">E-Mail</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bestätige E-Mail</label>
            <Input
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handleEmailSave} disabled={loading}>
            {loading ? "Speichern..." : "E-Mail speichern"}
          </Button>
          <div>
            <label className="text-sm font-medium">Passwort</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bestätige Passwort</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handlePasswordSave} disabled={loading}>
            {loading ? "Speichern..." : "Passwort speichern"}
          </Button>
        </div>
      ),
    },
    {
      value: "subscription",
      label: "Abo",
      icon: CreditCard,
      content: (
        <div className="flex flex-col space-y-4">
          {isFetchingStatus ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Aktueller Plan: <Skeleton className="h-4 w-32 inline-block" /></p>
                <Skeleton className="h-4 w-48" /> {/* For status message */}
              </div>
              <div className="space-y-1">
                <p className="text-sm">Nächste Verlängerung am: <Skeleton className="h-4 w-24 inline-block" /></p>
              </div>
              <div className="space-y-1">
                 <p className="text-sm">Genutzte Wohnungen: <Skeleton className="h-4 w-20 inline-block" /></p>
              </div>
              {/* Skeleton for Manage Subscription Button section */}
              <div className="mt-6 pt-4 border-t">
                <Skeleton className="h-4 w-3/4 mb-2" /> {/* For description paragraph */}
                <Skeleton className="h-10 w-full" /> {/* For button */}
              </div>
            </div>
          ) : subscriptionStatus === 'error' || !profile ? (
            <p className="text-red-500">Abo-Details konnten nicht geladen werden. Bitte stelle sicher, dass du angemeldet bist und versuche es erneut.</p>
          ) : (
            <>
              {/* Simplified Subscription Info Display */}
              <div className="space-y-2 mb-4">
                {profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end && profile.stripe_current_period_end ? (
                  <>
                    <p className="text-sm font-medium">Aktueller Plan: <strong>{profile.activePlan?.name || 'Unbekannt'}</strong></p>
                    <p className="text-sm text-orange-500">
                      Dein Abonnement ist aktiv und wird zum <strong>{new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')}</strong> gekündigt.
                    </p>
                  </>
                ) : profile.stripe_subscription_status === 'active' && profile.activePlan ? (
                  <>
                    <p className="text-sm font-medium">Aktueller Plan: <strong>{profile.activePlan.name}</strong></p>
                    {currentPeriodEnd && (
                      <p className="text-sm">Nächste Verlängerung am: <strong>{currentPeriodEnd}</strong></p>
                    )}
                    <p className="text-sm text-green-600">Dein Abonnement ist aktiv.</p>
                  </>
                ) : (
                  <p className="text-sm">
                    Dein aktueller Abo-Status: <strong>{profile.stripe_subscription_status ? profile.stripe_subscription_status.replace('_', ' ') : 'Nicht abonniert'}</strong>.
                  </p>
                )}

                {/* Message for truly non-active states */}
                { (!profile.stripe_subscription_status || !['active', 'trialing'].includes(profile.stripe_subscription_status ?? '')) &&
                  ! (profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end) && (
                  <p className="text-sm mt-2">Du hast derzeit kein aktives Abonnement.</p>
                )}

                {/* Display Wohnungen usage - keep if still relevant */}
                {profile && typeof profile.currentWohnungenCount === 'number' && profile.activePlan?.limitWohnungen != null && (
                  <p className="text-sm mt-2">
                    Genutzte Wohnungen: {profile.currentWohnungenCount} / {profile.activePlan.limitWohnungen}
                  </p>
                )}
              </div>

              {/* REMOVED: Pricing component for plan overview */}

              {/* Manage Subscription Button - visible if user has a stripe_customer_id */}
              {profile.stripe_customer_id && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm mb-2 text-gray-600">
                    Du kannst dein Abonnement, deine Zahlungsmethoden und Rechnungen über das Stripe Kundenportal verwalten.
                  </p>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isManagingSubscription} // Only disable if this specific action is loading
                    className="w-full"
                    variant="outline"
                  >
                    {isManagingSubscription ? 'Wird geladen...' : 'Abonnement verwalten (Stripe Portal)'}
                  </Button>
                </div>
              )}
              {/* REMOVED: Cancel Subscription button and logic */}
            </>
          )}
        </div>
      ),
    },
    {
      value: "export",
      label: "Datenexport",
      icon: Download, // Using the imported Download icon
      content: (
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            Hier können Sie alle Ihre eingegebenen Daten als CSV-Dateien herunterladen. Die Dateien werden in einem ZIP-Archiv zusammengefasst.
            Dieser Vorgang kann je nach Datenmenge einige Augenblicke dauern.
          </p>
          <Button onClick={handleExportData} disabled={isExporting}>
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exportiere Daten...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Daten herunterladen
              </>
            )}
          </Button>
          {isExporting && (
            <p className="text-xs text-muted-foreground text-center">
              Bitte warten Sie, der Download startet automatisch, sobald die Daten aufbereitet wurden.
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[700px] h-[75vh] max-w-full max-h-full overflow-hidden mt-2 ml-2">
            <DialogTitle className="sr-only">Einstellungen</DialogTitle>
          <div className="flex h-full overflow-hidden">
            <nav className="w-36 min-w-[9rem] flex flex-col gap-1 py-1 px-0 mr-4 sticky top-0">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md transition-colors outline-none',
                  activeTab === tab.value
                    ? 'bg-accent text-accent-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:bg-muted focus:bg-accent/60 focus:text-accent-foreground',
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex-1 flex flex-col">
            <section className="flex-1 overflow-y-auto p-3">
              {tabs.find(tab => tab.value === activeTab)?.content}
            </section>
            </div> {/* Corrected from </nav> to </div> and removed duplicated block */}
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
