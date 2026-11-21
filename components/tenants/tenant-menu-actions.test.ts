import { getVisibleActions, tenantActions } from "@/components/tenants/tenant-menu-actions"
import type { Tenant } from "@/types/Tenant"

// Kautionsmanagement (GH-6): Der Menüeintrag "Kaution" hängt am Modulrecht `kautionen: ansehen`.
describe("getVisibleActions", () => {
  const tenant: Tenant = { id: "t1", name: "Test Mieter" }
  const applicant: Tenant = { ...tenant, bewerbung_metadaten: { fit: "A" } }

  const keys = (actions: ReturnType<typeof getVisibleActions>) => actions.map((action) => action.key)

  it("hides the Kaution entry without the module right", () => {
    expect(keys(getVisibleActions(tenant, { templatesEnabled: true, canViewKautionen: false }))).not.toContain("kaution")
  })

  it("shows the Kaution entry with the module right", () => {
    expect(keys(getVisibleActions(tenant, { templatesEnabled: true, canViewKautionen: true }))).toContain("kaution")
  })

  it("keeps the Kaution entry first (menu order)", () => {
    expect(keys(getVisibleActions(tenant, { templatesEnabled: true, canViewKautionen: true }))[0]).toBe("kaution")
  })

  it("does not tie the Kaution entry to the template flag or to applicant data", () => {
    expect(keys(getVisibleActions(tenant, { templatesEnabled: false, canViewKautionen: true }))).toEqual(["kaution"])
    expect(keys(getVisibleActions(applicant, { templatesEnabled: false, canViewKautionen: true }))).toEqual(["kaution", "datenblatt"])
  })

  it("leaves the other entries unchanged by the module right", () => {
    expect(keys(getVisibleActions(applicant, { templatesEnabled: true, canViewKautionen: false }))).toEqual(["datenblatt", "vorlagen"])
    expect(keys(getVisibleActions(tenant, { templatesEnabled: false, canViewKautionen: false }))).toEqual([])
  })

  it("defines the Kaution entry with the label 'Kaution'", () => {
    expect(tenantActions.find((action) => action.key === "kaution")?.label).toBe("Kaution")
  })
})

// Bewerber (GH-30): "Als Mieter übernehmen" gilt nur für Bewerber und nur mit Bearbeitungsrecht.
describe("getVisibleActions - Bewerber übernehmen (GH-30)", () => {
  const mieter: Tenant = { id: "m1", name: "Mieter Probe" }
  const bewerber: Tenant = { id: "b1", name: "Bewerber Probe", status: "bewerber" }
  const keys = (actions: ReturnType<typeof getVisibleActions>) => actions.map((action) => action.key)

  it("shows the takeover entry for applicants", () => {
    expect(keys(getVisibleActions(bewerber, { templatesEnabled: false, canViewKautionen: false }))).toContain("uebernehmen")
  })

  it("hides the takeover entry for tenants", () => {
    expect(keys(getVisibleActions(mieter, { templatesEnabled: false, canViewKautionen: false }))).not.toContain("uebernehmen")
  })

  it("hides the takeover entry without the edit right", () => {
    expect(keys(getVisibleActions(bewerber, { templatesEnabled: false, canViewKautionen: false, canEdit: false }))).not.toContain("uebernehmen")
  })

  it("hides the Kaution entry for applicants (no tenancy, no deposit)", () => {
    expect(keys(getVisibleActions(bewerber, { templatesEnabled: false, canViewKautionen: true }))).not.toContain("kaution")
  })

  it("defines the takeover entry with the label of the menu", () => {
    expect(tenantActions.find((action) => action.key === "uebernehmen")?.label).toBe("Als Mieter übernehmen")
  })
})
