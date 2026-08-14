export interface ApiKeyItem {
  id: string;
  organisation_id: string;
  mitglied_id: string;
  name: string;
  key_prefix: string | null;
  environment: "live" | "test";
  status: "ausstehend" | "aktiv" | "abgelehnt" | "widerrufen" | "pausiert";
  erstellt_von: string | null;
  ersteller_email?: string | null;
  ersteller_first_name?: string | null;
  ersteller_last_name?: string | null;
  angefragte_berechtigungen: Record<string, unknown> | null;
  berechtigungen: Record<string, unknown> | null;
  genehmigt_von: string | null;
  genehmigt_von_email?: string | null;
  genehmigt_von_first_name?: string | null;
  genehmigt_von_last_name?: string | null;
  genehmigt_am: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  pausiert_grund: string | null;
  erstellt_am: string;
  geaendert_am: string;
  ersteller_status?: string;
}

export const AVAILABLE_MODULES = [
  { id: "haeuser", label: "Häuser" },
  { id: "wohnungen", label: "Wohnungen" },
  { id: "mieter", label: "Mieter" },
  { id: "finanzen", label: "Finanzen" },
  { id: "aufgaben", label: "Aufgaben" },
  { id: "zaehler", label: "Zähler" },
  { id: "zaehler_ablesungen", label: "Zählerablesungen" },
] as const;

export const AVAILABLE_ACTIONS = [
  { id: "ansehen", label: "Lesen" },
  { id: "erstellen", label: "Erstellen" },
  { id: "bearbeiten", label: "Bearbeiten" },
  { id: "loeschen", label: "Löschen" },
] as const;

export function formatUserName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  if (fullName) {
    return email ? `${fullName} (${email})` : fullName;
  }
  return email || "Unbekannter Nutzer";
}
