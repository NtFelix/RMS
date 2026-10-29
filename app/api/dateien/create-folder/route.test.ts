/**
 * @jest-environment node
 */

/**
 * Tests of POST /api/dateien/create-folder: the access check runs on the TARGET path (parent + validated name),
 * writes into zone roots and archives are refused, the storage call gets exactly the checked path.
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

const mockList = jest.fn()
const mockUpload = jest.fn()
const mockRemove = jest.fn()
const mockInsert = jest.fn()

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG_ID : null, error: null }),
  storage: { from: () => ({ list: mockList, upload: mockUpload, remove: mockRemove }) },
  from: () => ({ insert: mockInsert }),
}

function request(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  mockList.mockResolvedValue({ data: [], error: null })
  mockUpload.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ error: null })
})

describe('POST /api/dateien/create-folder', () => {
  it('creates the folder with a .keep file at the checked target path', async () => {
    const response = await POST(request({ folderPath: PARENT, folderName: 'Vertraege' }))

    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledWith(`${PARENT}/Vertraege/.keep`, expect.anything(), expect.anything())
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ dateipfad: `${PARENT}/Vertraege`, dateiname: '.keep' }))
    expect((await response.json()).folderPath).toBe(`${PARENT}/Vertraege`)
  })

  it.each([
    ['traversal name', '..'],
    ['name with separator', 'a/b'],
    ['name with traversal and separator', '../x'],
  ])('rejects a %s with 400 and writes nothing', async (_label, folderName) => {
    const response = await POST(request({ folderPath: PARENT, folderName }))

    expect(response.status).toBe(400)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it.each([
    ['the shared root', `org_${ORG_ID}/shared`],
    ['the private root', `org_${ORG_ID}/private`],
    ['the org root', `org_${ORG_ID}`],
    ['a house outside the scope', `org_${ORG_ID}/shared/${OTHER_HOUSE_ID}/house_documents`],
    ['an archive folder', `org_${ORG_ID}/shared/${HOUSE_ID}/__archive__/2026-10-29T10-00-00-000Z`],
    ['the private folder of another user', `org_${ORG_ID}/private/other-user`],
    ['a legacy path', `user_${USER_ID}/haus`],
    ['a traversal parent', `org_${ORG_ID}/shared/${HOUSE_ID}/../${OTHER_HOUSE_ID}`],
  ])('refuses writing into %s with 403', async (_label, folderPath) => {
    const response = await POST(request({ folderPath, folderName: 'Notiz' }))

    expect(response.status).toBe(403)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('allows the own private folder', async () => {
    const parent = `org_${ORG_ID}/private/${USER_ID}`
    const response = await POST(request({ folderPath: parent, folderName: 'Notiz' }))

    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledWith(`${parent}/Notiz/.keep`, expect.anything(), expect.anything())
  })
})
