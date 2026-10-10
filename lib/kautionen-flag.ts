/**
 * Feature flag `advanced-kautionsmanagment` for the deposit management ("Kautionsmanagement", GH-6).
 *
 * The flag is a boolean PostHog flag with a JSON payload. The flag state decides whether the deposit entry points
 * ("Kaution" in menus, table and the deposit card) are shown at all; the payload decides which deposit types,
 * booking types and functions are offered inside the dialog.
 *
 * Payload (version 1):
 *   {
 *     "version": 1,
 *     "arten": { "barkaution": true, "sparbuch": false, "buergschaft": false, "versicherung": false },
 *     "bewegungsarten": ["einzahlung", "auszahlung", "abzug"],
 *     "funktionen": { "raten": false, "dokumente": false, "fristen": false, "zinsen": false, "abrechnung": false }
 *   }
 *
 * UX only, not a security boundary: the payload is visible in the browser. The RPCs release deposit and booking
 * types per phase on their own, so the result is always intersected with `KAUTION_ARTEN_VERFUEGBAR` and
 * `KAUTION_BEWEGUNGSARTEN_VERFUEGBAR`. Rights and phase release stay in the database.
 *
 * Fail closed: a missing, malformed or unknown-version payload yields the phase 1 defaults (bar deposit, no
 * extra functions). A key that is missing counts as off. If nothing usable is left for `arten` or
 * `bewegungsarten`, the defaults are used so the dialog never ends up without a selectable option.
 *
 * Deliberately NOT a "use server" file and free of React/PostHog imports, so the parsing is testable on its own.
 */

import { POSTHOG_FEATURE_FLAGS } from "@/lib/constants";
import {
  KAUTION_ARTEN,
  KAUTION_ARTEN_VERFUEGBAR,
  KAUTION_BEWEGUNGSARTEN,
  KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
} from "@/lib/kautionen-constants";
import type { KautionArt, KautionBewegungsArt } from "@/types/Kaution";

export const KAUTION_FLAG_KEY = POSTHOG_FEATURE_FLAGS.ADVANCED_KAUTIONSMANAGEMENT;

/** Payload version this parser understands. Other versions fall back to the defaults. */
export const KAUTION_FLAG_PAYLOAD_VERSION = 1;

/** Functions of the later phases: phase 2 (raten, dokumente, fristen), phase 3 (zinsen), phase 4 (abrechnung). */
export const KAUTION_FUNKTIONEN = ["raten", "dokumente", "fristen", "zinsen", "abrechnung"] as const;
export type KautionFunktion = (typeof KAUTION_FUNKTIONEN)[number];

export interface KautionFlagKonfig {
  /** The flag is on for this user: the deposit entry points are shown. */
  aktiv: boolean;
  /** Offered deposit types (payload intersected with what the RPCs release), never empty. */
  arten: readonly KautionArt[];
  /** Offered booking types (payload intersected with what the RPCs release), never empty. */
  bewegungsarten: readonly KautionBewegungsArt[];
  funktionen: Readonly<Record<KautionFunktion, boolean>>;
}

const KEINE_FUNKTIONEN: Readonly<Record<KautionFunktion, boolean>> = {
  raten: false,
  dokumente: false,
  fristen: false,
  zinsen: false,
  abrechnung: false,
};

/** Phase 1 defaults, used whenever the payload is absent or unusable. */
export function standardKautionFlagKonfig(aktiv: boolean): KautionFlagKonfig {
  return {
    aktiv,
    arten: KAUTION_ARTEN_VERFUEGBAR,
    bewegungsarten: KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
    funktionen: KEINE_FUNKTIONEN,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** PostHog normally delivers the parsed JSON, but a payload stored as a JSON string is tolerated. */
function entpacke(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      const geparst: unknown = JSON.parse(raw);
      return isRecord(geparst) ? geparst : null;
    } catch {
      return null;
    }
  }
  return isRecord(raw) ? raw : null;
}

/**
 * Derives the configuration from the flag state and the raw payload (`undefined`/`null` = no payload).
 * Never throws.
 */
export function ermittleKautionFlagKonfig(aktiv: boolean, rawPayload: unknown): KautionFlagKonfig {
  const standard = standardKautionFlagKonfig(aktiv);
  const payload = entpacke(rawPayload);
  if (!payload || payload.version !== KAUTION_FLAG_PAYLOAD_VERSION) return standard;

  const artenPayload = isRecord(payload.arten) ? payload.arten : null;
  const arten = artenPayload
    ? KAUTION_ARTEN.filter((art) => artenPayload[art] === true && KAUTION_ARTEN_VERFUEGBAR.includes(art))
    : [];

  const bewegungenPayload = Array.isArray(payload.bewegungsarten) ? payload.bewegungsarten : null;
  const bewegungsarten = bewegungenPayload
    ? KAUTION_BEWEGUNGSARTEN.filter(
        (art) => bewegungenPayload.includes(art) && KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.includes(art)
      )
    : [];

  const funktionenPayload = isRecord(payload.funktionen) ? payload.funktionen : {};
  const funktionen = Object.fromEntries(
    KAUTION_FUNKTIONEN.map((funktion) => [funktion, funktionenPayload[funktion] === true])
  ) as Record<KautionFunktion, boolean>;

  return {
    aktiv,
    arten: arten.length > 0 ? arten : standard.arten,
    bewegungsarten: bewegungsarten.length > 0 ? bewegungsarten : standard.bewegungsarten,
    funktionen,
  };
}
