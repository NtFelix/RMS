/** @jest-environment node */

import { headers } from "next/headers"
import { unstable_rethrow } from "next/navigation"
import { AuthRequestGate } from "./auth-request-gates"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import { redirectAuthenticatedAuthRoute } from "@/lib/server/route-access"

jest.mock("next/headers", () => ({ headers: jest.fn() }))
jest.mock("next/navigation", () => ({ unstable_rethrow: jest.fn() }))
jest.mock("@/components/providers/csp-nonce-sync", () => ({ CSPNonceSync: jest.fn(() => null) }))
jest.mock("@/lib/server/route-access", () => ({ redirectAuthenticatedAuthRoute: jest.fn() }))

describe("AuthRequestGate", () => {
  const requestHeaders = new Headers({ "x-nonce": "nonce-1" })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(unstable_rethrow as jest.Mock).mockReset()
    ;(redirectAuthenticatedAuthRoute as jest.Mock).mockReset()
    ;(headers as jest.Mock).mockResolvedValue(requestHeaders)
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  it("checks the session with the headers it read and syncs the nonce", async () => {
    const element = await AuthRequestGate()

    expect(redirectAuthenticatedAuthRoute).toHaveBeenCalledWith(requestHeaders)
    expect(headers).toHaveBeenCalledTimes(1)
    expect(element.type).toBe(CSPNonceSync)
    expect(element.props.nonce).toBe("nonce-1")
  })

  it("propagates the redirect for an authenticated user", async () => {
    const redirectError = new Error("NEXT_REDIRECT")
    ;(redirectAuthenticatedAuthRoute as jest.Mock).mockRejectedValue(redirectError)
    ;(unstable_rethrow as jest.Mock).mockImplementation((error) => {
      throw error
    })

    await expect(AuthRequestGate()).rejects.toBe(redirectError)
  })

  it("still renders the auth page when the session check fails", async () => {
    ;(redirectAuthenticatedAuthRoute as jest.Mock).mockRejectedValue(new Error("supabase down"))

    const element = await AuthRequestGate()

    expect(element.type).toBe(CSPNonceSync)
    expect(console.error).toHaveBeenCalled()
  })
})
