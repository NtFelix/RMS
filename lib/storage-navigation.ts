import { orgRootOfPath } from '@/lib/storage-paths'

/** Breadcrumb item shape, kept local to avoid importing the store module */
export interface StorageBreadcrumb {
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category'
}

export const STORAGE_ROOT_LABEL = 'Cloud Storage'

/** UI labels of the two zones below the org root */
const ZONE_LABELS: Record<string, string> = {
  shared: 'Gemeinsam',
  private: 'Privat',
}

/** URL of a storage path below `/dateien` (org root maps to `/dateien`) */
export function storageUrlFor(path: string): string {
  const root = orgRootOfPath(path)
  if (!root || path === root) return '/dateien'
  return `/dateien/${path.slice(root.length + 1)}`
}

/**
 * Label of one path segment, never an ID if a name is known:
 * display_name (from RPC) ?? zone label (first segment) ?? raw segment
 */
export function resolveSegmentLabel(segment: string, index: number, displayName?: string | null): string {
  if (displayName) return displayName
  if (index === 0 && ZONE_LABELS[segment]) return ZONE_LABELS[segment]
  return segment
}

/**
 * Breadcrumbs derived from a storage path without a server round trip.
 * Zone segments are shown with their labels; house, apartment and tenant
 * levels fall back to the segment itself until the RPC provides names.
 */
export function buildFallbackBreadcrumbs(path: string): StorageBreadcrumb[] {
  const root = orgRootOfPath(path)
  if (!root) {
    return [{ name: STORAGE_ROOT_LABEL, path, type: 'root' }]
  }

  const breadcrumbs: StorageBreadcrumb[] = [{ name: STORAGE_ROOT_LABEL, path: root, type: 'root' }]
  if (path === root) return breadcrumbs

  const segments = path.slice(root.length + 1).split('/')
  const isShared = segments[0] === 'shared'
  let current = root
  segments.forEach((segment, index) => {
    current = `${current}/${segment}`
    const type: StorageBreadcrumb['type'] =
      isShared && index === 1 ? 'house'
      : isShared && index === 2 ? 'apartment'
      : isShared && index === 3 ? 'tenant'
      : 'category'
    breadcrumbs.push({ name: resolveSegmentLabel(segment, index), path: current, type })
  })
  return breadcrumbs
}
