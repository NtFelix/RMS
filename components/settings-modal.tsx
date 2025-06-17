"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { User as UserIcon, Mail, Lock, CreditCard } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  // State for subscription tab
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null); // Use the new extended type
  const [isLoadingSub, setIsLoadingSub] = useState(false); // Used for plan selection/checkout
  const [isFetchingStatus, setIsFetchingStatus] = useState(true); // For initial profile load
  // Removed plans and isLoadingPlans states, Pricing component handles its own fetching
  const [isCancellingSubscription, setIsCancellingSubscription] = useState<boolean>(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState<boolean>(false);


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

  const handlePlanSelected = async (priceId: string) => {
    setIsLoadingSub(true);
    try {
      if (!profile || !profile.email || !profile.id) {
        toast.error('Benutzerinformationen nicht verfügbar. Vorgang kann nicht fortgesetzt werden.');
        setIsLoadingSub(false);
        return;
      }

      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          customerEmail: profile.email, // Ensure profile.email is correctly populated
          userId: profile.id, // Ensure profile.id is correctly populated
          stripeCustomerId: profile.stripe_customer_id // Pass existing customer ID if available
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json(); // Assuming error response is JSON
        throw new Error(errorBody.error || `Checkout-Sitzung konnte nicht erstellt werden: ${response.statusText}`);
      }

      const { sessionId, url } = await response.json();

      if (url) { // If a URL is provided (e.g., for first-time subscriptions or specific Stripe setups)
        window.location.href = url;
      } else if (sessionId) { // Standard path: redirect to Stripe Checkout
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirectToCheckout error:', error);
            toast.error(error.message || 'Weiterleitung zu Stripe fehlgeschlagen.');
          }
        } else {
          throw new Error('Stripe.js nicht geladen.');
        }
      } else {
        throw new Error('Sitzungs-ID oder URL nicht von API erhalten.');
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      toast.error((error as Error).message || 'Vorgang konnte nicht gestartet werden.');
    } finally {
      setIsLoadingSub(false);
    }
  };

  // Original handleSubscribeClick can be removed or aliased to handlePlanSelected if its specific logic is no longer needed.

  const handleCancelSubscription = async () => {
    if (!profile || !profile.stripe_subscription_id) {
      toast.error("Abonnement-ID nicht gefunden. Kündigung nicht möglich.");
      return;
    }
    setIsCancellingSubscription(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSubscriptionId: profile.stripe_subscription_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Abo-Kündigung fehlgeschlagen.");
      }

      toast.success("Dein Abonnement wurde erfolgreich gekündigt.");
      await refreshUserProfile(); // Refresh profile to show updated status
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error((error as Error).message || "Abo-Kündigung fehlgeschlagen.");
    } finally {
      setIsCancellingSubscription(false);
    }
  };

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
    ? new Date(profile.stripe_current_period_end).toLocaleDateString()
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
            <p>Abo-Status wird geladen...</p>
          ) : subscriptionStatus === 'error' || !profile ? (
            <p className="text-red-500">Abo-Details konnten nicht geladen werden. Bitte stelle sicher, dass du angemeldet bist und versuche es erneut.</p>
          ) : (
            <>
              <div className="mb-4">
                { profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end && profile.stripe_current_period_end ? (
                  <p className="text-sm text-orange-500">
                    Dein Abonnement ist aktiv und wird zum <strong>{new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')}</strong> gekündigt.
                  </p>
                ) : subscriptionStatus === 'active' && currentPeriodEnd ? (
                  <p className="text-sm">Dein Abonnement ist aktiv bis: <strong>{currentPeriodEnd}</strong></p>
                ) : subscriptionStatus ? (
                  <p className="text-sm">Dein aktueller Abo-Status: <strong>{subscriptionStatus}</strong></p>
                ) : (
                  <p className="text-sm">Du hast derzeit kein aktives Abonnement.</p>
                )}

                {/* Additional status messages */}
                {subscriptionStatus === 'past_due' && (
                  <p className="text-sm text-orange-500">Dein Abonnement ist überfällig. Bitte aktualisiere deine Zahlungsmethode.</p>
                )}
                {/* Explicitly 'canceled' status (not just pending cancellation) */}
                {subscriptionStatus === 'canceled' && (profile.stripe_cancel_at_period_end === false || typeof profile.stripe_cancel_at_period_end === 'undefined') && (
                  <p className="text-sm">Dein Abonnement wurde gekündigt.</p>
                )}
                 {profile && typeof profile.currentWohnungenCount === 'number' && (
                  <p className="text-sm">
                    Genutzte Wohnungen: {profile.currentWohnungenCount ?? 0} / {profile.activePlan?.limitWohnungen ?? (profile.activePlan ? profile.activePlan.limitWohnungen : 'N/A')}
                  </p>
                )}
              </div>

              {/* Pricing component will handle its own loading and plan display */}
              <Pricing
                onSelectPlan={handlePlanSelected}
                // currentPlanId={profile?.activePlan?.priceId} // Removed: Pricing component does not accept this prop currently
                isLoading={isLoadingSub} // Pass the loading state for checkout process
              />
              {subscriptionStatus === 'active' && (
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="text-md font-semibold text-gray-800">Abonnement verwalten</h3>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isLoadingSub || isManagingSubscription || isCancellingSubscription || !profile?.stripe_customer_id}
                    className="w-full"
                    variant="outline"
                  >
                    {isManagingSubscription ? 'Wird geladen...' : 'Zahlungsmethode aktualisieren / Rechnungen'}
                  </Button>
                  <Button
                    onClick={handleCancelSubscription}
                    disabled={isLoadingSub || isCancellingSubscription || isManagingSubscription || !profile?.stripe_subscription_id}
                    variant="destructive"
                    className="w-full"
                  >
                    {isCancellingSubscription ? 'Wird gekündigt...' : 'Abonnement kündigen'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
