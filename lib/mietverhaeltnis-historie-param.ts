/**
 * Query switch that tells the payment routes to use the rent history (GH-17).
 *
 * Why a switch: without it the routes would use the history for every user as soon as tenancies exist (backfill),
 * although users without the feature flag can only change the rent at the apartment (`Wohnungen.miete`). Their
 * payment check would then ignore that change. With the switch, users without the flag keep today's behaviour.
 * This is a calculation mode, not a security boundary: the routes check the rights themselves.
 *
 * Server-safe module (no browser imports). The client part lives in `lib/mietverhaeltnis-historie-query.ts`.
 */
export const MIETHISTORIE_PARAM = "miethistorie"

/** Server side: true if the request asks for the history-aware calculation. */
export function nutztMietHistorie(request: Request): boolean {
  try {
    return new URL(request.url).searchParams.get(MIETHISTORIE_PARAM) === "1"
  } catch {
    return false
  }
}
