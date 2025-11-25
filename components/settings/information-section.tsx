"use client"

import { useState, useEffect } from "react"
import { Info } from "lucide-react";
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Button } from "@/components/ui/button"
import { useTutorial } from "@/components/tutorial-provider"
import { resetOnboarding } from "@/app/onboarding-actions"

const InformationSection = () => {
  const { startTour } = useTutorial()
  const [packageJsonVersion, setPackageJsonVersion] = useState<string>("v2.0.0")

  useEffect(() => {
    setPackageJsonVersion("v2.0.0");
  }, []);

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
                  Version:{" "}
                  <span id="app-version" className="font-mono">
                    {packageJsonVersion}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Dies ist Ihre Hausverwaltungssoftware. Bei Fragen oder Problemen
                wenden Sie sich bitte an den Support.
              </p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
      <SettingsSection
        title="Anleitung"
        description="Starten Sie die interaktive Anleitung, um die App kennenzulernen."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">Interaktive Anleitung</h4>
                <p className="text-sm text-muted-foreground">
                  Starten Sie die Anleitung, um die Kernfunktionen der App
                  kennenzulernen.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex gap-2">
              <Button onClick={startTour}>Anleitung starten</Button>
              <Button onClick={() => resetOnboarding()} variant="outline">
                Anleitung zurücksetzen
              </Button>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}

export default InformationSection;
