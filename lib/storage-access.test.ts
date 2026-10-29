import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { checkStoragePathAccess, resolveChildPath } from './storage-access'

const ORG = 'org-1'
const USER = 'user-1'
const HOUSE_A = 'haus-a'
const HOUSE_B = 'haus-b'

/** Houses of the active organisation (RLS makes the Haeuser lookup see only these); `null` = the lookup fails */
let existingHouses: string[] | null
const mockHouseLookups: string[] = []

const supabase = {
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG : null, error: null }),
  from: (table: string) => {
    const chain: Record<string, unknown> = {}
    let houseId = ''
    chain.select = () => chain
    chain.eq = (_column: string, value: string) => {
      houseId = value
      return chain
    }
    chain.maybeSingle = async () => {
      mockHouseLookups.push(`${table}:${houseId}`)
      if (existingHouses === null) return { data: null, error: { message: 'invalid input syntax for type uuid' } }
      return { data: existingHouses.includes(houseId) ? { id: houseId } : null, error: null }
    }
    return chain
  },
} as unknown as SupabaseClient

function setScope(ids: string[] | null) {
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(ids)
}

beforeEach(() => {
  setScope([HOUSE_A])
  existingHouses = [HOUSE_A, HOUSE_B]
  mockHouseLookups.length = 0
})

describe('checkStoragePathAccess', () => {
  it('reads the zone roots for a user with house scope (default mode)', async () => {
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}`)).toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared`)).toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/private`)).toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_B}`)).not.toBeNull()
  })

  it('never writes at the roots, but in houses of the scope and the own private folder', async () => {
    const write = { mode: 'write' as const }
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}`, write)).not.toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared`, write)).not.toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/private`, write)).not.toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_A}/x.pdf`, write)).toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_B}/x.pdf`, write)).not.toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/private/${USER}/x.md`, write)).toBeNull()
  })

  describe('house of a shared write path must exist in the organisation', () => {
    const write = { mode: 'write' as const }
    const INVENTED = 'haus-erfunden'

    it('refuses writing below an invented house id even for a user without house restriction', async () => {
      setScope(null)
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${INVENTED}/x.pdf`, write)).toBe('Invalid path')
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${INVENTED}`, write)).toBe('Invalid path')
      expect(mockHouseLookups).toEqual([`Haeuser:${INVENTED}`, `Haeuser:${INVENTED}`])
    })

    it('allows writing below an existing house for a user without house restriction (one lookup)', async () => {
      setScope(null)
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_B}/Ordner/x.pdf`, write)).toBeNull()
      expect(mockHouseLookups).toEqual([`Haeuser:${HOUSE_B}`])
    })

    it('fails closed if the lookup errors', async () => {
      setScope(null)
      existingHouses = null
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_A}/x.pdf`, write)).toBe('Invalid path')
    })

    it('leaves reading unchanged: no lookup, browsing stays a matter of scope and RPC', async () => {
      setScope(null)
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${INVENTED}/x.pdf`)).toBeNull()
      expect(mockHouseLookups).toEqual([])
    })

    it('does not look up houses for private paths, roots or refused paths', async () => {
      setScope(null)
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/private/${USER}/x.md`, write)).toBeNull()
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared`, write)).not.toBeNull()
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_A}/__archive__/2026-10-29T10-00-00-000Z/x.pdf`, write)).not.toBeNull()
      expect(mockHouseLookups).toEqual([])
    })

    it('a house outside the scope is refused by the scope check before any lookup', async () => {
      setScope([HOUSE_A])
      expect(await checkStoragePathAccess(supabase, USER, `org_${ORG}/shared/${HOUSE_B}/x.pdf`, write)).not.toBeNull()
      expect(mockHouseLookups).toEqual([])
    })
  })

  it('refuses writing into an archive, but allows reading it', async () => {
    const archive = `org_${ORG}/shared/${HOUSE_A}/__archive__/2026-10-29T10-00-00-000Z/x.pdf`
    expect(await checkStoragePathAccess(supabase, USER, archive, { mode: 'write' })).not.toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, archive)).toBeNull()
  })

  it('has no legacy exception for writing', async () => {
    const legacy = `user_${USER}/haus/x.pdf`
    expect(await checkStoragePathAccess(supabase, USER, legacy, { allowLegacyOwnRead: true })).toBeNull()
    expect(await checkStoragePathAccess(supabase, USER, legacy, { mode: 'write' })).not.toBeNull()
  })

  it('fails closed without an active organisation', async () => {
    const noOrg = { rpc: async () => ({ data: null, error: null }) } as unknown as SupabaseClient
    expect(await checkStoragePathAccess(noOrg, USER, `org_${ORG}`)).toBe('Keine aktive Organisation')
  })
})

describe('resolveChildPath', () => {
  const parent = `org_${ORG}/shared/${HOUSE_A}/house_documents`

  it('returns the target path for a safe name and a writable parent', async () => {
    expect(await resolveChildPath(supabase, USER, parent, 'Vertrag..pdf', { mode: 'write' })).toEqual({
      path: `${parent}/Vertrag..pdf`,
    })
  })

  it.each(['..', '.', '', 'a/b', '../x'])('answers 400 for the name %j', async (name) => {
    expect(await resolveChildPath(supabase, USER, parent, name, { mode: 'write' })).toEqual({ error: 'Invalid name', status: 400 })
  })

  it('answers 403 for a bad, foreign or not writable parent', async () => {
    for (const bad of [
      `org_${ORG}/shared/${HOUSE_A}/../${HOUSE_B}`,
      `org_${ORG}/shared/${HOUSE_B}/x`,
      `org_${ORG}/shared`,
      `org_${ORG}`,
      `org_${ORG}/shared/${HOUSE_A}/__archive__/2026-10-29T10-00-00-000Z`,
    ]) {
      expect(await resolveChildPath(supabase, USER, bad, 'a.md', { mode: 'write' })).toMatchObject({ status: 403 })
    }
  })

  it('checks the target for reading, including the legacy exception', async () => {
    expect(await resolveChildPath(supabase, USER, `user_${USER}/haus`, 'a.md', { allowLegacyOwnRead: true })).toEqual({
      path: `user_${USER}/haus/a.md`,
    })
    expect(await resolveChildPath(supabase, USER, `user_other/haus`, 'a.md', { allowLegacyOwnRead: true })).toMatchObject({ status: 403 })
  })
})
