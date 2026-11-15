import posthog from "posthog-js"
import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants"
import { MIETHISTORIE_PARAM } from "@/lib/mietverhaeltnis-historie-param"

/** Client side: `"?miethistorie=1"` if the feature flag is on, otherwise `""` (also while the flag is still loading). */
export function mietHistorieQuery(): string {
  try {
    const aktiv =
      typeof posthog?.isFeatureEnabled === "function" &&
      posthog.isFeatureEnabled(POSTHOG_FEATURE_FLAGS.MIETVERHAELTNIS_MIETHISTORIE, { send_event: false }) === true
    return aktiv ? `?${MIETHISTORIE_PARAM}=1` : ""
  } catch {
    return ""
  }
}
