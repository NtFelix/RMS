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

// Define a more specific type for the profile state in this component
interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  activePlan?: {
    name?: string;
    description?: string;
    price?: string;
    limitWohnungen?: number | null; // Ensure this matches API and Stripe logic
    // Add other plan details if needed
  } | null;
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
  const [isLoadingSub, setIsLoadingSub] = useState(false); // Renamed to avoid conflict with 'loading'
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);


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

  useEffect(() => {
    if (open && activeTab === 'subscription') {
      const getProfile = async () => {
        setIsFetchingStatus(true);
        try {
          const userProfileData = await getUserProfileForSettings();

          if (userProfileData.error) {
            console.error("Failed to fetch profile via server action:", userProfileData.error, userProfileData.details);
            toast.error(`Abo-Details konnten nicht geladen werden: ${userProfileData.error}`);
            // Set a minimal profile error state, ensuring it matches UserProfileWithSubscription
            // Attempt to preserve existing user email if available, otherwise default to empty string
            const currentEmail = profile?.email || ''; // Get email from existing profile state or default
            setProfile({
              id: profile?.id || '', // Preserve ID if available
              email: currentEmail, // Use existing email
              stripe_subscription_status: 'error',
              currentWohnungenCount: 0,
              activePlan: null,
              // Ensure all other required fields from SupabaseProfile are technically present or optional
              // For example, if 'username' is required by SupabaseProfile, it should be here.
              // However, UserProfileWithSubscription makes many fields from SupabaseProfile optional.
              // Adjust based on strictness of UserProfileWithSubscription and SupabaseProfile.
              // Assuming most SupabaseProfile fields are optional or handled by spreading `...profile` if profile exists
            } as UserProfileWithSubscription);
          } else {
            // The server action returns data structured like UserProfileForSettings,
            // which should be compatible with UserProfileWithSubscription.
            setProfile(userProfileData as UserProfileWithSubscription);
          }
        } catch (error) { // Catch unexpected errors from the server action call itself
          console.error("Exception when calling getUserProfileForSettings:", error);
          toast.error(`Ein unerwarteter Fehler ist aufgetreten: ${(error as Error).message}`);
          const currentEmail = profile?.email || '';
          setProfile({
            id: profile?.id || '',
            email: currentEmail,
            stripe_subscription_status: 'error',
            currentWohnungenCount: 0,
            activePlan: null,
          } as UserProfileWithSubscription); // Consistent error state
        } finally {
          setIsFetchingStatus(false);
        }
      };
      getProfile();
    }
  }, [open, activeTab, toast]);

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

  const handleSubscribeClick = async (priceId: string) => {
    setIsLoadingSub(true);
    try {
      if (!profile || !profile.email || !profile.id) {
        toast.error('Benutzerinformationen nicht verfügbar. Abonnement kann nicht fortgesetzt werden.');
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
          customerEmail: profile.email,
          userId: profile.id,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Checkout-Sitzung konnte nicht erstellt werden: ${errorBody}`);
      }

      const { sessionId, url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        const stripe = await stripePromise;
        if (stripe && sessionId) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirectToCheckout error:', error);
            toast.error(error.message || 'Weiterleitung zu Stripe fehlgeschlagen.');
          }
        } else {
          throw new Error('Stripe.js nicht geladen oder Sitzungs-ID fehlt.');
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error((error as Error).message || 'Abonnement konnte nicht gestartet werden.');
    } finally {
      setIsLoadingSub(false);
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
              <p className="text-sm">Dein aktueller Abo-Status: <strong>{subscriptionStatus || 'Nicht abonniert'}</strong></p>
              {subscriptionStatus === 'active' && currentPeriodEnd && (
                <p className="text-sm">Dein Abonnement ist aktiv bis: <strong>{currentPeriodEnd}</strong></p>
              )}
              {/* Display Wohnungen usage */}
              {profile && typeof profile.currentWohnungenCount === 'number' && (
                <p className="text-sm">
                  Genutzte Wohnungen: {profile.currentWohnungenCount ?? 0} / {profile.activePlan?.limitWohnungen ?? 'Unbegrenzt'}
                </p>
              )}
              {subscriptionStatus === 'past_due' && (
                <p className="text-sm text-orange-500">Dein Abonnement ist überfällig. Bitte aktualisiere deine Zahlungsmethode.</p>
              )}
              {subscriptionStatus === 'canceled' && (
                <p className="text-sm">Dein Abonnement wurde gekündigt.</p>
              )}

              {(!subscriptionStatus || subscriptionStatus === 'inactive' || subscriptionStatus === 'canceled') && (
                <Button onClick={() => handleSubscribeClick('price_basic_monthly_placeholder')} disabled={isLoadingSub || !profile?.id}>
                  {isLoadingSub ? 'Wird bearbeitet...' : 'Jetzt abonnieren (Basis-Plan)'}
                </Button>
              )}

              {subscriptionStatus === 'active' && (
                <div>
                  <p className="text-sm text-green-600 mb-2">Du bist derzeit abonniert. Vielen Dank!</p>
                  {/* TODO: Add button to manage subscription (portal) */}
                  {/* <Button>Manage Subscription</Button> */}
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
