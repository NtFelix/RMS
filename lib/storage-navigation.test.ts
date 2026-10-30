import { buildFallbackBreadcrumbs, storagePathFromUrl, storageUrlFor } from '@/lib/storage-navigation'
import { orgRoot, sharedPath } from '@/lib/storage-paths'

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const HOUSE_ID = '22222222-2222-4222-8222-222222222222'
const APARTMENT_ID = '33333333-3333-4333-8333-333333333333'
const TENANT_ID = '44444444-4444-4444-8444-444444444444'

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

describe('buildFallbackBreadcrumbs', () => {
  const types = (path: string) => buildFallbackBreadcrumbs(path).map((crumb) => crumb.type)

  it('types only UUID segments below the house as apartment and tenant', () => {
    expect(types(sharedPath(ORG_ID, HOUSE_ID, APARTMENT_ID, TENANT_ID))).toEqual([
      'root', 'category', 'house', 'apartment', 'tenant',
    ])
  })

  it('types system and custom folders as category, not as apartment', () => {
    expect(types(sharedPath(ORG_ID, HOUSE_ID, 'house_documents'))).toEqual(['root', 'category', 'house', 'category'])
    expect(types(sharedPath(ORG_ID, HOUSE_ID, 'Rechnungen'))).toEqual(['root', 'category', 'house', 'category'])
    expect(types(sharedPath(ORG_ID, HOUSE_ID, APARTMENT_ID, 'apartment_documents'))).toEqual([
      'root', 'category', 'house', 'apartment', 'category',
    ])
    expect(types(sharedPath(ORG_ID, HOUSE_ID, 'Rechnungen', TENANT_ID))).toEqual([
      'root', 'category', 'house', 'category', 'category',
    ])
  })

  it('labels the zones, keeps the other segments as they are and links every crumb to its path', () => {
    const path = sharedPath(ORG_ID, HOUSE_ID, 'Rechnungen')
    expect(buildFallbackBreadcrumbs(path)).toEqual([
      { name: 'Cloud Storage', path: orgRoot(ORG_ID), type: 'root' },
      { name: 'Gemeinsam', path: `${orgRoot(ORG_ID)}/shared`, type: 'category' },
      { name: HOUSE_ID, path: `${orgRoot(ORG_ID)}/shared/${HOUSE_ID}`, type: 'house' },
      { name: 'Rechnungen', path, type: 'category' },
    ])
  })
})
