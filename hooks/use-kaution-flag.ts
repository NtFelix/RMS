"use client";

import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";
import { ermittleKautionFlagKonfig, KAUTION_FLAG_KEY, type KautionFlagKonfig } from "@/lib/kautionen-flag";

/** Flag state only (no payload subscription or parsing): the single definition of "flag is on". */
function useKautionFlagAktiv(): boolean {
  return useFeatureFlagEnabled(KAUTION_FLAG_KEY) === true;
}

/**
 * State and payload of the feature flag `advanced-kautionsmanagment` (see `lib/kautionen-flag.ts`).
 * Without a loaded flag (or without payload) `aktiv` is `false` and the lists hold the phase 1 defaults.
 */
export function useKautionFlag(): KautionFlagKonfig {
  const aktiv = useKautionFlagAktiv();
  const payload = useFeatureFlagPayload(KAUTION_FLAG_KEY);
  return ermittleKautionFlagKonfig(aktiv, payload);
}

/** Entry points of the deposit module: module right (`kautionen: ansehen`) AND feature flag. */
export function useKautionenSichtbar(hatModulrecht: boolean): boolean {
  const aktiv = useKautionFlagAktiv();
  return hatModulrecht && aktiv;
}
