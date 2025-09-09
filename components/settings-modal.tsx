"use client"

import { useState, useEffect } from "react"
import { usePostHog, useActiveFeatureFlags, useFeatureFlagEnabled } from 'posthog-js/react'
import { useRouter } from 'next/navigation'
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { User as UserIcon, Mail, Lock, CreditCard, Trash2, DownloadCloud, Info, Monitor, FlaskConical } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { loadStripe } from '@stripe/stripe-js'
import type { Profile as SupabaseProfile } from '@/types/supabase'
import { getUserProfileForSettings } from '@/app/user-profile-actions'
import { useDataExport } from '@/hooks/useDataExport'
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCookie, setCookie } from "@/utils/cookies"
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from "@/constants/guide"

// ------- Types & Stripe Promise ----------
interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number
  activePlan?: {
    priceId: string
    name: string
    price: number | null
    currency: string
    features: string[]
    limitWohnungen: number | null
  } | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_cancel_at_period_end?: boolean | null
  stripe_subscription_status?: string
  stripe_current_period_end?: string
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void }
type Tab = { value: string; label: string; icon: React.ElementType; content: React.ReactNode }

type EarlyAccessStage = 'concept' | 'beta' | 'alpha' | 'other'
interface EarlyAccessFeature {
  flagKey: string
  name: string
  description?: string
  documentationUrl?: string | null
  stage: EarlyAccessStage
  enabled?: boolean
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [packageJsonVersion, setPackageJsonVersion] = useState<string>("v2.0.0")
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const posthog = usePostHog()
  const activeFlags = useActiveFeatureFlags()
  const darkModeEnabled = useFeatureFlagEnabled('dark-mode')
  const themeLabels = {
    light: 'Heller Modus',
    dark: 'Dunkler Modus',
    system: 'System-Modus'
  }

  const [alphaFeatures, setAlphaFeatures] = useState<EarlyAccessFeature[]>([])
  const [betaFeatures, setBetaFeatures] = useState<EarlyAccessFeature[]>([])
  const [conceptFeatures, setConceptFeatures] = useState<EarlyAccessFeature[]>([])
  const [otherFeatures, setOtherFeatures] = useState<EarlyAccessFeature[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false)
  const [useLocalFeatures, setUseLocalFeatures] = useState<boolean>(false)

  const getStageDisplayName = (stage: string) => {
    switch (stage) {
      case 'alpha': return 'Alpha'
      case 'beta': return 'Beta'
      case 'concept': return 'Geplant'
      default: return stage.charAt(0).toUpperCase() + stage.slice(1)
    }
  }

  // Account deletion states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false)
  const [reauthCode, setReauthCode] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [showDeleteAccountConfirmModal, setShowDeleteAccountConfirmModal] = useState(false)

  // Subscription
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null)
  const [isFetchingStatus, setIsFetchingStatus] = useState(true)
  const [isManagingSubscription, setIsManagingSubscription] = useState<boolean>(false)
  const { isExporting, handleDataExport: performDataExport } = useDataExport()
  const [betriebskostenGuideEnabled, setBetriebskostenGuideEnabled] = useState<boolean>(true)

  // ----------- Effects & Data Setup ------------------

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
    setIsFetchingStatus(true)
    try {
      const userProfileData = await getUserProfileForSettings()
      if ('error' in userProfileData && userProfileData.error) {
        toast({
          title: "Fehler",
          description: `Abo-Details konnten nicht geladen werden: ${userProfileData.error}`,
          variant: "destructive",
        })
        const currentEmail = profile?.email || ''
        setProfile({
          id: profile?.id || '',
          email: currentEmail,
          stripe_subscription_status: 'error',
          currentWohnungenCount: 0,
          activePlan: null,
        } as UserProfileWithSubscription)
      } else {
        setProfile(userProfileData as UserProfileWithSubscription)
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: `Ein unerwarteter Fehler ist aufgetreten (Profil): ${(error as Error).message}`,
        variant: "destructive",
      })
      const currentEmail = profile?.email || ''
      setProfile({
        id: profile?.id || '',
        email: currentEmail,
        stripe_subscription_status: 'error',
        currentWohnungenCount: 0,
        activePlan: null,
      } as UserProfileWithSubscription)
    } finally {
      setIsFetchingStatus(false)
    }
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      if (open && activeTab === 'subscription') {
        await refreshUserProfile()
      }
    }
    fetchInitialData()
  }, [open, activeTab])

  useEffect(() => {
    if (open) {
      const hidden = getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE)
      setBetriebskostenGuideEnabled(hidden !== 'true')
    }
  }, [open])

  // Feature preview (Early Access)
  useEffect(() => {
    if (!posthog || !posthog.__loaded) {
      setUseLocalFeatures(true)
      setIsLoadingFeatures(false)
      return
    }
    if (posthog.has_opted_out_capturing?.()) {
      setUseLocalFeatures(true)
      setIsLoadingFeatures(false)
      return
    }

    setIsLoadingFeatures(true)
    try {
      if (typeof posthog.getEarlyAccessFeatures !== 'function') {
        setUseLocalFeatures(true)
        setIsLoadingFeatures(false)
        return
      }
      const timeoutId = setTimeout(() => {
        setUseLocalFeatures(true)
        setIsLoadingFeatures(false)
      }, 5000)

      // @ts-ignore
      posthog.getEarlyAccessFeatures((features: EarlyAccessFeature[]) => {
        clearTimeout(timeoutId)
        const active = activeFlags || []

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
        setUseLocalFeatures(false)
        setIsLoadingFeatures(false)
      }, true, ['alpha', 'beta', 'concept'])
    } catch {
      setUseLocalFeatures(true)
      setIsLoadingFeatures(false)
    }
  }, [posthog, posthog?.__loaded, JSON.stringify(activeFlags)])

  // ----------- Account Actions ------------------

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
      const savedFirstName = data.user.user_metadata.first_name ?? ''
      const savedLastName = data.user.user_metadata.last_name ?? ''
      toast({
        title: "Erfolg",
        description: `Hallo ${savedFirstName} ${savedLastName}, Ihr Profil wurde erfolgreich gespeichert.`,
        variant: "success",
      })
    } else {
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

  // Delete Account (OTP, confirmation etc)
  const handleDeleteAccountInitiation = async () => {
    setIsDeleting(true)
    setShowDeleteConfirmation(false)
    try {
      const { error } = await supabase.auth.reauthenticate()
      if (error) {
        toast({
          title: "Fehler",
          description: `Fehler bei der erneuten Authentifizierung: ${error.message}`,
          variant: "destructive",
        })
        setShowDeleteConfirmation(false)
      } else {
        setShowDeleteConfirmation(true)
        toast({
          title: "Erfolg",
          description: "Bestätigungscode wurde an Ihre E-Mail gesendet. Bitte Code unten eingeben.",
          variant: "success",
        })
        setShowDeleteAccountConfirmModal(false)
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist bei der erneuten Authentifizierung aufgetreten.",
        variant: "destructive",
      })
      setShowDeleteConfirmation(false)
      setShowDeleteAccountConfirmModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDeleteAccount = async () => {
    if (!reauthCode) {
      toast({
        title: "Fehler",
        description: "Bestätigungscode ist erforderlich.",
        variant: "destructive",
      })
      return
    }
    setIsDeleting(true)
    try {
      const localSupabase = createClient()
      const { error: functionError } = await localSupabase.functions.invoke("delete-user-account", {})
      if (functionError) {
        toast({
          title: "Fehler",
          description: `Fehler beim Löschen des Kontos: ${functionError.message}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erfolg",
          description: "Ihr Konto wurde erfolgreich gelöscht. Sie werden abgemeldet.",
          variant: "success",
        })
        await localSupabase.auth.signOut()
        router.push("/auth/login")
        if (onOpenChange) onOpenChange(false)
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist beim Löschen des Kontos aufgetreten.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Manage subscription
  const handleManageSubscription = async () => {
    if (!profile || !profile.stripe_customer_id) {
      toast({
        title: "Fehler",
        description: "Kunden-ID nicht gefunden. Verwaltung nicht möglich.",
        variant: "destructive",
      })
      return
    }
    setIsManagingSubscription(true)
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: profile.stripe_customer_id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kundenportal konnte nicht geöffnet werden.")
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error("URL für Kundenportal nicht erhalten.")
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: (error as Error).message || "Kundenportal konnte nicht geöffnet werden.",
        variant: "destructive",
      })
    } finally {
      setIsManagingSubscription(false)
    }
  }

  // Early Access toggle
  const toggleEarlyAccess = async (flagKey: string, enable: boolean) => {
    if (useLocalFeatures) {
      toast({
        title: "Fehler",
        description: "Early-Access-Funktionen sind nicht verfügbar. Bitte überprüfen Sie Ihre Browser-Einstellungen.",
        variant: "destructive",
      })
      return
    }
    if (!posthog || !posthog.__loaded) {
      toast({
        title: "Fehler",
        description: "PostHog ist nicht bereit. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
      return
    }

    const updateFeatureState = (prev: EarlyAccessFeature[]) =>
      prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: enable } : f))

    setAlphaFeatures(updateFeatureState)
    setBetaFeatures(updateFeatureState)
    setConceptFeatures(updateFeatureState)
    setOtherFeatures(updateFeatureState)

    try {
      if (typeof posthog.updateEarlyAccessFeatureEnrollment !== 'function') {
        throw new Error('updateEarlyAccessFeatureEnrollment method not available')
      }
      // @ts-ignore
      posthog.updateEarlyAccessFeatureEnrollment(flagKey, enable)
      // @ts-ignore
      if (typeof posthog.reloadFeatureFlags === 'function') {
        await posthog.reloadFeatureFlags()
      }
      toast({
        title: "Erfolg",
        description: `Feature "${flagKey}" wurde ${enable ? 'aktiviert' : 'deaktiviert'}.`,
        variant: "success",
      })
    } catch {
      toast({
        title: "Fehler",
        description: `Feature konnte nicht ${enable ? 'aktiviert' : 'deaktiviert'} werden.`,
        variant: "destructive",
      })
      const revertFeatureState = (prev: EarlyAccessFeature[]) =>
        prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: !enable } : f))
      setAlphaFeatures(revertFeatureState)
      setBetaFeatures(revertFeatureState)
      setConceptFeatures(revertFeatureState)
      setOtherFeatures(revertFeatureState)
    }
  }

  // Ensure version is set when info tab is clicked
  useEffect(() => {
    if (activeTab === 'information') {
      setPackageJsonVersion("v2.0.0")
    }
  }, [activeTab])

  // ------- Tabs ----------
  const subscriptionStatus = profile?.stripe_subscription_status
  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')
    : null

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
            <p className="text-xs text-muted-foreground mt-1">
              Dieser Name wird für die Betriebskostenabrechnung verwendet.
            </p>
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
              disabled={isDeleting}
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
                    type="text"
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
      value: "display",
      label: "Darstellung",
      icon: Monitor,
      content: (
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold">Darstellung</h2>
          <p className="text-sm text-muted-foreground">
            Passen Sie das Aussehen der Anwendung an Ihre Vorlieben an.
          </p>
          {darkModeEnabled && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Design-Modus
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Wählen Sie zwischen hellem, dunklem Design oder folgen Sie den Systemeinstellungen.
                  </p>
                </div>
                <div className="flex-shrink-0 w-32">
                  <Select
                    value={theme}
                    onValueChange={(value) => {
                      setTheme(value)
                      toast({
                        title: "Design geändert",
                        description: `${themeLabels[value as keyof typeof themeLabels]} aktiviert.`,
                        variant: "success",
                      })
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
            </div>
          )}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg transition-colors hover:bg-muted/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Anleitung auf Betriebskosten-Seite
                </label>
                <p className="text-xs text-muted-foreground">
                  Blendet die Schritt-für-Schritt Anleitung für die Betriebskostenabrechnung ein oder aus.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={betriebskostenGuideEnabled}
                  onCheckedChange={(checked) => {
                    setBetriebskostenGuideEnabled(checked)
                    setCookie(BETRIEBSKOSTEN_GUIDE_COOKIE, checked ? 'false' : 'true', 365)
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, { detail: { hidden: !checked } }))
                    }
                  }}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                />
              </div>
            </div>
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
                <div className="text-sm font-medium">Aktueller Plan: <Skeleton className="h-4 w-32 inline-block" /></div>
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-1">
                <p className="text-sm">Nächste Verlängerung am: <Skeleton className="h-4 w-24 inline-block" /></p>
              </div>
              <div className="space-y-1">
                <p className="text-sm">Genutzte Wohnungen: <Skeleton className="h-4 w-20 inline-block" /></p>
              </div>
              <div className="mt-6 pt-4 border-t">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : subscriptionStatus === 'error' || !profile ? (
            <p className="text-red-500">Abo-Details konnten nicht geladen werden. Bitte stelle sicher, dass du angemeldet bist und versuche es erneut.</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end && profile.stripe_current_period_end ? (
                  <>
                    <p className="text-sm font-medium">Aktueller Plan: <strong>{profile.activePlan?.name || 'Unbekannt'}</strong></p>
                    <p className="text-sm text-orange-500">
                      Dein Abonnement ist aktiv und wird zum <strong>{new Date(profile.stripe_current_period_end!).toLocaleDateString('de-DE')}</strong> gekündigt.
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
                {(!profile.stripe_subscription_status || !['active', 'trialing'].includes(profile.stripe_subscription_status ?? '')) &&
                  !(profile.stripe_subscription_status === 'active' && profile.stripe_cancel_at_period_end) && (
                    <p className="text-sm mt-2">Du hast derzeit kein aktives Abonnement.</p>
                  )}
                {profile && typeof profile.currentWohnungenCount === 'number' && profile.activePlan?.limitWohnungen != null && (
                  <p className="text-sm mt-2">
                    Genutzte Wohnungen: {profile.currentWohnungenCount} / {profile.activePlan.limitWohnungen}
                  </p>
                )}
              </div>
              {profile.stripe_customer_id && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm mb-2 text-gray-600">
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
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold">Daten exportieren</h2>
          <p className="text-sm text-muted-foreground">
            Laden Sie alle Ihre Daten als CSV-Dateien herunter, verpackt in einem ZIP-Archiv.
            Dies beinhaltet Daten zu Häusern, Wohnungen, Mietern, Finanzen und mehr.
            Fremdschlüsselbeziehungen (Verknüpfungen zwischen Tabellen) werden nicht exportiert.
          </p>
          <Button onClick={performDataExport} disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <p className="text-sm text-muted-foreground text-center">
              Der Export kann je nach Datenmenge einige Augenblicke dauern. Bitte haben Sie Geduld.
            </p>
          )}
        </div>
      ),
    },
    {
      value: "feature-preview",
      label: "Vorschau",
      icon: FlaskConical,
      content: (
        <div className="flex flex-col space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Feature Vorschau</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Verwalten Sie experimentelle Funktionen. Opt-in/Opt-out wirkt sofort für Ihr Konto.
            </p>
            {isLoadingFeatures ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="space-y-8">
                {useLocalFeatures ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                      <div className="flex items-start">
                        <Info className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="font-medium">Early-Access-Funktionen können nicht geladen werden</p>
                          <p>Die Verbindung zu unserem Feature-System konnte nicht hergestellt werden. Dies kann folgende Ursachen haben:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Werbeblocker oder Datenschutz-Erweiterungen blockieren die Anfragen</li>
                            <li>Cookies sind deaktiviert oder wurden nicht akzeptiert</li>
                            <li>Netzwerkverbindung ist eingeschränkt</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-800 dark:text-blue-200">
                      <div className="flex items-start">
                        <Info className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="font-medium">So können Sie das Problem beheben:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Stellen Sie sicher, dass Sie alle Cookies akzeptiert haben</li>
                            <li>Deaktivieren Sie temporär Ihren Werbeblocker für diese Seite</li>
                            <li>Erlauben Sie Anfragen an <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">eu.i.posthog.com</code> in Ihren Browser-Einstellungen</li>
                            <li>Laden Sie die Seite neu, nachdem Sie die Einstellungen geändert haben</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="mt-2"
                      >
                        Seite neu laden
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {[
                      { stage: 'alpha', features: alphaFeatures },
                      { stage: 'beta', features: betaFeatures },
                      { stage: 'concept', features: conceptFeatures },
                      { stage: 'other', features: otherFeatures }
                    ].filter(({ features }) => features.length > 0).map(({ stage, features }) => (
                      <div key={stage} className="space-y-3">
                        <h3 className="text-sm font-semibold">{getStageDisplayName(stage)}</h3>
                        <div className="space-y-3">
                          {features.map((f) => (
                            <div key={f.flagKey} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{f.name}</span>
                                  {f.documentationUrl && (
                                    <a
                                      className="text-xs text-muted-foreground underline hover:text-primary"
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
                                  <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                                )}
                              </div>
                              <Switch
                                checked={!!f.enabled}
                                onCheckedChange={(checked) => toggleEarlyAccess(f.flagKey, checked)}
                                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                                disabled={isLoadingFeatures}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {[alphaFeatures, betaFeatures, conceptFeatures, otherFeatures].every(arr => arr.length === 0) && !isLoadingFeatures && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Derzeit sind keine Early-Access-Funktionen verfügbar.
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm text-amber-800 dark:text-amber-200">
                  <div className="flex items-start">
                    <Info className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Wichtiger Hinweis</p>
                      <p>Diese Funktionen befinden sich in der Entwicklung und sind möglicherweise nicht vollständig funktionsfähig. Es kann zu unerwartetem Verhalten kommen. Bitte nutzen Sie diese Funktionen mit Vorsicht und melden Sie uns etwaige Probleme.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "information",
      label: "Informationen",
      icon: Info,
      content: (
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold">App Informationen</h2>
          <p className="text-sm">Version: <span id="app-version">{packageJsonVersion}</span></p>
          <p className="text-sm text-muted-foreground">
            Dies ist Ihre Hausverwaltungssoftware. Bei Fragen oder Problemen wenden Sie sich bitte an den Support.
          </p>
        </div>
      )
    }
  ]

  // ------ Render Modal Component ----------
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[700px] h-[672px] max-w-[95vw] max-h-[95vh] overflow-hidden sm:h-[672px] sm:max-w-[700px] sm:w-[700px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>Benutzereinstellungen und Kontoverwaltung.</DialogDescription>
          </DialogHeader>
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
            <div className="flex-1 flex flex-col min-h-0">
              <section className="flex-1 overflow-y-auto p-3 min-h-0">
                {tabs.find(tab => tab.value === activeTab)?.content}
              </section>
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
