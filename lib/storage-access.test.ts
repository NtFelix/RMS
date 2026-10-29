import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { checkStoragePathAccess, resolveChildPath } from './storage-access'

const ORG = 'org-1'
const USER = 'user-1'
const HOUSE_A = 'haus-a'
const HOUSE_B = 'haus-b'

const supabase = {
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG : null, error: null }),
} as unknown as SupabaseClient

function setScope(ids: string[] | null) {
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(ids)
}

beforeEach(() => {
  setScope([HOUSE_A])
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
