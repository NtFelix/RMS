import { Clock, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KAUTION_FRIST_STUFE_LABELS, KAUTION_FRIST_STUFE_TEXTE } from "@/lib/kautionen-constants";
import { cn } from "@/lib/utils";
import type { KautionFristStufe } from "@/types/Kaution";

/**
 * Deadline hint of a deposit (guide values 3 and 6 months after the end of the tenancy).
 *
 * PREPARED for phase 2: the database only delivers `frist` from phase 2 on (`kaution_frist_stufe`), until then
 * the dialog does not render this component. The level is calculated by the database, never here.
 *
 * Wording is neutral on purpose ("Richtwert überschritten", never "überfällig"): the thresholds are guide
 * values, not statutory deadlines (LEGAL-1/3, needs a legal review before release). The level is never
 * conveyed by colour alone: text and icon say the same.
 */

interface KautionFristBadgeProps {
  stufe: KautionFristStufe;
  /** `true`: the full sentence in a box (dialog header); `false`: compact badge with the short label. */
  ausfuehrlich?: boolean;
  className?: string;
}

const STUFEN = {
  zeitnah: {
    icon: Clock,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  richtwert_ueberschritten: {
    icon: TriangleAlert,
    className: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200",
  },
} as const;

export function KautionFristBadge({ stufe, ausfuehrlich = false, className }: KautionFristBadgeProps) {
  // "keine" (or an unexpected value): nothing to show.
  if (stufe !== "zeitnah" && stufe !== "richtwert_ueberschritten") return null;

  const { icon: Icon, className: farbe } = STUFEN[stufe];
  const text = KAUTION_FRIST_STUFE_TEXTE[stufe];

  if (ausfuehrlich) {
    return (
      <div
        className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", farbe, className)}
        data-frist-stufe={stufe}
      >
        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{text}</p>
      </div>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", farbe, className)} title={text} data-frist-stufe={stufe}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{KAUTION_FRIST_STUFE_LABELS[stufe]}</span>
    </Badge>
  );
}
