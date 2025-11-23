import { TourStep } from "./store"

export const ONBOARDING_STEPS: TourStep[] = [
  // 1. House Creation
  {
    id: "dashboard-houses",
    targetId: "dashboard-houses-card",
    title: "Erste Schritte",
    description: "Beginnen Sie mit dem Anlegen Ihrer ersten Immobilie. Klicken Sie auf 'Häuser'.",
    route: "/home",
  },
  {
    id: "add-house-btn",
    targetId: "add-house-btn",
    title: "Haus hinzufügen",
    description: "Klicken Sie hier, um ein neues Haus anzulegen.",
    route: "/haeuser",
  },
  {
    id: "house-modal-save",
    targetId: "house-modal-save-btn",
    title: "Haus speichern",
    description: "Geben Sie die Daten ein und klicken Sie auf 'Speichern'.",
    waitForAction: true,
  },

  // 2. Apartment Creation
  {
    id: "house-card-first",
    targetId: "house-card-0", // First house in list
    title: "Haus auswählen",
    description: "Öffnen Sie das Haus, um Wohnungen hinzuzufügen.",
    route: "/haeuser",
  },
  {
    id: "add-apartment-btn",
    targetId: "add-apartment-btn",
    title: "Wohnung hinzufügen",
    description: "Legen Sie nun eine Wohnung in diesem Haus an.",
  },
  {
    id: "apartment-modal-save",
    targetId: "apartment-modal-save-btn",
    title: "Wohnung speichern",
    description: "Speichern Sie die Wohnungsdaten.",
    waitForAction: true,
  },

  // 3. Water Meter
  {
    id: "apartment-card-first",
    targetId: "apartment-row-0", // First apartment
    title: "Wohnung auswählen",
    description: "Klicken Sie auf die Wohnung, um Zähler und Mieter zu verwalten.",
  },
  {
    id: "open-meters-btn",
    targetId: "open-meters-btn",
    title: "Wasserzähler",
    description: "Öffnen Sie die Wasserzähler-Verwaltung.",
  },
  {
    id: "add-meter-input",
    targetId: "water-meter-input-group", // Group containing input and add button
    title: "Zähler hinzufügen",
    description: "Geben Sie eine Zähler-ID ein und klicken Sie auf 'Hinzufügen'.",
    placement: "top"
  },
  {
    id: "close-meters-modal",
    targetId: "close-meters-btn",
    title: "Fertig",
    description: "Schließen Sie das Fenster, wenn Sie fertig sind.",
    waitForAction: true,
  },

  // 4. Tenant
  {
    id: "add-tenant-btn",
    targetId: "add-tenant-btn",
    title: "Mieter hinzufügen",
    description: "Fügen Sie jetzt einen Mieter zu dieser Wohnung hinzu.",
  },
  {
    id: "tenant-modal-save",
    targetId: "tenant-modal-save-btn",
    title: "Mieter speichern",
    description: "Speichern Sie die Mieterdaten.",
    waitForAction: true,
  },

  // 5. Nebenkosten
  {
    id: "nav-betriebskosten",
    targetId: "nav-betriebskosten", // Sidebar link
    title: "Betriebskosten",
    description: "Wechseln Sie zum Bereich Betriebskosten.",
  },
  {
    id: "create-abrechnung-dropdown",
    targetId: "create-abrechnung-dropdown",
    title: "Abrechnung erstellen",
    description: "Starten Sie eine neue Abrechnung.",
    route: "/betriebskosten",
  },
  {
    id: "template-default",
    targetId: "template-default-btn",
    title: "Standardvorlage",
    description: "Wählen Sie die Standardvorlage für einen schnellen Start.",
    waitForAction: true, // Need to wait for creation
  },
  {
    id: "nebenkosten-row-menu",
    targetId: "nebenkosten-row-0-actions",
    title: "Aktionen öffnen",
    description: "Öffnen Sie das Menü für die erstellte Abrechnung.",
  },
  {
    id: "open-overview-btn",
    targetId: "action-overview",
    title: "Übersicht prüfen",
    description: "Klicken Sie auf 'Übersicht', um die Daten zu prüfen.",
  },
  {
    id: "create-final-abrechnung",
    targetId: "create-final-abrechnung-btn",
    title: "Abschließen",
    description: "Erstellen Sie die finale Abrechnung.",
    waitForAction: true, // End of tour
  }
]
