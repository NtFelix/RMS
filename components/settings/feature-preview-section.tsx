"use client"

import { useState, useEffect, useMemo } from "react"
import { usePostHog, useActiveFeatureFlags } from 'posthog-js/react'
import { FlaskConical, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";

type EarlyAccessStage = 'concept' | 'beta' | 'alpha' | 'other'
interface EarlyAccessFeature {
  flagKey: string | null
  name: string
  description?: string
  documentationUrl?: string | null
  stage: EarlyAccessStage
  enabled?: boolean
}

const FeaturePreviewSection = () => {
  const posthog = usePostHog()
  const activeFlags = useActiveFeatureFlags()
  const { toast } = useToast()
  const [alphaFeatures, setAlphaFeatures] = useState<EarlyAccessFeature[]>([])
  const [betaFeatures, setBetaFeatures] = useState<EarlyAccessFeature[]>([])
  const [conceptFeatures, setConceptFeatures] = useState<EarlyAccessFeature[]>([])
  const [otherFeatures, setOtherFeatures] = useState<EarlyAccessFeature[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false)
  const [useLocalFeatures, setUseLocalFeatures] = useState<boolean>(false)

  const getStageDisplayName = (stage: string) => {
    switch (stage) {
      case 'alpha': return 'Alpha';
      case 'beta': return 'Beta';
      case 'concept': return 'Geplant';
      default: return stage.charAt(0).toUpperCase() + stage.slice(1);
    }
  }

  const activeFlagsString = useMemo(() => JSON.stringify(activeFlags || []), [activeFlags]);

  useEffect(() => {
    if (!posthog || !posthog.__loaded) {
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false);
      return;
    }

    if (posthog.has_opted_out_capturing?.()) {
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false);
      return;
    }

    setIsLoadingFeatures(true)

    try {
      if (typeof posthog.getEarlyAccessFeatures !== 'function') {
        setUseLocalFeatures(true);
        setIsLoadingFeatures(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        setUseLocalFeatures(true);
        setIsLoadingFeatures(false);
      }, 5000);

      posthog.getEarlyAccessFeatures((features: EarlyAccessFeature[]) => {
        clearTimeout(timeoutId);
        const active = activeFlags || []

        const featuresByStage: Record<string, EarlyAccessFeature[]> = {}

        features.forEach((f) => {
          const stage = f.stage || 'other'
          if (!featuresByStage[stage]) {
            featuresByStage[stage] = []
          }
          featuresByStage[stage].push({
            ...f,
            enabled: f.flagKey ? active.includes(f.flagKey) : false
          })
        })

        setBetaFeatures(featuresByStage['beta'] || [])
        setConceptFeatures(featuresByStage['concept'] || [])
        setAlphaFeatures(featuresByStage['alpha'] || [])
        setOtherFeatures(featuresByStage['other'] || [])
        setUseLocalFeatures(false);
        setIsLoadingFeatures(false)
      }, true, ['alpha', 'beta', 'concept'])
    } catch (e) {
      setUseLocalFeatures(true);
      setIsLoadingFeatures(false)
    }
  }, [posthog, posthog?.__loaded, activeFlagsString])

  const toggleEarlyAccess = async (flagKey: string | null, enable: boolean) => {
    if (!flagKey) return;
    
    if (useLocalFeatures) {
      toast({
        title: "Fehler",
        description: "Early-Access-Funktionen sind nicht verfügbar. Bitte überprüfen Sie Ihre Browser-Einstellungen.",
        variant: "destructive",
      });
      return;
    }

    if (!posthog || !posthog.__loaded) {
      toast({
        title: "Fehler",
        description: "PostHog ist nicht bereit. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
      return;
    }

    const updateFeatureState = (prev: EarlyAccessFeature[]) =>
      prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: enable } : f))

    setAlphaFeatures(updateFeatureState)
    setBetaFeatures(updateFeatureState)
    setConceptFeatures(updateFeatureState)
    setOtherFeatures(updateFeatureState)

    try {
      if (typeof posthog.updateEarlyAccessFeatureEnrollment !== 'function') {
        throw new Error('updateEarlyAccessFeatureEnrollment method not available');
      }

      posthog.updateEarlyAccessFeatureEnrollment(flagKey, enable)

      if (typeof posthog.reloadFeatureFlags === 'function') {
        await posthog.reloadFeatureFlags();
      }

      toast({
        title: "Erfolg",
        description: `Feature "${flagKey}" wurde ${enable ? 'aktiviert' : 'deaktiviert'}.`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Fehler",
        description: `Feature konnte nicht ${enable ? 'aktiviert' : 'deaktiviert'} werden.`,
        variant: "destructive",
      });

      const revertFeatureState = (prev: EarlyAccessFeature[]) =>
        prev.map((f) => (f.flagKey === flagKey ? { ...f, enabled: !enable } : f))

      setAlphaFeatures(revertFeatureState)
      setBetaFeatures(revertFeatureState)
      setConceptFeatures(revertFeatureState)
      setOtherFeatures(revertFeatureState)
    }
  }

  return (
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
};

export default FeaturePreviewSection;
