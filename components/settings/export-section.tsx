"use client"

import { DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataExport } from '@/hooks/useDataExport';
import { SettingsCard, SettingsSection } from "@/components/settings/shared";

const ExportSection = () => {
  const { isExporting, handleDataExport: performDataExport } = useDataExport();

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Daten exportieren"
        description="Laden Sie alle Ihre Daten als CSV-Dateien herunter, verpackt in einem ZIP-Archiv."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <DownloadCloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Vollständiger Datenexport</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dies beinhaltet Daten zu Häusern, Wohnungen, Mietern, Finanzen und mehr.
                    Fremdschlüsselbeziehungen (Verknüpfungen zwischen Tabellen) werden nicht exportiert.
                  </p>
                </div>

                <Button
                  onClick={performDataExport}
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Der Export kann je nach Datenmenge einige Augenblicke dauern. Bitte haben Sie Geduld.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
};

export default ExportSection;
