"use client"

import { useState, useEffect } from "react"
import { Info, Play } from "lucide-react";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/components/onboarding/store";
import { resetOnboarding } from "@/app/user-profile-actions";
import { toast } from "@/hooks/use-toast";

const InformationSection = () => {
  const [packageJsonVersion, setPackageJsonVersion] = useState<string>("v2.0.0");
  const { startTour, setHasCompletedOnboarding } = useOnboardingStore();

  useEffect(() => {
    setPackageJsonVersion("v2.0.0");
  }, []);

  const handleRestartTutorial = async () => {
    const result = await resetOnboarding();
    if (result.success) {
        setHasCompletedOnboarding(false);
        startTour();
        toast({ title: "Tutorial gestartet", description: "Das Tutorial wurde zurückgesetzt und gestartet." });
    } else {
        toast({ title: "Fehler", description: "Konnte Tutorial nicht zurücksetzen.", variant: "destructive" });
    }
  };

  return (
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

      <SettingsSection
        title="Tutorial"
        description="Starten Sie die Einführung erneut."
      >
        <SettingsCard>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Hier können Sie die interaktive Einführung erneut starten.
                </p>
                <Button onClick={handleRestartTutorial} variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Tutorial neu starten
                </Button>
            </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
};

export default InformationSection;
