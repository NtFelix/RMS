import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { getActiveOrgId } from '@/lib/storage-access'
import { STORAGE_ROOT_LABEL, SYSTEM_FOLDER_LABELS, ZONE_LABELS } from '@/lib/storage-navigation'
import {
  assertPathAllowed,
  ARCHIVE_SEGMENT,
  orgRoot,
  parseStoragePath,
  privateRoot,
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

/** Archive node below a zone (house or private area), shown instead of the raw __archive__ folder */
function archiveNode(zoneBase: string): TreeNode {
  return folderNode(`${zoneBase}/${ARCHIVE_SEGMENT}`, 'Archiv', 'Archiv')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const path = searchParams.get('path')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
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

    const ctx: PathAccessContext = { orgId, userId, accessibleHouseIds }

    if (path) {
      const children = await loadFolderChildren(supabase, ctx, path)
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
 * Children of one folder. Names are resolved from the database for house, apartment and
 * tenant folders (display name), system folders get fixed labels, everything else shows
 * the storage folder name.
 */
async function loadFolderChildren(supabase: any, ctx: PathAccessContext, folderPath: string): Promise<TreeNode[]> {
  try {
    assertPathAllowed(folderPath, ctx)
  } catch (error) {
    if (error instanceof StoragePathError) return []
    throw error
  }

  const parsed = parseStoragePath(folderPath)
  const { orgId } = ctx

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

  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 0) {
    const houseId = parsed.houseId
    const { data: apartments } = await supabase.from('Wohnungen').select('id, name').eq('haus_id', houseId)
    const names = new Map<string, string>((apartments ?? []).map((a: { id: string; name: string | null }) => [a.id, a.name || a.id]))
    const nodes = await listFolderNodes(supabase, folderPath, (segment) => names.get(segment), (segment) =>
      sharedPath(orgId, houseId, segment),
    )
    return [archiveNode(sharedPath(orgId, houseId)), ...nodes]
  }

  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 1) {
    const apartmentId = parsed.rest[0]
    const { data: tenants } = await supabase.from('Mieter').select('id, name').eq('wohnung_id', apartmentId)
    const names = new Map<string, string>((tenants ?? []).map((t: { id: string; name: string | null }) => [t.id, t.name || t.id]))
    return listFolderNodes(supabase, folderPath, (segment) => names.get(segment), (segment) =>
      sharedPath(orgId, parsed.houseId as string, apartmentId, segment),
    )
  }

  const nodes = await listFolderNodes(supabase, folderPath, () => undefined, (segment) => `${folderPath}/${segment}`)
  if (parsed.zone === 'private' && parsed.rest.length === 0) {
    return [archiveNode(folderPath), ...nodes]
  }
  return nodes
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
  const { data: items } = await supabase.storage.from('documents').list(folderPath, { limit: 1000 })
  const nodes: TreeNode[] = []
  for (const item of items ?? []) {
    if (!item.name || item.name === '.keep' || item.name === ARCHIVE_SEGMENT || item.metadata) continue
    const displayName = lookup(item.name) ?? SYSTEM_FOLDER_LABELS[item.name]
    nodes.push(folderNode(childPath(item.name), displayName ?? item.name, displayName))
  }
  return sortNodes(nodes)
}

/** Alphabetical order, Miscellaneous last */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.name === 'Miscellaneous') return 1
    if (b.name === 'Miscellaneous') return -1
    return a.name.localeCompare(b.name, 'de')
  })
}
