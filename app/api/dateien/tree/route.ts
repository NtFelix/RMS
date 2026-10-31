import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { hasPermission } from '@/lib/permissions'
import { getActiveOrgId } from '@/lib/storage-access'
import { OWN_PRIVATE_FOLDER_LABEL, STORAGE_ROOT_LABEL, SYSTEM_FOLDER_LABELS, ZONE_LABELS } from '@/lib/storage-navigation'
import {
  assertPathAllowed,
  ARCHIVE_SEGMENT,
  FINANCE_SEGMENT,
  ID_SEGMENT_PATTERN,
  orgRoot,
  parseStoragePath,
  privateRoot,
  requiredViewModules,
  sharedPath,
  sharedRoot,
  StoragePathError,
  type PathAccessContext,
} from '@/lib/storage-paths'


interface TreeNode {
  id: string
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  children?: TreeNode[]
  isEmpty?: boolean
  fileCount?: number
}

/** Folder node without children loaded yet (children only for the root node) */
function folderNode(path: string, name: string, displayName?: string, children: TreeNode[] = []): TreeNode {
  return { id: path, name, path, type: 'folder', displayName, children, isEmpty: false, fileCount: 0 }
}

const HOUSE_DOCUMENTS = 'house_documents'
const APARTMENT_DOCUMENTS = 'apartment_documents'

/** System folder node (Hausdokumente / Wohnungsdokumente), shown even if nothing was uploaded yet */
function systemNode(path: string, name: string): TreeNode {
  return folderNode(path, name, SYSTEM_FOLDER_LABELS[name])
}

/** Archive node below a zone (house or private area), shown instead of the raw __archive__ folder */
function archiveNode(zoneBase: string): TreeNode {
  return folderNode(`${zoneBase}/${ARCHIVE_SEGMENT}`, 'Archiv', 'Archiv')
}

/**
 * Module rights that the database asks for below a house (apartment level: `wohnungen:ansehen`, tenant level:
 * `mieter:ansehen`). The database decides on its own (storage policies), this only keeps the tree free of names and
 * folders the user could not open. Each right is read at most once per request, and only if a path needs it.
 */
interface ViewRights {
  wohnungen: () => Promise<boolean>
  mieter: () => Promise<boolean>
}

function createViewRights(): ViewRights {
  const once = (read: () => Promise<boolean>) => {
    let result: Promise<boolean> | undefined
    return () => (result ??= read())
  }
  return {
    wohnungen: once(() => hasPermission('wohnungen', 'ansehen')),
    mieter: once(() => hasPermission('mieter', 'ansehen')),
  }
}

/**
 * Keeps only the nodes the user may open: whatever the classification of requiredViewModules (the same one that
 * guards the listing of a folder) assigns to the apartment or tenant level needs the matching right. This also covers
 * archive paths (`__archive__/{timestamp}/...`) and every spelling of an id. A path that cannot be classified cannot
 * be opened either and is left out.
 */
async function filterByViewRights(nodes: TreeNode[], rights: ViewRights): Promise<TreeNode[]> {
  const visible: TreeNode[] = []
  for (const node of nodes) {
    let required
    try {
      required = requiredViewModules(node.path)
    } catch (error) {
      if (error instanceof StoragePathError) continue
      throw error
    }
    if (required.wohnungen && !(await rights.wohnungen())) continue
    if (required.mieter && !(await rights.mieter())) continue
    visible.push(node)
  }
  return visible
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // The user is the one of the session; a `userId` query parameter of older clients is ignored
    const path = searchParams.get('path')

    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // The house scope is only needed to list a folder, the root tree does not use it
    const [orgId, accessibleHouseIds] = await Promise.all([
      getActiveOrgId(supabase),
      path ? getAccessibleHaeuserIds() : Promise.resolve(null),
    ])
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organisation' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const ctx: PathAccessContext = { orgId, userId: user.id, accessibleHouseIds }

    if (path) {
      const children = await loadFolderChildren(supabase, ctx, path, createViewRights())
      return NextResponse.json({ children }, { headers: NO_CACHE_HEADERS })
    }

    const tree = loadRootTree(ctx)
    return NextResponse.json({ tree }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    unstable_rethrow(error)
    console.error('Unexpected error loading folder tree:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

function zoneNodes(ctx: PathAccessContext): TreeNode[] {
  return [
    folderNode(sharedRoot(ctx.orgId), ZONE_LABELS.shared, ZONE_LABELS.shared),
    folderNode(privateRoot(ctx.orgId, ctx.userId), ZONE_LABELS.private, ZONE_LABELS.private),
  ]
}

function loadRootTree(ctx: PathAccessContext): TreeNode[] {
  return [folderNode(orgRoot(ctx.orgId), STORAGE_ROOT_LABEL, STORAGE_ROOT_LABEL, zoneNodes(ctx))]
}

/**
 * Children of one folder. Houses, apartments and tenants come from the database (display name),
 * the system folders Hausdokumente/Wohnungsdokumente are always present, the storage listing only
 * adds custom folders. Everything else shows the storage folder name.
 */
async function loadFolderChildren(supabase: any, ctx: PathAccessContext, folderPath: string, rights: ViewRights): Promise<TreeNode[]> {
  try {
    assertPathAllowed(folderPath, ctx)
  } catch (error) {
    if (error instanceof StoragePathError) return []
    throw error
  }

  const parsed = parseStoragePath(folderPath)
  const { orgId } = ctx

  // Below the apartment / tenant level the folder is only listed for users with the matching right
  // (the same empty answer as for a folder that does not exist)
  const required = requiredViewModules(folderPath)
  if (required.wohnungen && !(await rights.wohnungen())) return []
  if (required.mieter && !(await rights.mieter())) return []

  if (parsed.zone === 'root') {
    return zoneNodes(ctx)
  }

  if (parsed.zone === 'shared' && parsed.houseId === undefined) {
    let query = supabase.from('Haeuser').select('id, name')
    if (ctx.accessibleHouseIds !== null) {
      query = query.in('id', ctx.accessibleHouseIds)
    }
    const { data: houses } = await query
    const nodes: TreeNode[] = (houses ?? []).map((h: { id: string; name: string | null }) =>
      folderNode(sharedPath(orgId, h.id), h.name || h.id, h.name || undefined),
    )
    return sortNodes(nodes)
  }

  // Private zone root: the storage listing of `private` holds the folders of all members (their user ids).
  // Only the own folder is shown, never a foreign one.
  if (parsed.zone === 'private' && parsed.userId === undefined) {
    const ownPath = privateRoot(orgId, ctx.userId)
    return [folderNode(ownPath, OWN_PRIVATE_FOLDER_LABEL, OWN_PRIVATE_FOLDER_LABEL)]
  }

  // House folder: Hausdokumente always, apartments from the database, additional custom folders from storage
  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 0) {
    const houseId = parsed.houseId
    // Apartments (names and folders) only for users with wohnungen:ansehen, the house level itself stays as it is
    const { data: apartments } = (await rights.wohnungen())
      ? await supabase.from('Wohnungen').select('id, name').eq('haus_id', houseId)
      : { data: [] }
    const apartmentNodes: TreeNode[] = (apartments ?? []).map((a: { id: string; name: string | null }) =>
      folderNode(sharedPath(orgId, houseId, a.id), a.name || a.id, a.name || undefined),
    )
    const known = new Set<string>([HOUSE_DOCUMENTS, ...(apartments ?? []).map((a: { id: string }) => a.id)])
    const customNodes = await listCustomFolderNodes(supabase, folderPath, known, (segment) => sharedPath(orgId, houseId, segment))
    return [
      archiveNode(sharedPath(orgId, houseId)),
      systemNode(sharedPath(orgId, houseId, HOUSE_DOCUMENTS), HOUSE_DOCUMENTS),
      ...sortNodes([...apartmentNodes, ...customNodes]),
    ]
  }

  // Apartment folder (only a UUID segment is an apartment: not __archive__, not a system or custom folder)
  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 1 && ID_SEGMENT_PATTERN.test(parsed.rest[0])) {
    const houseId = parsed.houseId
    const apartmentId = parsed.rest[0]
    // The apartment must belong to the house of the path (whose scope was checked above)
    const { data: apartment } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('id', apartmentId)
      .eq('haus_id', houseId)
      .maybeSingle()
    if (!apartment) return []
    // Tenants (names and folders) only for users with mieter:ansehen
    const { data: tenants } = (await rights.mieter())
      ? await supabase.from('Mieter').select('id, name').eq('wohnung_id', apartmentId)
      : { data: [] }
    const tenantNodes: TreeNode[] = (tenants ?? []).map((t: { id: string; name: string | null }) =>
      folderNode(sharedPath(orgId, houseId, apartmentId, t.id), t.name || t.id, t.name || undefined),
    )
    const known = new Set<string>([APARTMENT_DOCUMENTS, ...(tenants ?? []).map((t: { id: string }) => t.id)])
    const customNodes = await listCustomFolderNodes(supabase, folderPath, known, (segment) =>
      sharedPath(orgId, houseId, apartmentId, segment),
    )
    return [
      systemNode(sharedPath(orgId, houseId, apartmentId, APARTMENT_DOCUMENTS), APARTMENT_DOCUMENTS),
      ...sortNodes([...tenantNodes, ...customNodes]),
    ]
  }

  // Finance documents: `Rechnungen/{apartmentId}` folders are shown with the name of the apartment (only for
  // users with wohnungen:ansehen, the others do not get these folders at all, see filterByViewRights)
  let lookup: (segment: string) => string | undefined = () => undefined
  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 1 && parsed.rest[0] === FINANCE_SEGMENT && (await rights.wohnungen())) {
    const { data: apartments } = await supabase.from('Wohnungen').select('id, name').eq('haus_id', parsed.houseId)
    const names = new Map<string, string>(
      (apartments ?? []).filter((a: { name: string | null }) => a.name).map((a: { id: string; name: string }) => [a.id, a.name]),
    )
    lookup = (segment) => names.get(segment)
  }

  const nodes = await filterByViewRights(
    await listFolderNodes(supabase, folderPath, lookup, (segment) => `${folderPath}/${segment}`),
    rights,
  )
  if (parsed.zone === 'private' && parsed.rest.length === 0) {
    return [archiveNode(folderPath), ...nodes]
  }
  return nodes
}

/** Storage list() returns at most this many entries per call, larger folders are read page by page */
const STORAGE_LIST_PAGE_SIZE = 1000

/** Storage sub-folder names of folderPath (entries without metadata), all pages, without `.keep` and `__archive__` */
async function listStorageFolderNames(supabase: any, folderPath: string): Promise<string[]> {
  const names: string[] = []
  for (let offset = 0; ; offset += STORAGE_LIST_PAGE_SIZE) {
    const { data: items } = await supabase.storage
      .from('documents')
      .list(folderPath, { limit: STORAGE_LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })
    for (const item of items ?? []) {
      if (!item.name || item.name === '.keep' || item.name === ARCHIVE_SEGMENT || item.metadata) continue
      names.push(item.name)
    }
    if ((items?.length ?? 0) < STORAGE_LIST_PAGE_SIZE) break
  }
  return names
}

/**
 * Lists storage sub-folders of folderPath and maps them to tree nodes.
 * Display name: lookup (database) ?? system label ?? storage name.
 */
async function listFolderNodes(
  supabase: any,
  folderPath: string,
  lookup: (segment: string) => string | undefined,
  childPath: (segment: string) => string,
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = []
  for (const name of await listStorageFolderNames(supabase, folderPath)) {
    const displayName = lookup(name) ?? SYSTEM_FOLDER_LABELS[name]
    nodes.push(folderNode(childPath(name), displayName ?? name, displayName))
  }
  return sortNodes(nodes)
}

/**
 * Additional (custom) storage folders below a house or apartment: everything in the storage listing that
 * is neither a known system/database folder nor an orphaned UUID folder (apartment or tenant that no
 * longer exists, as before the storage-based tree).
 */
async function listCustomFolderNodes(
  supabase: any,
  folderPath: string,
  known: Set<string>,
  childPath: (segment: string) => string,
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = []
  for (const name of await listStorageFolderNames(supabase, folderPath)) {
    if (known.has(name) || ID_SEGMENT_PATTERN.test(name)) continue
    nodes.push(folderNode(childPath(name), name, name))
  }
  return nodes
}

/** Alphabetical order, Miscellaneous last */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.name === 'Miscellaneous') return 1
    if (b.name === 'Miscellaneous') return -1
    return a.name.localeCompare(b.name, 'de')
  })
}
