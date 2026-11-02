/**
 * @jest-environment node
 */

/**
 * GET /api/files/contents: a refusal of the database (get_folder_contents) reaches the client as one German text,
 * without raw database text. Supabase is a mock, ids are synthetic.
 */

import type { NextRequest } from 'next/server'
import { getAccessibleHaeuserIds } from '@/lib/object-scope'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { FOLDER_NOT_AVAILABLE_MESSAGE } from '@/lib/storage-messages'
import { GET } from './route'

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }))
jest.mock('@/app/(dashboard)/dateien/actions', () => ({ logRpcCall: jest.fn() }))

const ORG_ID = '44444444-4444-4444-8444-444444444444'
const USER_ID = '77777777-7777-4777-8777-777777777777'
const HOUSE_ID = '55555555-5555-4555-8555-555555555555'
const APARTMENT_PATH = `org_${ORG_ID}/shared/${HOUSE_ID}/66666666-6666-4666-8666-666666666666`

let folderRpc: { data: unknown; error: unknown }

const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
  rpc: async (name: string) => (name === 'current_organisation_id' ? { data: ORG_ID, error: null } : folderRpc),
}

const request = (path: string) => ({ url: `http://localhost/api/files/contents?path=${encodeURIComponent(path)}` }) as unknown as NextRequest

describe('GET /api/files/contents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)
    ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([HOUSE_ID])
  })

  it('maps the English refusal of the database to the German folder message', async () => {
    folderRpc = { data: { error: 'Invalid path: house not accessible', files: [], folders: [], breadcrumbs: [], totalSize: 0 }, error: null }

    const response = await GET(request(APARTMENT_PATH))
    const body = await response.json()

    expect(body.error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE)
    expect(body.files).toEqual([])
    expect(body.folders).toEqual([])
  })

  it('maps a permission error of the RPC call to 403 with the same text and no raw database message', async () => {
    folderRpc = { data: null, error: { code: '42501', message: 'permission denied for function get_folder_contents' } }

    const response = await GET(request(APARTMENT_PATH))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE)
    expect(JSON.stringify(body)).not.toMatch(/get_folder_contents/)
  })

  it('answers a path outside the house scope with the same text', async () => {
    ;(getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([])
    folderRpc = { data: null, error: null }

    const response = await GET(request(APARTMENT_PATH))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe(FOLDER_NOT_AVAILABLE_MESSAGE)
  })

  it('keeps a technical RPC failure as a 500', async () => {
    folderRpc = { data: null, error: { code: 'XX000', message: 'connection reset' } }

    const response = await GET(request(APARTMENT_PATH))

    expect(response.status).toBe(500)
  })
})
