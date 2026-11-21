"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants";

/**
 * Feature flag `vorlagen-bedingungen`. Schaltet nur die Toolbar-Schaltfläche "Bedingter Block" im Vorlagen-Editor.
 * UX only, not a security boundary: gespeicherte Bedingungsblöcke werden unabhängig vom Flag angezeigt und gerendert.
 */
export const VORLAGEN_BEDINGUNGEN_FLAG_KEY = POSTHOG_FEATURE_FLAGS.VORLAGEN_BEDINGUNGEN;

/**
 * `true` only when the flag is explicitly on. Fail closed: while PostHog has not delivered the flag, it is `false`.
 */
export function useVorlagenBedingungenFlag(): boolean {
  return useFeatureFlagEnabled(VORLAGEN_BEDINGUNGEN_FLAG_KEY) === true;
}
