/** @jest-environment node */

import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/constants"
import { redirectAuthenticatedAuthRoute } from "./route-access"
import { createSupabaseServerClient } from "@/lib/supabase-server"

jest.mock("next/headers", () => ({ headers: jest.fn() }))
jest.mock("next/server", () => ({ NextResponse: { json: jest.fn() } }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  unstable_rethrow: jest.fn(),
}))
jest.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: jest.fn() }))

function requestHeaders(pathname: string | null, search = "") {
  const headers = new Headers({ "x-current-search": search })
  if (pathname) headers.set("x-current-pathname", pathname)
  return headers
}

describe("redirectAuthenticatedAuthRoute", () => {
  const getUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    ;(createSupabaseServerClient as jest.Mock).mockResolvedValue({ auth: { getUser } })
  })

  it("redirects an authenticated user away from auth pages to the dashboard", async () => {
    await redirectAuthenticatedAuthRoute(requestHeaders("/auth/register"))

    expect(redirect).toHaveBeenCalledWith(ROUTES.HOME)
  })

  it("honours a relative redirect parameter and ignores absolute URLs", async () => {
    await redirectAuthenticatedAuthRoute(requestHeaders("/auth/register", "?redirect=%2Fmieter"))
    expect(redirect).toHaveBeenLastCalledWith("/mieter")

    await redirectAuthenticatedAuthRoute(requestHeaders("/auth/register", "?redirect=https%3A%2F%2Fevil.example"))
    expect(redirect).toHaveBeenLastCalledWith(ROUTES.HOME)
  })

  it.each(["//evil.example", "/\\evil.example", "///evil.example"])(
    "ignores the protocol-relative redirect target %s",
    async (target) => {
      await redirectAuthenticatedAuthRoute(
        requestHeaders("/auth/register", `?redirect=${encodeURIComponent(target)}`),
      )

      expect(redirect).toHaveBeenLastCalledWith(ROUTES.HOME)
    },
  )

  it.each(["/auth/login-x", "/auth/update-password-foo"])(
    "redirects authenticated users on the look-alike path %s",
    async (pathname) => {
      await redirectAuthenticatedAuthRoute(requestHeaders(pathname))

      expect(redirect).toHaveBeenCalledWith(ROUTES.HOME)
    },
  )

  it.each(["/auth/login", "/auth/login/sub", "/auth/update-password"])(
    "leaves %s reachable for authenticated users",
    async (pathname) => {
      await redirectAuthenticatedAuthRoute(requestHeaders(pathname))

      expect(createSupabaseServerClient).not.toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    },
  )

  it("does not redirect unauthenticated users", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    await redirectAuthenticatedAuthRoute(requestHeaders("/auth/register"))

    expect(redirect).not.toHaveBeenCalled()
  })
})
