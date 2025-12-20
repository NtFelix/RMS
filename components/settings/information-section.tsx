"use client"

import { Info } from "lucide-react";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import packageJson from "@/package.json";

const InformationSection = () => {
  // Read version directly from package.json at build time
  const appVersion = `v${packageJson.version}`;

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
                <h4 className="text-sm font-medium">Mietevo</h4>
                <p className="text-sm text-muted-foreground">
                  Version: <span id="app-version" className="font-mono">{appVersion}</span>
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
};

export default InformationSection;
