import {
  FOLDER_NOT_AVAILABLE_MESSAGE,
  isPermissionDeniedMessage,
  mapFolderRpcError,
  STORAGE_ACCESS_DENIED_MESSAGE,
} from './storage-messages'

describe('storage-messages', () => {
  describe('mapFolderRpcError', () => {
    it.each([
      'Invalid path: house not accessible',
      'Invalid path: does not belong to active organisation',
      'Invalid path: does not belong to user',
      'Invalid path: unknown zone',
    ])('turns the database refusal "%s" into the German folder message', (message) => {
      expect(mapFolderRpcError(message)).toBe(FOLDER_NOT_AVAILABLE_MESSAGE)
    })

    it('uses one text for a refused and a missing folder (no hint at the reason)', () => {
      expect(mapFolderRpcError('Invalid path: house not accessible')).toBe(mapFolderRpcError('Invalid path: unknown zone'))
    })

    it('keeps other texts unchanged', () => {
      expect(mapFolderRpcError('Etwas anderes ist schiefgegangen')).toBe('Etwas anderes ist schiefgegangen')
    })
  })

  describe('isPermissionDeniedMessage', () => {
    it.each([
      'new row violates row-level security policy',
      'permission denied for table objects',
      'Unauthorized',
      'insufficient_privilege',
      'ERROR 42501',
    ])('recognises "%s"', (message) => {
      expect(isPermissionDeniedMessage(message)).toBe(true)
    })

    it.each(['Object not found', 'Upload failed: timeout', '', undefined, null, 42])('does not treat %p as a refusal', (message) => {
      expect(isPermissionDeniedMessage(message)).toBe(false)
    })
  })

  it('both texts are German and tell nothing about names or the reason', () => {
    expect(FOLDER_NOT_AVAILABLE_MESSAGE).toMatch(/Berechtigung/)
    expect(STORAGE_ACCESS_DENIED_MESSAGE).toMatch(/Zugriff/)
  })
})
