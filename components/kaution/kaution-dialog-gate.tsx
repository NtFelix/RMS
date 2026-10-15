"use client";

import { useEffect, type ReactNode } from "react";
import { useKautionenSichtbar } from "@/hooks/use-kaution-flag";
import { useModalStore } from "@/hooks/use-modal-store";

/**
 * Mounts the deposit dialog only with the module right (`kautionen: ansehen`, synced into the modal store by
 * `KautionenRechtSync`) AND the feature flag `advanced-kautionsmanagment`. The entry points are hidden by the same
 * condition; this is the backstop for any opener that skips the check (`openKautionModal` is a plain store action).
 * While hidden, the store state is reset, so a stray `openKautionModal` cannot pop the dialog open once the flag turns on.
 *
 * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
 */
export function KautionDialogGate({ children }: { children: ReactNode }) {
  const hatModulrecht = useModalStore((state) => state.canViewKautionen);
  const closeKautionModal = useModalStore((state) => state.closeKautionModal);
  const sichtbar = useKautionenSichtbar(hatModulrecht);

  useEffect(() => {
    if (!sichtbar) closeKautionModal({ force: true });
  }, [sichtbar, closeKautionModal]);

  return sichtbar ? <>{children}</> : null;
}
