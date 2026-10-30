import { cache } from "react"
import { hasPermission } from "@/lib/permissions"

/**
 * Modulrecht `kautionen: ansehen` (GH-6) des angemeldeten Nutzers, pro Request nur einmal ausgewertet.
 * Layout und Seite (z. B. /mieter) fragen es beide ab; `cache()` teilt das Ergebnis innerhalb eines Server-Requests.
 * Nur UX (Menüpunkte, Kautionskarte): maßgeblich bleiben die RPCs und die Datenbank.
 */
export const canViewKautionen = cache(async (): Promise<boolean> => hasPermission("kautionen", "ansehen"))
