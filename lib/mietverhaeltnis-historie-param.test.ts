/** @jest-environment node */
import { nutztMietHistorie } from "@/lib/mietverhaeltnis-historie-param"

describe("nutztMietHistorie", () => {
  it("is true only for miethistorie=1", () => {
    expect(nutztMietHistorie(new Request("http://localhost/api/tenants-data?miethistorie=1"))).toBe(true)
    expect(nutztMietHistorie(new Request("http://localhost/api/tenants-data"))).toBe(false)
    expect(nutztMietHistorie(new Request("http://localhost/api/tenants-data?miethistorie=0"))).toBe(false)
    expect(nutztMietHistorie(new Request("http://localhost/api/tenants-data?miethistorie=true"))).toBe(false)
  })

  it("is false for a request without a usable URL", () => {
    expect(nutztMietHistorie({ url: "kein-url" } as unknown as Request)).toBe(false)
  })
})
