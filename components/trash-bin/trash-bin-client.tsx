'use client';

import * as React from 'react';
import { useReducer, useTransition } from 'react';
import { RotateCcw, Trash2, Database, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationAlertDialog } from '@/components/ui/confirmation-alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { restoreEntryAction, permanentlyDeleteEntryAction, PapierkorbEntry } from '@/lib/papierkorb/actions';

const TYPE_LABELS: Record<string, string> = {
  Haeuser: 'Haus',
  Wohnungen: 'Wohnung',
  Mieter: 'Mieter',
  Finanzen: 'Finanz-Eintrag',
  Zaehler: 'Zähler',
  Nebenkosten: 'Nebenkosten',
  Dokumente_Metadaten: 'Dokument',
  Aufgaben: 'Aufgabe',
  Zaehler_Ablesungen: 'Zählerablesung',
  Vorlagen: 'Vorlage',
  Rechnungen: 'Rechnung',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type DialogState = {
  confirmOpen: boolean;
  itemToDelete: { id: string; name: string; tableName: string } | null;
  restoreConfirmOpen: boolean;
  itemToRestore: PapierkorbEntry | null;
};

type FilterState = {
  searchQuery: string;
  selectedType: string;
};

type UIState = DialogState & FilterState;

type UIAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_TYPE'; payload: string }
  | { type: 'OPEN_DELETE_DIALOG'; payload: { id: string; name: string; tableName: string } }
  | { type: 'CLOSE_DELETE_DIALOG' }
  | { type: 'OPEN_RESTORE_DIALOG'; payload: PapierkorbEntry }
  | { type: 'CLOSE_RESTORE_DIALOG' };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SELECTED_TYPE':
      return { ...state, selectedType: action.payload };
    case 'OPEN_DELETE_DIALOG':
      return { ...state, confirmOpen: true, itemToDelete: action.payload };
    case 'CLOSE_DELETE_DIALOG':
      return { ...state, confirmOpen: false, itemToDelete: null };
    case 'OPEN_RESTORE_DIALOG':
      return { ...state, restoreConfirmOpen: true, itemToRestore: action.payload };
    case 'CLOSE_RESTORE_DIALOG':
      return { ...state, restoreConfirmOpen: false, itemToRestore: null };
    default:
      return state;
  }
}

const initialUIState: UIState = {
  searchQuery: '',
  selectedType: 'all',
  confirmOpen: false,
  itemToDelete: null,
  restoreConfirmOpen: false,
  itemToRestore: null,
};

interface TrashBinClientProps {
  initialEntries: PapierkorbEntry[];
}

export function TrashBinClient({ initialEntries }: TrashBinClientProps) {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<PapierkorbEntry[]>(initialEntries);
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [isPending, startTransition] = useTransition();

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.name.toLowerCase().includes(ui.searchQuery.toLowerCase());
    const matchesType = ui.selectedType === 'all' || entry.table_name === ui.selectedType;
    return matchesSearch && matchesType;
  });

  const sortedEntries = filteredEntries.toSorted((a, b) => a.restzeit_tage - b.restzeit_tage);

  const deletedDocsStorage = entries
    .filter((entry) => entry.table_name === 'Dokumente_Metadaten' && entry.dateigroesse)
    .reduce((sum, entry) => sum + Number(entry.dateigroesse || 0), 0);

  const triggerRestore = (entry: PapierkorbEntry) => {
    dispatch({ type: 'OPEN_RESTORE_DIALOG', payload: entry });
  };

  const handleConfirmRestore = async () => {
    const item = ui.itemToRestore;
    if (!item) return;
    startTransition(async () => {
      try {
        await restoreEntryAction(item.table_name, item.id);
        setEntries((prev) => prev.filter((e) => e.id !== item.id));
        dispatch({ type: 'CLOSE_RESTORE_DIALOG' });
        toast({
          title: 'Wiederhergestellt',
          description: `"${item.name}" wurde erfolgreich wiederhergestellt.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Fehler beim Wiederherstellen',
          description: error.message || 'Etwas ist schief gelaufen.',
        });
      }
    });
  };

  const triggerPermanentDelete = (entry: PapierkorbEntry) => {
    dispatch({ type: 'OPEN_DELETE_DIALOG', payload: { id: entry.id, name: entry.name, tableName: entry.table_name } });
  };

  const handleConfirmPermanentDelete = async () => {
    const item = ui.itemToDelete;
    if (!item) return;
    startTransition(async () => {
      try {
        await permanentlyDeleteEntryAction(item.tableName, item.id);
        setEntries((prev) => prev.filter((e) => e.id !== item.id));
        dispatch({ type: 'CLOSE_DELETE_DIALOG' });
        toast({
          title: 'Endgültig gelöscht',
          description: `"${item.name}" wurde dauerhaft gelöscht.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Fehler beim Löschen',
          description: error.message || 'Etwas ist schief gelaufen.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Storage Information Banner */}
      {deletedDocsStorage > 0 && (
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-950/30 dark:bg-amber-950/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Gelöschte Dokumente belegen noch{' '}
              <strong className="font-semibold text-amber-900 dark:text-amber-200">
                {formatBytes(deletedDocsStorage)}
              </strong>{' '}
              Speicher — endgültiges Löschen gibt diesen frei.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Nach Namen filtern..."
            value={ui.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            onClear={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
            className="bg-white dark:bg-zinc-900"
            mode="table"
          />
          <Select value={ui.selectedType} onValueChange={(v) => dispatch({ type: 'SET_SELECTED_TYPE', payload: v })}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-zinc-900">
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Listing */}
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] first:[&:hover_th]:rounded-tl-lg last:[&:hover_th]:rounded-tr-lg">
              <TableHead className="w-[30%] font-semibold">Name</TableHead>
              <TableHead className="w-[12%] font-semibold">Typ</TableHead>
              <TableHead className="w-[18%] font-semibold">Gelöscht von</TableHead>
              <TableHead className="w-[18%] font-semibold">Gelöscht am</TableHead>
              <TableHead className="w-[12%] font-semibold">Restzeit</TableHead>
              <TableHead className="w-[10%] text-right font-semibold">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  Papierkorb ist leer — keine gelöschten Elemente gefunden.
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.map((entry) => {
                const formattedDate = new Date(entry.geloescht_am).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <TableRow
                    key={entry.id}
                    className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-zinc-900/30"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-zinc-100 truncate max-w-[300px]">
                      {entry.name}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">
                      {TYPE_LABELS[entry.table_name] || entry.table_name}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]" title={entry.geloescht_von || 'Unbekannt'}>
                      {entry.geloescht_von || 'Unbekannt'}
                    </TableCell>
                    <TableCell className="text-zinc-500 dark:text-zinc-500">
                      {formattedDate} Uhr
                    </TableCell>
                    <TableCell>
                      {entry.restzeit_tage > 7 ? (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          noch {entry.restzeit_tage} Tage
                        </span>
                      ) : entry.restzeit_tage === 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-900/30">
                          wird heute endgültig gelöscht
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100/50 dark:border-red-900/20">
                          noch {entry.restzeit_tage} Tage — wird bald gelöscht
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => triggerRestore(entry)}
                          disabled={isPending}
                          title="Wiederherstellen"
                          className="h-8 w-8 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => triggerPermanentDelete(entry)}
                          disabled={isPending}
                          title="Endgültig löschen"
                          className="h-8 w-8 text-red-600 dark:text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog for Permanent Deletion */}
      <ConfirmationAlertDialog
        isOpen={ui.confirmOpen}
        onOpenChange={(open) => open ? null : dispatch({ type: 'CLOSE_DELETE_DIALOG' })}
        onConfirm={handleConfirmPermanentDelete}
        title="Element endgültig löschen?"
        description={
          <div className="space-y-3">
            <p>
              Möchten Sie{' '}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                "{ui.itemToDelete?.name}"
              </strong>{' '}
              wirklich endgültig löschen?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium flex gap-2 items-center">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
            {ui.itemToDelete?.tableName === 'Dokumente_Metadaten' && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hinweis: Erst mit der endgültigen Löschung dieses Dokuments wird der Speicherplatz in Ihrem Abonnement-Limit freigegeben.
              </p>
            )}
          </div>
        }
        confirmButtonText="Endgültig löschen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
        isDeleting={isPending}
      />

      {/* Confirmation Dialog for Restoration */}
      <ConfirmationAlertDialog
        isOpen={ui.restoreConfirmOpen}
        onOpenChange={(open) => open ? null : dispatch({ type: 'CLOSE_RESTORE_DIALOG' })}
        onConfirm={handleConfirmRestore}
        title="Element wiederherstellen?"
        description={
          <div className="space-y-3">
            <p>
              Möchten Sie{' '}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                "{ui.itemToRestore?.name}"
              </strong>{' '}
              wirklich wiederherstellen?
            </p>
            <p className="text-sm text-muted-foreground">
              Das Element wird aus dem Papierkorb entfernt und wieder in der Übersicht des jeweiligen Bereichs ({ui.itemToRestore?.table_name ? (TYPE_LABELS[ui.itemToRestore.table_name] || ui.itemToRestore.table_name) : ''}) angezeigt.
            </p>
          </div>
        }
        confirmButtonText="Wiederherstellen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="default"
        isDeleting={isPending}
      />
    </div>
  );
}
