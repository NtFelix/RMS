/**
 * @jest-environment node
 */

/**
 * Tests of POST /api/dateien/update-file: the access check runs on the TARGET path (parent + validated name),
 * writes into zone roots and archives are refused, upload and metadata use exactly the checked path.
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

const mockUpload = jest.fn()
const mockRemove = jest.fn()
const mockUpdate = jest.fn()

/** Metadata table: update(...).eq(...).eq(...) resolves to the update result */
function metadataChain() {
  const chain: Record<string, unknown> = {}
  chain.update = jest.fn((values: unknown) => {
    mockUpdate(values)
    return chain
  })
  chain.eq = jest.fn(() => chain)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve)
  return chain
}

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG_ID : null, error: null }),
  storage: { from: () => ({ upload: mockUpload, remove: mockRemove }) },
  from: () => metadataChain(),
}

function request(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  mockUpload.mockResolvedValue({ error: null })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('POST /api/dateien/update-file', () => {
  it('writes the checked target path and updates the metadata of parent and name', async () => {
    const response = await POST(request({ filePath: PARENT, fileName: 'Notiz.md', content: 'neu' }))

    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledWith(`${PARENT}/Notiz.md`, expect.anything(), expect.objectContaining({ upsert: true }))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ mime_type: 'text/markdown' }))
  })

  it('allows ".." inside a file name', async () => {
    const response = await POST(request({ filePath: PARENT, fileName: 'Vertrag..md', content: 'x' }))

    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledWith(`${PARENT}/Vertrag..md`, expect.anything(), expect.anything())
  })

  it('does not normalise the path any more: a parent with a double slash is refused', async () => {
    const response = await POST(request({ filePath: `${PARENT}//x`, fileName: 'Notiz.md', content: 'x' }))

    expect(response.status).toBe(403)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it.each([
    ['traversal name', '..'],
    ['name with traversal and separator', '../x.md'],
    ['name with separator', 'a/b.md'],
  ])('rejects a %s with 400 and writes nothing', async (_label, fileName) => {
    const response = await POST(request({ filePath: PARENT, fileName, content: 'x' }))

    expect(response.status).toBe(400)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockRemove).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['the shared root', `org_${ORG_ID}/shared`],
    ['the private root', `org_${ORG_ID}/private`],
    ['the org root', `org_${ORG_ID}`],
    ['a house outside the scope', `org_${ORG_ID}/shared/${OTHER_HOUSE_ID}/house_documents`],
    ['an archive folder', `org_${ORG_ID}/shared/${HOUSE_ID}/__archive__/2026-10-29T10-00-00-000Z`],
    ['the private folder of another user', `org_${ORG_ID}/private/other-user`],
    ['a legacy path', `user_${USER_ID}/haus`],
  ])('refuses writing into %s with 403', async (_label, filePath) => {
    const response = await POST(request({ filePath, fileName: 'Notiz.md', content: 'x' }))

    expect(response.status).toBe(403)
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
