/**
 * @jest-environment node
 */

/**
 * Tests of POST /api/dateien/rename: source AND target path are checked for writing, the target is built from the
 * validated new name only, storage move and metadata use exactly the checked target.
 * Supabase is a mock; ids and names are synthetic.
 */

import type { NextRequest } from 'next/server'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { POST } from './route'

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }))

const ORG_ID = '44444444-4444-4444-8444-444444444444'
const USER_ID = '77777777-7777-4777-8777-777777777777'
const HOUSE_ID = '55555555-5555-4555-8555-555555555555'
const OTHER_HOUSE_ID = '55555555-5555-4555-8555-000000000000'
const PARENT = `org_${ORG_ID}/shared/${HOUSE_ID}/house_documents`

const mockMove = jest.fn()
const mockCopy = jest.fn()
const mockRemove = jest.fn()
const mockUpdate = jest.fn()
const SOURCE = `${PARENT}/Alt.md`

/** Metadata table: select/eq/ilike chain, single() finds the file, update(...) resolves to the update result */
function metadataChain() {
  const chain: Record<string, unknown> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.ilike = jest.fn(async () => ({ data: [], error: null }))
  chain.single = jest.fn(async () => ({ data: { dateiname: 'Alt.md' }, error: null }))
  chain.update = jest.fn((values: unknown) => {
    mockUpdate(values)
    return chain
  })
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve)
  return chain
}

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG_ID : null, error: null }),
  storage: { from: () => ({ move: mockMove, copy: mockCopy, remove: mockRemove }) },
  from: () => metadataChain(),
}

function request(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  mockMove.mockResolvedValue({ error: null })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('POST /api/dateien/rename', () => {
  it('moves from the checked source to the checked target and stores the new name', async () => {
    const response = await POST(request({ filePath: SOURCE, newName: 'Neu.md' }))

    expect(response.status).toBe(200)
    expect(mockMove).toHaveBeenCalledWith(SOURCE, `${PARENT}/Neu.md`)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ dateipfad: PARENT, dateiname: 'Neu.md' }))
  })

  it('allows ".." inside the new name', async () => {
    const response = await POST(request({ filePath: SOURCE, newName: 'Vertrag..pdf' }))

    expect(response.status).toBe(200)
    expect(mockMove).toHaveBeenCalledWith(SOURCE, `${PARENT}/Vertrag..pdf`)
  })

  it.each([
    ['traversal name', '..'],
    ['name with traversal and separator', '../x.md'],
    ['name that would leave the folder', '../../Neu.md'],
    ['name with separator', 'a/b.md'],
  ])('rejects a %s with 400 and moves nothing', async (_label, newName) => {
    const response = await POST(request({ filePath: SOURCE, newName }))

    expect(response.status).toBe(400)
    expect(mockMove).not.toHaveBeenCalled()
    expect(mockCopy).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['a source in a house outside the scope', `org_${ORG_ID}/shared/${OTHER_HOUSE_ID}/house_documents/Alt.md`],
    ['a source in the private folder of another user', `org_${ORG_ID}/private/other-user/Alt.md`],
    ['a source in an archive', `org_${ORG_ID}/shared/${HOUSE_ID}/__archive__/2026-10-29T10-00-00-000Z/Alt.md`],
    ['a source at a zone root', `org_${ORG_ID}/shared`],
    ['a legacy source', `user_${USER_ID}/haus/Alt.md`],
  ])('refuses %s with 403', async (_label, filePath) => {
    const response = await POST(request({ filePath, newName: 'Neu.md' }))

    expect(response.status).toBe(403)
    expect(mockMove).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuses a target that is not writable (a house folder name below the shared root)', async () => {
    const response = await POST(request({ filePath: `org_${ORG_ID}/shared/${HOUSE_ID}`, newName: OTHER_HOUSE_ID }))

    expect(response.status).toBe(403)
    expect(mockMove).not.toHaveBeenCalled()
  })
})
