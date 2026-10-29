import { storagePathFromUrl, storageUrlFor } from '@/lib/storage-navigation'
import { orgRoot, sharedPath } from '@/lib/storage-paths'

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const HOUSE_ID = '22222222-2222-4222-8222-222222222222'

describe('storageUrlFor / storagePathFromUrl', () => {
  it('maps the org root to /dateien and back', () => {
    const root = orgRoot(ORG_ID)
    expect(storageUrlFor(root)).toBe('/dateien')
    expect(storagePathFromUrl(root, '')).toBe(root)
  })

  it('maps a path below the org root to its URL and back', () => {
    const root = orgRoot(ORG_ID)
    const path = sharedPath(ORG_ID, HOUSE_ID, 'house_documents')
    const url = storageUrlFor(path)
    expect(url).toBe(`/dateien/shared/${HOUSE_ID}/house_documents`)
    expect(storagePathFromUrl(root, url.replace(/^\/dateien\//, ''))).toBe(path)
  })

  it('falls back to /dateien for paths without a valid org layout', () => {
    expect(storageUrlFor('')).toBe('/dateien')
    expect(storageUrlFor('unknown/path')).toBe('/dateien')
  })
})
