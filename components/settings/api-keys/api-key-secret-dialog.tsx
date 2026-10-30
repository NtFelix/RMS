"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ApiKeySecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secret: string | null;
}

export function ApiKeySecretDialog({ open, onOpenChange, secret }: ApiKeySecretDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: "Kopiert", description: "API-Key in die Zwischenablage kopiert." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            API-Key erfolgreich genehmigt!
          </DialogTitle>
          <DialogDescription>
            Der Schlüssel wurde erstellt. Bitte kopieren Sie den Secret-Key jetzt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Wichtig: Einmalige Anzeige!</p>
              <p className="mt-0.5">
                Dieser Schlüssel wird aus Sicherheitsgründen <strong>nur dieses eine Mal</strong> im Klartext angezeigt und nirgends in der Datenbank gespeichert.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="revealed-api-secret" className="text-xs font-semibold">
              Ihr API-Secret:
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="revealed-api-secret"
                readOnly
                value={secret || ""}
                className="font-mono text-xs bg-muted/60 select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0 gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopiert" : "Kopieren"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Ich habe den Schlüssel gespeichert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
