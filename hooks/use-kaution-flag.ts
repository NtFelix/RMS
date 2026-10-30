"use client";

import { useEffect, useState } from "react";
import { useFeatureFlagEnabled, useFeatureFlagPayload, usePostHog } from "posthog-js/react";
import { ermittleKautionFlagKonfig, KAUTION_FLAG_KEY, type KautionFlagKonfig } from "@/lib/kautionen-flag";

/** After this time without delivered flags (blocked request, offline) the flag counts as loaded (= off). */
export const KAUTION_FLAG_LADE_TIMEOUT_MS = 3000;

/**
 * `false` until PostHog has delivered the flags (or the timeout has passed). Lets a caller show a skeleton
 * for the deposit UI instead of letting it pop in later (layout shift). On the server and in the first client render
 * it is `false` as well, so server and client markup match.
 */
export function useKautionFlagGeladen(): boolean {
  const posthog = usePostHog();
  const [geladen, setGeladen] = useState(() => posthog?.featureFlags?.hasLoadedFlags === true);

  useEffect(() => {
    if (geladen) return;
    const abbestellen = posthog?.onFeatureFlags?.(() => setGeladen(true));
    const timer = setTimeout(() => setGeladen(true), KAUTION_FLAG_LADE_TIMEOUT_MS);
    return () => {
      abbestellen?.();
      clearTimeout(timer);
    };
  }, [posthog, geladen]);

  return geladen;
}

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
