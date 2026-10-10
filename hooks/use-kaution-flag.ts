"use client";

import { useMemo } from "react";
import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";
import { ermittleKautionFlagKonfig, KAUTION_FLAG_KEY, type KautionFlagKonfig } from "@/lib/kautionen-flag";

/**
 * State and payload of the feature flag `advanced-kautionsmanagment` (see `lib/kautionen-flag.ts`).
 * Without a loaded flag (or without payload) `aktiv` is `false` and the lists hold the phase 1 defaults.
 */
export function useKautionFlag(): KautionFlagKonfig {
  const aktiv = useFeatureFlagEnabled(KAUTION_FLAG_KEY) === true;
  const payload = useFeatureFlagPayload(KAUTION_FLAG_KEY);
  // PostHog may hand out a new object on every render: key the memo on the serialised payload.
  const payloadSchluessel = JSON.stringify(payload ?? null);
  return useMemo(() => ermittleKautionFlagKonfig(aktiv, payload), [aktiv, payloadSchluessel]);
}
