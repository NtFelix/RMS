"use client";

import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";
import { ermittleKautionFlagKonfig, KAUTION_FLAG_KEY, type KautionFlagKonfig } from "@/lib/kautionen-flag";

/**
 * State and payload of the feature flag `advanced-kautionsmanagment` (see `lib/kautionen-flag.ts`).
 * Without a loaded flag (or without payload) `aktiv` is `false` and the lists hold the phase 1 defaults.
 */
export function useKautionFlag(): KautionFlagKonfig {
  const aktiv = useFeatureFlagEnabled(KAUTION_FLAG_KEY) === true;
  const payload = useFeatureFlagPayload(KAUTION_FLAG_KEY);
  return ermittleKautionFlagKonfig(aktiv, payload);
}

/** Entry points of the deposit module: module right (`kautionen: ansehen`) AND feature flag. */
export function useKautionenSichtbar(hatModulrecht: boolean): boolean {
  const { aktiv } = useKautionFlag();
  return hatModulrecht && aktiv;
}
