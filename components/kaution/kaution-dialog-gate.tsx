"use client";

import type { ReactNode } from "react";
import { useKautionenSichtbar } from "@/hooks/use-kaution-flag";
import { useModalStore } from "@/hooks/use-modal-store";

/**
 * Mounts the deposit dialog only with the module right (`kautionen: ansehen`, synced into the modal store by
 * `KautionenRechtSync`) AND the feature flag `advanced-kautionsmanagment`. The entry points are hidden by the same
 * condition; this is the backstop for any opener that skips the check (`openKautionModal` is a plain store action).
 *
 * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
 */
export function KautionDialogGate({ children }: { children: ReactNode }) {
  const hatModulrecht = useModalStore((state) => state.canViewKautionen);
  return useKautionenSichtbar(hatModulrecht) ? <>{children}</> : null;
}
