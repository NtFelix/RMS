import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleDashed, Circle, FileText, ShieldCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KAUTION_ZUSTAND_LABELS } from "@/lib/kautionen-constants";
import { cn } from "@/lib/utils";
import type { KautionZustand } from "@/types/Kaution";

/**
 * Badge for the derived state of a deposit (database: `kaution_status_ableiten`).
 * The state is never conveyed by colour alone: every badge carries the state as text and an icon.
 */

interface Darstellung {
  icon: LucideIcon;
  className: string;
}

const NEUTRAL = "border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300";

const DARSTELLUNG: Record<KautionZustand, Darstellung> = {
  offen: { icon: Circle, className: NEUTRAL },
  teilweise: {
    icon: CircleDashed,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  verwahrt: {
    icon: ShieldCheck,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
  in_rueckzahlung: {
    icon: Undo2,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300",
  },
  abgeschlossen: { icon: CircleCheck, className: NEUTRAL },
  dokumentiert: { icon: FileText, className: NEUTRAL },
};

interface KautionStatusBadgeProps {
  zustand: KautionZustand;
  className?: string;
}

export function KautionStatusBadge({ zustand, className }: KautionStatusBadgeProps) {
  // The state comes from the database; an unexpected value must not crash the dialog.
  const darstellung = DARSTELLUNG[zustand] ?? DARSTELLUNG.offen;
  const label = KAUTION_ZUSTAND_LABELS[zustand] ?? "Unbekannt";
  const Icon = darstellung.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", darstellung.className, className)} data-zustand={zustand}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">Status: </span>
      <span>{label}</span>
    </Badge>
  );
}
