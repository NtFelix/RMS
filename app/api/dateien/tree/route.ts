import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { getActiveOrgId } from '@/lib/storage-access'
import {
  assertPathAllowed,
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

/** Labels for system folders below a house or apartment */
const SYSTEM_FOLDER_LABELS: Record<string, string> = {
  house_documents: 'Hausdokumente',
  apartment_documents: 'Wohnungsdokumente',
  Rechnungen: 'Rechnungen',
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

    const orgId = await getActiveOrgId(supabase)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organisation' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const ctx: PathAccessContext = {
      orgId,
      userId,
      accessibleHouseIds: await getAccessibleHaeuserIds(),
    }

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
    { id: sharedRoot(ctx.orgId), name: 'Gemeinsam', path: sharedRoot(ctx.orgId), type: 'folder', displayName: 'Gemeinsam', children: [], isEmpty: false, fileCount: 0 },
    { id: privateRoot(ctx.orgId, ctx.userId), name: 'Privat', path: privateRoot(ctx.orgId, ctx.userId), type: 'folder', displayName: 'Privat', children: [], isEmpty: false, fileCount: 0 },
  ]
}

function loadRootTree(ctx: PathAccessContext): TreeNode[] {
  const rootPath = orgRoot(ctx.orgId)
  return [
    {
      id: rootPath,
      name: 'Cloud Storage',
      path: rootPath,
      type: 'folder',
      displayName: 'Cloud Storage',
      children: zoneNodes(ctx),
      isEmpty: false,
      fileCount: 0,
    },
  ]
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
    const nodes: TreeNode[] = (houses ?? []).map((h: { id: string; name: string | null }) => {
      const path = sharedPath(orgId, h.id)
      return { id: path, name: h.name || h.id, path, type: 'folder', displayName: h.name || undefined, children: [], isEmpty: false, fileCount: 0 }
    })
    return sortNodes(nodes)
  }

  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 0) {
    const houseId = parsed.houseId
    const { data: apartments } = await supabase.from('Wohnungen').select('id, name').eq('haus_id', houseId)
    const names = new Map<string, string>((apartments ?? []).map((a: { id: string; name: string | null }) => [a.id, a.name || a.id]))
    return listFolderNodes(supabase, folderPath, (segment) => names.get(segment), (segment) => ({
      path: sharedPath(orgId, houseId, segment),
    }))
  }

  if (parsed.zone === 'shared' && parsed.houseId !== undefined && parsed.rest.length === 1) {
    const apartmentId = parsed.rest[0]
    const { data: tenants } = await supabase.from('Mieter').select('id, name').eq('wohnung_id', apartmentId)
    const names = new Map<string, string>((tenants ?? []).map((t: { id: string; name: string | null }) => [t.id, t.name || t.id]))
    return listFolderNodes(supabase, folderPath, (segment) => names.get(segment), (segment) => ({
      path: sharedPath(orgId, parsed.houseId as string, apartmentId, segment),
    }))
  }

  return listFolderNodes(supabase, folderPath, () => undefined, (segment) => ({
    path: `${folderPath}/${segment}`,
  }))
}

/**
 * Lists storage sub-folders of folderPath and maps them to tree nodes.
 * Display name: lookup (database) ?? system label ?? storage name.
 */
async function listFolderNodes(
  supabase: any,
  folderPath: string,
  lookup: (segment: string) => string | undefined,
  childPath: (segment: string) => { path: string },
): Promise<TreeNode[]> {
  const { data: items } = await supabase.storage.from('documents').list(folderPath, { limit: 1000 })
  const nodes: TreeNode[] = []
  for (const item of items ?? []) {
    if (!item.name || item.name === '.keep' || item.metadata) continue
    const displayName = lookup(item.name) ?? SYSTEM_FOLDER_LABELS[item.name]
    const { path } = childPath(item.name)
    nodes.push({
      id: path,
      name: displayName ?? item.name,
      path,
      type: 'folder',
      displayName: displayName,
      children: [],
      isEmpty: false,
      fileCount: 0,
    })
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
