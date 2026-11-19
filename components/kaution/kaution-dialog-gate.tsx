"use client";

import { useEffect, type ReactNode } from "react";
import { useKautionenSichtbar } from "@/hooks/use-kaution-flag";
import { useModalStore } from "@/hooks/use-modal-store";

/**
 * Mounts the deposit dialog only with the module right (`kautionen: ansehen`, synced into the modal store by
 * `KautionenRechtSync`) AND the feature flag `advanced-kautionsmanagment`. The entry points are hidden by the same
 * condition; this is the backstop for any opener that skips the check (`openKautionModal` is a plain store action).
 * While hidden, an open dialog without unsaved input is reset, so a stray `openKautionModal` cannot pop the dialog open
 * once the flag turns on. Unsaved input is never discarded here (no reset while the dialog is dirty). The same holds for
 * the selection of an open deposit (`kautionAuswahl`): it holds no input, so it is cleared while hidden.
 *
 * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
 */
export function KautionDialogGate({ children }: { children: ReactNode }) {
  const hatModulrecht = useModalStore((state) => state.canViewKautionen);
  const closeKautionModal = useModalStore((state) => state.closeKautionModal);
  const istOffen = useModalStore((state) => state.isKautionModalOpen);
  const istDirty = useModalStore((state) => state.isKautionModalDirty);
  const auswahlOffen = useModalStore((state) => state.kautionAuswahl !== null);
  const closeKautionAuswahl = useModalStore((state) => state.closeKautionAuswahl);
  const sichtbar = useKautionenSichtbar(hatModulrecht);

  // Only touch the store when there is a stale open state to clear: no write (and no re-render of the
  // whole-store subscribers) on every mount for users without the flag.
  useEffect(() => {
    if (!sichtbar && istOffen && !istDirty) closeKautionModal({ force: true });
  }, [sichtbar, istOffen, istDirty, closeKautionModal]);

  // The selection list keeps no input; a stale one must not pop open once the dialog becomes visible again.
  useEffect(() => {
    if (!sichtbar && auswahlOffen) closeKautionAuswahl();
  }, [sichtbar, auswahlOffen, closeKautionAuswahl]);

  return sichtbar ? <>{children}</> : null;
}
