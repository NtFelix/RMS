"use client";

/**
 * Small form building blocks shared by the deposit forms ("Kautionsmanagement", GH-6): a labelled field with
 * hint and error text wired up for assistive technology (`aria-invalid`, `aria-describedby`, `role="alert"`),
 * the form-level error box and the "unsaved input" reporter.
 */

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Tooltip of buttons that are disabled because of a missing module right (disabled instead of hidden). */
export const KEINE_BERECHTIGUNG_TEXT = "Keine Berechtigung";

/** Attributes the control has to set so that label, hint and error are linked to it. */
export interface KautionFeldProps {
  id: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  "aria-describedby"?: string;
}

interface KautionFeldRahmenProps {
  /** Base ID of the control (the label points to it); hint and error get `${id}-hinweis` / `${id}-fehler`. */
  id: string;
  label: string;
  /** Help text below the control. */
  hinweis?: React.ReactNode;
  /** Validation error below the control (shown instead of nothing, in addition to the hint). */
  fehler?: string | null;
  /** Mandatory field: announced as required to assistive technology (`aria-required`). */
  pflicht?: boolean;
  className?: string;
  children: (props: KautionFeldProps) => React.ReactNode;
}

/** Label + control + hint + error, one field of a deposit form. */
export function KautionFeld({ id, label, hinweis, fehler, pflicht, className, children }: KautionFeldRahmenProps) {
  const hinweisId = `${id}-hinweis`;
  const fehlerId = `${id}-fehler`;
  const describedBy = [hinweis ? hinweisId : null, fehler ? fehlerId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": fehler ? true : undefined,
        "aria-required": pflicht ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hinweis ? (
        <p id={hinweisId} className="text-xs text-muted-foreground">
          {hinweis}
        </p>
      ) : null}
      {fehler ? (
        <p id={fehlerId} role="alert" className="text-xs font-medium text-destructive">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}

interface KautionBetragInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "inputMode" | "value" | "onChange"> {
  /** The text exactly as typed (German notation, e.g. `1.500,50`). Parsed strictly on submit. */
  value: string;
  onWertChange: (text: string) => void;
}

/**
 * Text field for an amount. It deliberately keeps the text EXACTLY as typed: what the user sees is what the strict
 * money parser (`lib/kautionen-money.ts`) reads and what is booked. (`NumberInput` would rewrite the text while
 * typing: a thousands dot typed first turns "1.500,50" into the display "1,500,50".)
 */
export function KautionBetragInput({ value, onWertChange, ...props }: KautionBetragInputProps) {
  return (
    <Input
      placeholder="0,00"
      autoComplete="off"
      spellCheck={false}
      {...props}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => onWertChange(event.target.value)}
    />
  );
}

/** Error of the server (or of a request) at the form. Stays visible until the next attempt. */
export function KautionFormularFehler({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className={cn("py-3", className)} data-testid="kaution-formular-fehler">
      <TriangleAlert aria-hidden="true" className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * Reports whether a form holds unsaved input (`isDirty`) to the owner of the dialog and resets the report to
 * `false` when the form disappears (saved, cancelled or dialog closed). `onDirtyChange` must be stable
 * (`useCallback`), otherwise the effects run on every render.
 */
export function useDirtyMelder(isDirty: boolean, onDirtyChange?: (dirty: boolean) => void) {
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  React.useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);
}
