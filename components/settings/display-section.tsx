"use client"

import { useState, useEffect } from "react"
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { Info, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getCookie, setCookie } from "@/utils/cookies";
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from "@/constants/guide";
import { ThemeSwitcherCards } from "@/components/theme-switcher-cards";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";

const DisplaySection = () => {
  const darkModeEnabled = useFeatureFlagEnabled('dark-mode')
  const [betriebskostenGuideEnabled, setBetriebskostenGuideEnabled] = useState<boolean>(true);

  useEffect(() => {
    const hidden = getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE);
    setBetriebskostenGuideEnabled(hidden !== 'true');
  }, []);

  return (
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
  );
};

export default DisplaySection;
