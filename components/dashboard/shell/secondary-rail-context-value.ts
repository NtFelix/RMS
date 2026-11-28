import { createContext } from "react"

// State of the contextual secondary rail. The shell owns one host element (always mounted); pages portal their
// rail content into it (see SecondaryRail), so the content never remounts when the viewport crosses `lg`.

export interface SecondaryRailContextValue {
  hostNode: HTMLElement | null
  setHostNode: (node: HTMLElement | null) => void
  /** True while at least one SecondaryRail is mounted; the shell shows the column only then. */
  hasRail: boolean
  /** Called by a mounted SecondaryRail; the returned function unregisters it. */
  registerRail: () => () => void
  /** Drawer state below `lg`. */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

export const SecondaryRailContext = createContext<SecondaryRailContextValue | null>(null)

// Fallback outside the shell (e.g. unit tests of pages): no rail, nothing to open.
export const NO_SHELL: SecondaryRailContextValue = {
  hostNode: null,
  setHostNode: () => {},
  hasRail: false,
  registerRail: () => () => {},
  drawerOpen: false,
  setDrawerOpen: () => {},
}
