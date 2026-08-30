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

export function formatDateDeterministic(isoDateStr?: string | null): string {
  if (!isoDateStr) return "";
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return isoDateStr;
  }
}

export function formatDateTimeDeterministic(isoDateStr?: string | null): string {
  if (!isoDateStr) return "";
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year}, ${hours}:${minutes} Uhr`;
  } catch {
    return isoDateStr;
  }
}
