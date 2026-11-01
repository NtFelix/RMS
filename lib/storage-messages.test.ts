import {
  FOLDER_NOT_AVAILABLE_MESSAGE,
  isPermissionDeniedError,
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
      'new row violates row-level security policy for table "objects"',
      'permission denied for table objects',
      'insufficient_privilege',
      'Invalid path: house not accessible',
      // behind one wrapper of our own code
      'Upload konnte nicht vorbereitet werden: new row violates row-level security policy',
      'Failed to copy file: permission denied for table objects',
    ])('recognises "%s"', (message) => {
      expect(isPermissionDeniedMessage(message)).toBe(true)
    })

    it.each([
      'Object not found',
      'Upload failed: timeout',
      '',
      undefined,
      null,
      42,
      // session errors are no refusal of the folder: the sign-in path stays
      'Unauthorized',
      'JWT expired',
      'Failed to create signed URL: Unauthorized',
      'ERROR 42501',
      // file names in messages must not look like a refusal
      'Datei Unauthorized-Memo.pdf existiert bereits',
      'Source file not found: Rechnung 42501.pdf in org_x/shared/h',
      'Source file not found: forbidden.pdf in org_x/shared/h',
      'Die Datei "new row violates row-level security policy.pdf" ist zu groß',
    ])('does not treat %p as a refusal', (message) => {
      expect(isPermissionDeniedMessage(message)).toBe(false)
    })
  })

  describe('isPermissionDeniedError', () => {
    it('recognises SQLSTATE 42501 and HTTP 403 of the error object, whatever the message says', () => {
      expect(isPermissionDeniedError({ code: '42501', message: 'whatever' })).toBe(true)
      expect(isPermissionDeniedError({ statusCode: '403', error: 'Unauthorized', message: 'The resource was not found' })).toBe(true)
      expect(isPermissionDeniedError({ status: 403, message: 'x' })).toBe(true)
    })

    it('recognises an anchored message and a plain string', () => {
      expect(isPermissionDeniedError({ message: 'new row violates row-level security policy' })).toBe(true)
      expect(isPermissionDeniedError(new Error('Failed to delete files: permission denied for table objects'))).toBe(true)
      expect(isPermissionDeniedError('new row violates row-level security policy')).toBe(true)
    })

    it('does not treat an expired session or a technical failure as a refusal', () => {
      expect(isPermissionDeniedError({ status: 401, statusCode: '401', message: 'Unauthorized' })).toBe(false)
      expect(isPermissionDeniedError({ statusCode: '400', error: 'InvalidJWT', message: 'JWT expired' })).toBe(false)
      expect(isPermissionDeniedError(new Error('Nicht authentifiziert. Bitte melden Sie sich an.'))).toBe(false)
      expect(isPermissionDeniedError({ code: '500', status: 500, message: 'boom' })).toBe(false)
      expect(isPermissionDeniedError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false)
      expect(isPermissionDeniedError(null)).toBe(false)
      expect(isPermissionDeniedError(undefined)).toBe(false)
    })
  })

  it('both texts are German and tell nothing about names or the reason', () => {
    expect(FOLDER_NOT_AVAILABLE_MESSAGE).toMatch(/Berechtigung/)
    expect(STORAGE_ACCESS_DENIED_MESSAGE).toMatch(/Zugriff/)
  })
})
