"use client"

import { useState } from "react";
import { DownloadCloud, ChevronDown, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataExport } from '@/hooks/useDataExport';
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ALLOWED_EXPORT_SCHEMA, ExportConfig } from "@/lib/export-config";
import { motion, AnimatePresence } from "framer-motion";

const ExportSection = () => {
  const { isExporting, handleDataExport: performDataExport } = useDataExport();
  
  const [mode, setMode] = useState<'all' | 'tenants_only'>('all');
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>(ALLOWED_EXPORT_SCHEMA);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const handleExportClick = () => {
    let finalColumns = { ...selectedColumns };
    if (mode === 'tenants_only') {
      finalColumns = { Mieter: selectedColumns['Mieter'] || ALLOWED_EXPORT_SCHEMA['Mieter'] };
    }
    
    performDataExport({
      mode,
      selectedColumns: finalColumns
    });
  };

  const toggleColumn = (table: string, column: string) => {
    setSelectedColumns(prev => {
      const current = prev[table] || [];
      const updated = current.includes(column)
        ? current.filter(c => c !== column)
        : [...current, column];
      
      return { ...prev, [table]: updated };
    });
  };

  const toggleAllColumns = (table: string, checked: boolean) => {
    setSelectedColumns(prev => ({
      ...prev,
      [table]: checked ? ALLOWED_EXPORT_SCHEMA[table] : []
    }));
  };

  const visibleTables = mode === 'tenants_only' ? ['Mieter'] : Object.keys(ALLOWED_EXPORT_SCHEMA);

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Daten exportieren"
        description="Laden Sie Ihre Daten als CSV-Dateien herunter, verpackt in einem ZIP-Archiv. Passen Sie Ihren Export an, indem Sie Tabellen und Spalten auswählen."
      >
        <SettingsCard>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 shrink-0">
                <DownloadCloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-6 pt-1">
                <div>
                  <h4 className="text-base font-semibold">Export konfigurieren</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Wählen Sie aus, welche Daten Sie exportieren möchten. Sensible Daten wie systeminterne IDs werden automatisch ausgeschlossen, um Ihre Privatsphäre zu schützen.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exportmodus</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setMode('all')}
                      className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all duration-200 ${mode === 'all' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-950'}`}
                    >
                      <div className={`p-2 rounded-lg ${mode === 'all' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${mode === 'all' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Alle Daten</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Vollständiges Backup</div>
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => setMode('tenants_only')}
                      className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all duration-200 ${mode === 'tenants_only' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-950'}`}
                    >
                      <div className={`p-2 rounded-lg ${mode === 'tenants_only' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${mode === 'tenants_only' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Nur Mieter</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Miet- und Kontaktdaten</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spaltenauswahl</Label>
                    <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {visibleTables.length} Tabellen verfügbar
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {visibleTables.map((table) => {
                      const schemaCols = ALLOWED_EXPORT_SCHEMA[table];
                      const selectedCols = selectedColumns[table] || [];
                      const isExpanded = expandedTable === table;
                      const isAllSelected = schemaCols.length > 0 && selectedCols.length === schemaCols.length;
                      const isPartiallySelected = selectedCols.length > 0 && selectedCols.length < schemaCols.length;

                      return (
                        <div key={table} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors bg-white dark:bg-slate-950/50 shadow-sm">
                          <div 
                            className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                            onClick={() => setExpandedTable(isExpanded ? null : table)}
                          >
                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center h-full pt-1">
                                <Checkbox 
                                  id={`table-${table}`}
                                  checked={isAllSelected ? true : isPartiallySelected ? "indeterminate" : false}
                                  onCheckedChange={(checked) => toggleAllColumns(table, checked === true)}
                                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                              </div>
                              <div className="flex flex-col">
                                <Label htmlFor={`table-${table}`} className="cursor-pointer font-medium text-sm">{table}</Label>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {selectedCols.length} von {schemaCols.length} Spalten ausgewählt
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pointer-events-none" 
                            >
                              <motion.div
                                initial={false}
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.div>
                            </Button>
                          </div>
                          
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="bg-slate-50/80 dark:bg-slate-900/30 p-4 border-t border-slate-100 dark:border-slate-800">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {schemaCols.map((col) => {
                                      const isChecked = selectedCols.includes(col);
                                      return (
                                        <label 
                                          key={col} 
                                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                                            isChecked 
                                              ? 'bg-white border-blue-200 dark:bg-slate-800 dark:border-blue-900/50 shadow-sm' 
                                              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <Checkbox 
                                            id={`col-${table}-${col}`}
                                            checked={isChecked}
                                            onCheckedChange={() => toggleColumn(table, col)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                          <span className={`text-sm ${isChecked ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {col}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 mt-4">
                  <div className="text-xs text-muted-foreground">
                    Das ZIP-Archiv enthält CSV-Dateien für jede Tabelle.
                  </div>
                  <Button
                    onClick={handleExportClick}
                    disabled={isExporting}
                    className="shadow-sm"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exportiere...
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        Daten herunterladen
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {isExporting && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50 flex items-center gap-3"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Der Export wird vorbereitet. Bitte haben Sie einen Moment Geduld...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
};

export default ExportSection;

