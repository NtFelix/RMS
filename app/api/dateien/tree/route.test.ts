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
import { checkPermission } from '@/lib/permissions'
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
  // All module rights by default: the tests of the rights below narrow this down
  ;(checkPermission as jest.Mock).mockResolvedValue('allowed')
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

  it('shows the folders below Rechnungen with the name of their apartment, not the id', async () => {
    tables.Wohnungen = [
      { id: APARTMENT_ID, name: 'Wohnung 1', haus_id: HOUSE_ID },
      { id: ORPHAN_ID, name: 'Wohnung eines anderen Hauses', haus_id: OTHER_HOUSE_ID },
    ]
    mockList.mockResolvedValue({ data: [folder(APARTMENT_ID), folder('Allgemein'), folder(ORPHAN_ID)], error: null })

    const children = await childrenOf(`${HOUSE_PATH}/Rechnungen`)

    expect(children.find((c) => c.path === `${HOUSE_PATH}/Rechnungen/${APARTMENT_ID}`)?.displayName).toBe('Wohnung 1')
    // Folders without an apartment of this house keep their storage name, a foreign apartment name is never used
    expect(children.find((c) => c.path === `${HOUSE_PATH}/Rechnungen/${ORPHAN_ID}`)).toMatchObject({ name: ORPHAN_ID })
    expect(children.find((c) => c.path === `${HOUSE_PATH}/Rechnungen/Allgemein`)).toMatchObject({ name: 'Allgemein' })
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

  describe('module rights below a house (wohnungen:ansehen, mieter:ansehen)', () => {
    const TENANT_PATH = `${APARTMENT_PATH}/${TENANT_ID}`

    /** Grants exactly the listed `modul:aktion` rights */
    function grant(...granted: string[]) {
      ;(checkPermission as jest.Mock).mockImplementation(async (modul: string, aktion: string) => (granted.includes(`${modul}:${aktion}`) ? 'allowed' : 'denied'))
    }

    it('shows apartments and tenants for wohnungen:ansehen + mieter:ansehen', async () => {
      grant('wohnungen:ansehen', 'mieter:ansehen')

      expect((await childrenOf(HOUSE_PATH)).map((c) => c.path)).toContain(APARTMENT_PATH)
      expect((await childrenOf(APARTMENT_PATH)).map((c) => c.path)).toContain(TENANT_PATH)
    })

    it('without wohnungen:ansehen: no apartment folder or name at the house level, Hausdokumente and archive stay', async () => {
      grant('mieter:ansehen')

      const children = await childrenOf(HOUSE_PATH)

      expect(children.map((c) => c.path)).toEqual([`${HOUSE_PATH}/__archive__`, `${HOUSE_PATH}/house_documents`])
      expect(JSON.stringify(children)).not.toContain('Wohnung 1')
      expect(queries.filter((q) => q.table === 'Wohnungen')).toHaveLength(0)
    })

    it('without wohnungen:ansehen: an orphaned apartment id from storage is not listed at the house level either', async () => {
      grant()
      mockList.mockResolvedValue({ data: [folder(APARTMENT_ID), folder(ORPHAN_ID), folder('Eigener Ordner')], error: null })

      const paths = (await childrenOf(HOUSE_PATH)).map((c) => c.path)

      expect(paths).toEqual([`${HOUSE_PATH}/__archive__`, `${HOUSE_PATH}/house_documents`, `${HOUSE_PATH}/Eigener Ordner`])
    })

    it('without wohnungen:ansehen: the apartment folder and everything below it is empty, nothing is queried or listed', async () => {
      grant('mieter:ansehen')

      expect(await childrenOf(APARTMENT_PATH)).toEqual([])
      expect(await childrenOf(`${APARTMENT_PATH}/apartment_documents`)).toEqual([])
      expect(await childrenOf(TENANT_PATH)).toEqual([])
      expect(queries).toHaveLength(0)
      expect(mockList).not.toHaveBeenCalled()
    })

    it('wohnungen:ansehen without mieter:ansehen: apartment documents yes, no tenant folder or name', async () => {
      grant('wohnungen:ansehen')
      mockList.mockResolvedValue({ data: [folder(TENANT_ID), folder('Eigener Ordner')], error: null })

      const children = await childrenOf(APARTMENT_PATH)

      expect(children.map((c) => c.path)).toEqual([`${APARTMENT_PATH}/apartment_documents`, `${APARTMENT_PATH}/Eigener Ordner`])
      expect(JSON.stringify(children)).not.toContain('Mieter Eins')
      expect(queries.filter((q) => q.table === 'Mieter')).toHaveLength(0)
    })

    it('wohnungen:ansehen without mieter:ansehen: the tenant folder itself is empty', async () => {
      grant('wohnungen:ansehen')

      expect(await childrenOf(TENANT_PATH)).toEqual([])
      expect(mockList).not.toHaveBeenCalled()
    })

    it('mieter:ansehen alone does not open the tenant folder (the apartment level needs wohnungen:ansehen)', async () => {
      grant('mieter:ansehen')

      expect(await childrenOf(TENANT_PATH)).toEqual([])
    })

    it('Rechnungen: without wohnungen:ansehen no apartment folder (and no id) is shown, other folders stay', async () => {
      grant()
      mockList.mockResolvedValue({ data: [folder(APARTMENT_ID), folder(ORPHAN_ID), folder('Allgemein')], error: null })

      const children = await childrenOf(`${HOUSE_PATH}/Rechnungen`)

      expect(children.map((c) => c.path)).toEqual([`${HOUSE_PATH}/Rechnungen/Allgemein`])
      expect(queries.filter((q) => q.table === 'Wohnungen')).toHaveLength(0)
    })

    it('Rechnungen: a folder of an apartment is empty without wohnungen:ansehen and listed with it', async () => {
      mockList.mockResolvedValue({ data: [folder('2026')], error: null })
      grant()
      expect(await childrenOf(`${HOUSE_PATH}/Rechnungen/${APARTMENT_ID}`)).toEqual([])
      expect(mockList).not.toHaveBeenCalled()

      grant('wohnungen:ansehen')
      expect((await childrenOf(`${HOUSE_PATH}/Rechnungen/${APARTMENT_ID}`)).map((c) => c.path)).toEqual([`${HOUSE_PATH}/Rechnungen/${APARTMENT_ID}/2026`])
    })

    describe('archive: shared/{house}/__archive__/{timestamp}/{rel...}', () => {
      const ARCHIVE = `${HOUSE_PATH}/__archive__/2026-10-29T10-00-00-000Z`

      it('without wohnungen:ansehen: no apartment id folder below the timestamp, other archived folders stay', async () => {
        grant()
        mockList.mockResolvedValue({ data: [folder(APARTMENT_ID), folder('house_documents'), folder('Rechnungen')], error: null })

        const paths = (await childrenOf(ARCHIVE)).map((c) => c.path)

        expect(paths).toEqual([`${ARCHIVE}/house_documents`, `${ARCHIVE}/Rechnungen`])
      })

      it('with wohnungen:ansehen: the archived apartment folder is listed', async () => {
        grant('wohnungen:ansehen')
        mockList.mockResolvedValue({ data: [folder(APARTMENT_ID)], error: null })

        expect((await childrenOf(ARCHIVE)).map((c) => c.path)).toEqual([`${ARCHIVE}/${APARTMENT_ID}`])
      })

      it('without wohnungen:ansehen: no apartment id folder below archived Rechnungen (level 7)', async () => {
        grant()
        mockList.mockResolvedValue({ data: [folder(APARTMENT_ID), folder('Allgemein')], error: null })

        expect((await childrenOf(`${ARCHIVE}/Rechnungen`)).map((c) => c.path)).toEqual([`${ARCHIVE}/Rechnungen/Allgemein`])
      })

      it('the archived apartment folder is empty without wohnungen:ansehen, its tenant folder needs mieter:ansehen too', async () => {
        mockList.mockResolvedValue({ data: [folder(TENANT_ID), folder('apartment_documents')], error: null })

        grant()
        expect(await childrenOf(`${ARCHIVE}/${APARTMENT_ID}`)).toEqual([])
        expect(mockList).not.toHaveBeenCalled()

        grant('wohnungen:ansehen')
        expect((await childrenOf(`${ARCHIVE}/${APARTMENT_ID}`)).map((c) => c.path)).toEqual([`${ARCHIVE}/${APARTMENT_ID}/apartment_documents`])
        expect(await childrenOf(`${ARCHIVE}/${APARTMENT_ID}/${TENANT_ID}`)).toEqual([])

        grant('wohnungen:ansehen', 'mieter:ansehen')
        expect((await childrenOf(`${ARCHIVE}/${APARTMENT_ID}`)).map((c) => c.path)).toEqual([
          `${ARCHIVE}/${APARTMENT_ID}/${TENANT_ID}`,
          `${ARCHIVE}/${APARTMENT_ID}/apartment_documents`,
        ])
      })

      it('the archive itself and its timestamp folders need no module right', async () => {
        grant()
        mockList.mockResolvedValue({ data: [folder('2026-10-29T10-00-00-000Z')], error: null })

        expect((await childrenOf(`${HOUSE_PATH}/__archive__`)).map((c) => c.path)).toEqual([ARCHIVE])
        expect(checkPermission).not.toHaveBeenCalled()
      })
    })

    describe('every spelling of an id counts as apartment/tenant folder (as in the database rule)', () => {
      const LETTERS_ID = 'abcdefab-cdef-4abc-8def-abcdefabcdef'
      const UPPER = LETTERS_ID.toUpperCase()
      const NO_HYPHENS = LETTERS_ID.replace(/-/g, '')
      const BRACED = `{${LETTERS_ID}}`

      it('hides them below Rechnungen and at the house level without wohnungen:ansehen', async () => {
        grant()
        mockList.mockResolvedValue({ data: [folder(UPPER), folder(NO_HYPHENS), folder(BRACED), folder('Allgemein')], error: null })

        expect((await childrenOf(`${HOUSE_PATH}/Rechnungen`)).map((c) => c.name)).toEqual(['Allgemein'])
        expect((await childrenOf(HOUSE_PATH)).map((c) => c.name)).toEqual(['Archiv', 'house_documents', 'Allgemein'])
      })

      it('opens none of them without wohnungen:ansehen', async () => {
        grant()
        for (const id of [UPPER, NO_HYPHENS, BRACED]) {
          expect(await childrenOf(`${HOUSE_PATH}/${id}`)).toEqual([])
        }
        expect(mockList).not.toHaveBeenCalled()
      })
    })

    describe('Rechnungen: the filter hides exactly what is classified as apartment folder', () => {
      it('keeps own folders that only look similar to an id', async () => {
        grant()
        mockList.mockResolvedValue({
          data: [folder('66666666-6666-4666-8666-66666666666'), folder('Rechnungen 2026'), folder('66666666-6666-4666-8666-666666666666-alt'), folder(APARTMENT_ID)],
          error: null,
        })

        const names = (await childrenOf(`${HOUSE_PATH}/Rechnungen`)).map((c) => c.name)

        expect(names.sort()).toEqual(['66666666-6666-4666-8666-66666666666', '66666666-6666-4666-8666-666666666666-alt', 'Rechnungen 2026'])
      })

      it('shows all of them with wohnungen:ansehen', async () => {
        grant('wohnungen:ansehen')
        const upper = 'abcdefab-cdef-4abc-8def-abcdefabcdef'.toUpperCase()
        mockList.mockResolvedValue({ data: [folder(upper), folder('Allgemein')], error: null })

        expect((await childrenOf(`${HOUSE_PATH}/Rechnungen`)).map((c) => c.name).sort()).toEqual([upper, 'Allgemein'].sort())
      })
    })

    it('the house scope stays as it is: houses and the private area do not ask for module rights', async () => {
      grant()

      expect((await childrenOf(`org_${ORG_ID}/shared`)).map((c) => c.path)).toEqual([HOUSE_PATH])
      expect(await childrenOf(`org_${ORG_ID}/shared/${OTHER_HOUSE_ID}`)).toEqual([])
      expect((await childrenOf(`org_${ORG_ID}/private/${USER_ID}`)).map((c) => c.path)).toContain(`org_${ORG_ID}/private/${USER_ID}/__archive__`)
      expect(checkPermission).not.toHaveBeenCalled()
    })

    describe('the permission check itself fails (not "right missing")', () => {
      /** wohnungen:ansehen cannot be decided, everything else is granted */
      function failWohnungenCheck() {
        ;(checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'wohnungen' ? 'error' : 'allowed'))
      }

      async function expectCheckFailed(path: string) {
        jest.spyOn(console, 'error').mockImplementation()
        const response = await GET(request(path))
        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' })
      }

      afterEach(() => {
        jest.restoreAllMocks()
      })

      it('house level: 503 instead of a silently empty apartment list, nothing is queried or listed', async () => {
        failWohnungenCheck()

        await expectCheckFailed(HOUSE_PATH)

        expect(queries.map((q) => q.table)).not.toContain('Wohnungen')
        expect(mockList).not.toHaveBeenCalled()
      })

      it('apartment level: 503 instead of an empty list', async () => {
        failWohnungenCheck()

        await expectCheckFailed(APARTMENT_PATH)
      })

      it('mieter:ansehen failing: 503 at the tenant folder, the apartment level (wohnungen only) still works', async () => {
        ;(checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? 'error' : 'allowed'))

        await expectCheckFailed(`${APARTMENT_PATH}/${TENANT_ID}`)
        expect((await childrenOf(HOUSE_PATH)).map((c) => c.path)).toContain(APARTMENT_PATH)
      })

      it('filtered listing (Rechnungen): 503 instead of a list without apartment folders', async () => {
        failWohnungenCheck()

        await expectCheckFailed(`${HOUSE_PATH}/Rechnungen`)
      })

      it('"denied" stays an empty answer with status 200 (no change for a missing right)', async () => {
        grant('mieter:ansehen')

        expect(await childrenOf(APARTMENT_PATH)).toEqual([])
      })

      it('paths that need no module right are not affected by a failing check', async () => {
        ;(checkPermission as jest.Mock).mockResolvedValue('error')

        expect((await childrenOf(`org_${ORG_ID}/shared`)).map((c) => c.path)).toEqual([HOUSE_PATH])
        const response = await GET({ url: 'http://localhost/api/dateien/tree' } as unknown as NextRequest)
        expect(response.status).toBe(200)
      })
    })

    it('reads each right at most once per request', async () => {
      grant('wohnungen:ansehen', 'mieter:ansehen')

      await childrenOf(APARTMENT_PATH)

      expect(checkPermission).toHaveBeenCalledTimes(2)
    })
  })
})
