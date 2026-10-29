import { orgRootOfPath } from '@/lib/storage-paths'

/** Breadcrumb item shape, kept local to avoid importing the store module */
export interface StorageBreadcrumb {
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category'
}

export const STORAGE_ROOT_LABEL = 'Cloud Storage'

/** UI labels of the two zones below the org root */
export const ZONE_LABELS: Record<string, string> = {
  shared: 'Gemeinsam',
  private: 'Privat',
}

/** UI labels of the system folders below a house or apartment */
export const SYSTEM_FOLDER_LABELS: Record<string, string> = {
  house_documents: 'Hausdokumente',
  apartment_documents: 'Wohnungsdokumente',
  Rechnungen: 'Rechnungen',
}

/** URL of a storage path below `/dateien` (org root maps to `/dateien`) */
export function storageUrlFor(path: string): string {
  const root = orgRootOfPath(path)
  if (!root || path === root) return '/dateien'
  return `/dateien/${path.slice(root.length + 1)}`
}

/** Storage path of a `/dateien` URL path (without the `/dateien` prefix), counterpart of storageUrlFor */
export function storagePathFromUrl(root: string, urlPath: string): string {
  return urlPath ? `${root}/${urlPath}` : root
}

/** Label of one path segment: zone label (first segment) ?? raw segment */
export function resolveSegmentLabel(segment: string, index: number): string {
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
