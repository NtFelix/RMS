/**
 * @jest-environment node
 */

/**
 * Tests of GET /api/dateien/tree: houses, apartments and tenants come from the database, Hausdokumente and
 * Wohnungsdokumente are always present, the storage listing only adds custom folders (paged), and only UUID segments
 * are treated as apartment/tenant. Supabase is a mock; ids and names are synthetic.
 */

import type { NextRequest } from 'next/server'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { GET } from './route'

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }))

const ORG_ID = '44444444-4444-4444-8444-444444444444'
const USER_ID = '77777777-7777-4777-8777-777777777777'
const HOUSE_ID = '55555555-5555-4555-8555-555555555555'
const OTHER_HOUSE_ID = '55555555-5555-4555-8555-000000000000'
const APARTMENT_ID = '66666666-6666-4666-8666-666666666666'
const TENANT_ID = '11111111-1111-4111-8111-111111111111'
const ORPHAN_ID = '99999999-9999-4999-8999-999999999999'
const HOUSE_PATH = `org_${ORG_ID}/shared/${HOUSE_ID}`
const APARTMENT_PATH = `${HOUSE_PATH}/${APARTMENT_ID}`

const mockList = jest.fn()
/** Queries per table: [table, filters] */
const queries: Array<{ table: string; eq: Record<string, unknown> }> = []
let tables: Record<string, unknown[]>

/** Query builder: select/eq/in chain, awaited or maybeSingle() resolves to the table rows */
function queryChain(table: string) {
  const query = { table, eq: {} as Record<string, unknown> }
  queries.push(query)
  const chain: Record<string, unknown> = {}
  const rows = () => (tables[table] ?? []).filter((row) => Object.entries(query.eq).every(([column, value]) => (row as Record<string, unknown>)[column] === value))
  chain.select = () => chain
  chain.in = () => chain
  chain.eq = (column: string, value: unknown) => {
    query.eq[column] = value
    return chain
  }
  chain.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null })
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(resolve)
  return chain
}

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG_ID : null, error: null }),
  storage: { from: () => ({ list: mockList }) },
  from: (table: string) => queryChain(table),
}

function request(path: string): NextRequest {
  const url = `http://localhost/api/dateien/tree?path=${encodeURIComponent(path)}`
  return { url } as unknown as NextRequest
}

async function childrenOf(path: string): Promise<Array<{ path: string; name: string; displayName?: string }>> {
  const response = await GET(request(path))
  expect(response.status).toBe(200)
  return (await response.json()).children
}

const folder = (name: string) => ({ name, id: null, metadata: null })
const file = (name: string) => ({ name, id: 'x', metadata: { size: 1 } })

beforeEach(() => {
  jest.clearAllMocks()
  queries.length = 0
  tables = {
    Haeuser: [{ id: HOUSE_ID, name: 'Haus Eins' }],
    Wohnungen: [{ id: APARTMENT_ID, name: 'Wohnung 1', haus_id: HOUSE_ID }],
    Mieter: [{ id: TENANT_ID, name: 'Mieter Eins', wohnung_id: APARTMENT_ID }],
  }
  ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  mockList.mockResolvedValue({ data: [], error: null })
})

describe('GET /api/dateien/tree', () => {
  it('shows archive, Hausdokumente and the apartments of the house although storage is empty', async () => {
    const children = await childrenOf(HOUSE_PATH)

    expect(children.map((c) => c.path)).toEqual([
      `${HOUSE_PATH}/__archive__`,
      `${HOUSE_PATH}/house_documents`,
      APARTMENT_PATH,
    ])
    expect(children.find((c) => c.path === `${HOUSE_PATH}/house_documents`)?.displayName).toBe('Hausdokumente')
    expect(children.find((c) => c.path === APARTMENT_PATH)?.displayName).toBe('Wohnung 1')
  })

  it('adds only custom folders from storage at the house level, not files, known ids or orphaned UUID folders', async () => {
    mockList.mockResolvedValue({
      data: [folder('house_documents'), folder(APARTMENT_ID), folder(ORPHAN_ID), folder('__archive__'), folder('Eigener Ordner'), file('x.pdf'), folder('.keep')],
      error: null,
    })

    const paths = (await childrenOf(HOUSE_PATH)).map((c) => c.path)

    expect(paths).toEqual([
      `${HOUSE_PATH}/__archive__`,
      `${HOUSE_PATH}/house_documents`,
      `${HOUSE_PATH}/Eigener Ordner`,
      APARTMENT_PATH,
    ])
  })

  it('shows Wohnungsdokumente and the tenants of the apartment although storage is empty', async () => {
    const children = await childrenOf(APARTMENT_PATH)

    expect(children.map((c) => c.path)).toEqual([`${APARTMENT_PATH}/apartment_documents`, `${APARTMENT_PATH}/${TENANT_ID}`])
    expect(children[0].displayName).toBe('Wohnungsdokumente')
    expect(children[1].displayName).toBe('Mieter Eins')
  })

  it('does not treat __archive__ and system folders as apartment: no tenant query, generic storage listing', async () => {
    mockList.mockResolvedValue({ data: [folder('2026-10-29T10-00-00-000Z')], error: null })

    const archive = await childrenOf(`${HOUSE_PATH}/__archive__`)
    expect(archive.map((c) => c.path)).toEqual([`${HOUSE_PATH}/__archive__/2026-10-29T10-00-00-000Z`])

    await childrenOf(`${HOUSE_PATH}/house_documents`)
    await childrenOf(`${HOUSE_PATH}/Eigener Ordner`)

    expect(queries.filter((q) => q.table === 'Mieter')).toHaveLength(0)
    expect(queries.filter((q) => q.table === 'Wohnungen')).toHaveLength(0)
  })

  it('returns nothing for an apartment UUID that does not belong to the house', async () => {
    tables.Wohnungen = [{ id: APARTMENT_ID, name: 'Wohnung 1', haus_id: OTHER_HOUSE_ID }]

    expect(await childrenOf(APARTMENT_PATH)).toEqual([])
    expect(queries.filter((q) => q.table === 'Mieter')).toHaveLength(0)
  })

  it('reads storage folders page by page instead of cutting at 1000 entries', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => folder(`Ordner ${String(index).padStart(4, '0')}`))
    mockList
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [folder('Ordner 1000')], error: null })

    const children = await childrenOf(HOUSE_PATH)

    expect(mockList).toHaveBeenCalledTimes(2)
    expect(mockList).toHaveBeenNthCalledWith(2, HOUSE_PATH, expect.objectContaining({ limit: 1000, offset: 1000 }))
    expect(children.filter((c) => c.path.includes('/Ordner '))).toHaveLength(1001)
  })

  it('returns nothing for a house outside the scope', async () => {
    expect(await childrenOf(`org_${ORG_ID}/shared/${OTHER_HOUSE_ID}`)).toEqual([])
  })

  it('lists the houses at the shared root for a user with house scope', async () => {
    const children = await childrenOf(`org_${ORG_ID}/shared`)

    expect(children.map((c) => c.path)).toEqual([HOUSE_PATH])
  })

  it('lists only the own folder at the private root, never the folders (user ids) of other members', async () => {
    // A storage listing of `private` would show the folders of all members: it must not be read at all
    mockList.mockResolvedValue({ data: [folder(USER_ID), folder('88888888-8888-4888-8888-888888888888')] })

    const children = await childrenOf(`org_${ORG_ID}/private`)

    expect(children).toEqual([
      expect.objectContaining({ path: `org_${ORG_ID}/private/${USER_ID}`, name: 'Meine Dateien', displayName: 'Meine Dateien' }),
    ])
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns nothing for the private folder of another user', async () => {
    expect(await childrenOf(`org_${ORG_ID}/private/88888888-8888-4888-8888-888888888888`)).toEqual([])
    expect(mockList).not.toHaveBeenCalled()
  })

  it('lists the own private folder from storage, with the archive node first', async () => {
    mockList.mockResolvedValue({ data: [folder('Notizen'), file('a.md')] })

    const children = await childrenOf(`org_${ORG_ID}/private/${USER_ID}`)

    expect(children.map((c) => c.name)).toEqual(['Archiv', 'Notizen'])
  })

  it('takes the user from the session and ignores a userId query parameter', async () => {
    const url = `http://localhost/api/dateien/tree?userId=88888888-8888-4888-8888-888888888888&path=${encodeURIComponent(`org_${ORG_ID}/private`)}`
    const response = await GET({ url } as unknown as NextRequest)

    expect(response.status).toBe(200)
    expect((await response.json()).children.map((c: { path: string }) => c.path)).toEqual([`org_${ORG_ID}/private/${USER_ID}`])
  })

  it('answers the root tree without any parameter', async () => {
    const response = await GET({ url: 'http://localhost/api/dateien/tree' } as unknown as NextRequest)

    expect(response.status).toBe(200)
    const { tree } = await response.json()
    expect(tree[0].children.map((c: { path: string }) => c.path)).toEqual([`org_${ORG_ID}/shared`, `org_${ORG_ID}/private/${USER_ID}`])
  })
})
