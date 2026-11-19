/**
 * @jest-environment node
 */

/**
 * Tests of POST /api/dateien/read-file: the access check runs on the TARGET path (parent + validated name), the download
 * uses exactly the checked path. Reading stays allowed for the own legacy path (transition).
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

const mockDownload = jest.fn()

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'current_organisation_id' ? ORG_ID : null, error: null }),
  storage: { from: () => ({ download: mockDownload }) },
}

function request(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
  ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  mockDownload.mockResolvedValue({ data: { text: async () => 'Inhalt' }, error: null })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('POST /api/dateien/read-file', () => {
  it('downloads the checked target path', async () => {
    const response = await POST(request({ filePath: PARENT, fileName: 'Notiz.md' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ content: 'Inhalt' })
    expect(mockDownload).toHaveBeenCalledWith(`${PARENT}/Notiz.md`)
  })

  it('allows ".." inside a file name', async () => {
    const response = await POST(request({ filePath: PARENT, fileName: 'Vertrag..md' }))

    expect(response.status).toBe(200)
    expect(mockDownload).toHaveBeenCalledWith(`${PARENT}/Vertrag..md`)
  })

  it('still reads below the archive and from the own legacy path', async () => {
    const archive = `org_${ORG_ID}/shared/${HOUSE_ID}/__archive__/2026-10-29T10-00-00-000Z`
    expect((await POST(request({ filePath: archive, fileName: 'alt.md' }))).status).toBe(200)
    expect((await POST(request({ filePath: `user_${USER_ID}/haus`, fileName: 'alt.md' }))).status).toBe(200)
    expect((await POST(request({ filePath: `user_other-user/haus`, fileName: 'alt.md' }))).status).toBe(403)
  })

  it.each([
    ['traversal name', '..'],
    ['name with traversal and separator', '../x.md'],
    ['name with separator', 'a/b.md'],
  ])('rejects a %s with 400 and downloads nothing', async (_label, fileName) => {
    const response = await POST(request({ filePath: PARENT, fileName }))

    expect(response.status).toBe(400)
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it.each([
    ['a house outside the scope', `org_${ORG_ID}/shared/${OTHER_HOUSE_ID}/house_documents`],
    ['the private folder of another user', `org_${ORG_ID}/private/other-user`],
    ['another organisation', `org_other-org/shared/${HOUSE_ID}`],
  ])('refuses reading from %s with 403', async (_label, filePath) => {
    const response = await POST(request({ filePath, fileName: 'Notiz.md' }))

    expect(response.status).toBe(403)
    expect(mockDownload).not.toHaveBeenCalled()
  })
})
