"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants";

/**
 * Feature flag `mietverhaeltnis-miethistorie` (GH-17). UX only, not a security boundary: the rights are checked
 * by the server actions and the database.
 */
export const MIETVERHAELTNIS_FLAG_KEY = POSTHOG_FEATURE_FLAGS.MIETVERHAELTNIS_MIETHISTORIE;

/**
 * Entry point of the tenancy section: module right AND feature flag. Fail closed: while PostHog has not delivered
 * the flag, `useFeatureFlagEnabled` returns `undefined`, and only `true` shows the section.
 */
export function useMietverhaeltnisSichtbar(hatModulrecht: boolean): boolean {
  const aktiv = useFeatureFlagEnabled(MIETVERHAELTNIS_FLAG_KEY) === true;
  return hatModulrecht && aktiv;
}
