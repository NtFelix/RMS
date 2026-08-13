"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useModalStore } from "@/hooks/use-modal-store";
import { getPapierkorbEntriesAction, PapierkorbEntry } from "@/lib/papierkorb/actions";
import { TrashBinClient } from "./trash-bin-client";
import { Spinner } from "@/components/ui/spinner";
import { Trash2 } from "lucide-react";

export function TrashBinModal() {
  const { isTrashBinModalOpen, closeTrashBinModal } = useModalStore();
  const [entries, setEntries] = useState<PapierkorbEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isTrashBinModalOpen) {
      const loadEntries = async () => {
        setIsLoading(true);
        try {
          const data = await getPapierkorbEntriesAction();
          setEntries(data);
        } catch (error) {
          console.error("Failed to load trash bin entries in modal:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadEntries();
    }
  }, [isTrashBinModalOpen]);

  if (!isTrashBinModalOpen) return null;

  return (
    <Dialog open={isTrashBinModalOpen} onOpenChange={closeTrashBinModal}>
      <DialogContent className="max-w-5xl h-[85vh] max-h-[85vh] p-0 flex flex-col bg-background border-0 shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3 mt-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                Papierkorb
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Gelöschte Elemente werden hier 30 Tage aufbewahrt, bevor sie endgültig gelöscht werden.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2">
              <Spinner className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Elemente werden geladen...</p>
            </div>
          ) : (
            <TrashBinClient initialEntries={entries} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
