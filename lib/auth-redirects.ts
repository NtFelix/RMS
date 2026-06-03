import { ROUTES } from "@/lib/constants"

export function getSafeAuthRedirect(param: string | null | undefined, origin: string): string {
  if (!param) return ROUTES.HOME

  try {
    const url = new URL(param, origin)
    if (url.origin !== origin) return ROUTES.HOME
    return url.pathname + url.search + url.hash
  } catch {
    return ROUTES.HOME
  }
}

export function appendSafeAuthRedirect(callbackUrl: URL, redirect: string | null | undefined): void {
  const safeRedirect = getSafeAuthRedirect(redirect, callbackUrl.origin)
  if (safeRedirect !== ROUTES.HOME) {
    callbackUrl.searchParams.set("redirect", safeRedirect)
  }
}
