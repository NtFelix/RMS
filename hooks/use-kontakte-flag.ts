"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants";

/**
 * Feature flag `kontakte-seite` (GH-30). UX only, not a security boundary: the rights are checked by the server
 * actions (app/kontakte-actions.ts) and the database.
 */
export const KONTAKTE_FLAG_KEY = POSTHOG_FEATURE_FLAGS.KONTAKTE_SEITE;

/**
 * Raw flag state: `undefined` while PostHog has not delivered the flags yet, `true` or `false` afterwards.
 * Lets the page wait for the flag instead of showing "not available" during loading.
 */
export function useKontakteFlagStatus(): boolean | undefined {
  return useFeatureFlagEnabled(KONTAKTE_FLAG_KEY);
}

/**
 * `true` only when the flag is explicitly on. Fail closed: while the flag is not loaded, it is `false`.
 */
export function useKontakteFlag(): boolean {
  return useKontakteFlagStatus() === true;
}

/** Entry point of the contacts section: module right AND feature flag. Fail closed. */
export function useKontakteSichtbar(hatModulrecht: boolean): boolean {
  const aktiv = useKontakteFlag();
  return hatModulrecht && aktiv;
}
