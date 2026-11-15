import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Label, control and error text of one form field. The error is linked with `aria-describedby`. */
export function FormFeld({ id, label, fehler, children }: { id: string; label: string; fehler?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {fehler && (
        <p id={`${id}-fehler`} className="text-xs text-destructive">
          {fehler}
        </p>
      )}
    </div>
  );
}

/** `aria-invalid` and `aria-describedby` for a control of `FormFeld` with the same `id`. */
export function fehlerAttribute(id: string, fehler: string | undefined) {
  return fehler ? { "aria-invalid": true, "aria-describedby": `${id}-fehler` } : {};
}
