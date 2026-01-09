"use client"

import { useState, useEffect } from "react"
import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfileWithSubscription } from '@/types/user';
import { getUserProfileForSettings, createSetupIntent } from '@/app/user-profile-actions';
import SubscriptionPaymentMethods from '@/components/common/subscription-payment-methods';
import SubscriptionPaymentHistory from '@/components/common/subscription-payment-history';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";

const SubscriptionSection = () => {
  const { toast } = useToast()
  const [isManagingSubscription, setIsManagingSubscription] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const refreshUserProfile = async () => {
    setIsFetchingStatus(true);
    try {
      const userProfileData = await getUserProfileForSettings();
      if ('error' in userProfileData && userProfileData.error) {
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

  useEffect(() => {
    refreshUserProfile();
  }, []);

  useEffect(() => {
    if (profile?.stripe_customer_id) {
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
  }, [profile]);

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
        new URL(url);
        window.location.href = url;
      } else {
        throw new Error("URL für Kundenportal nicht erhalten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: (error as Error).message || "Kundenportal konnte nicht geöffnet werden.",
        variant: "destructive",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const subscriptionStatus = profile?.stripe_subscription_status;
  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')
    : null;

  return (
    <div className="space-y-6">
      {isFetchingStatus ? (
        <>
          <SettingsSection
            title="Abonnement-Übersicht"
            description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsdetails"
          >
            <SettingsCard className="space-y-6">
              <div className="space-y-4">
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
                <div className="flex justify-center">
                  <Skeleton className="w-full max-w-md aspect-[1.586/1] rounded-2xl" />
                </div>
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
          <SettingsSection
            title="Abonnement-Übersicht"
            description="Verwalten Sie Ihr Abonnement und Ihre Zahlungsdetails"
          >
            <SettingsCard className="space-y-6">
              {profile.activePlan ? (
                <div className="space-y-4">
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
  )
};

export default SubscriptionSection;
