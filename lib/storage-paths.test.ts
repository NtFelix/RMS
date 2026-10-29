import {
  assertPathAllowed,
  orgRoot,
  parseStoragePath,
  privatePath,
  sharedPath,
  StoragePathError,
} from './storage-paths';

const ORG = 'org-1';
const USER = 'user-1';
const HOUSE_A = 'haus-a';
const HOUSE_B = 'haus-b';

describe('storage-paths builders', () => {
  it('builds the org root', () => {
    expect(orgRoot(ORG)).toBe('org_org-1');
  });

  it('builds shared paths below the house folder', () => {
    expect(sharedPath(ORG, HOUSE_A)).toBe('org_org-1/shared/haus-a');
    expect(sharedPath(ORG, HOUSE_A, 'wohnung-1', 'mieter-1')).toBe(
      'org_org-1/shared/haus-a/wohnung-1/mieter-1',
    );
  });

  it('builds private paths below the user folder', () => {
    expect(privatePath(ORG, USER)).toBe('org_org-1/private/user-1');
    expect(privatePath(ORG, USER, 'Rechnungen', 'Allgemein')).toBe(
      'org_org-1/private/user-1/Rechnungen/Allgemein',
    );
  });

  it('rejects traversal, separators and control characters in any segment', () => {
    expect(() => sharedPath(ORG, HOUSE_A, '..')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, 'a..b')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, '.')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, 'a/b')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, 'a\\b')).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, 'a\u0000b')).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, 'a\nb')).toThrow(StoragePathError);
  });

  it('rejects empty ids and empty segments', () => {
    expect(() => orgRoot('')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, '')).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, '')).toThrow(StoragePathError);
  });

  it('rejects segments longer than 255 characters and paths longer than 1000', () => {
    expect(() => privatePath(ORG, USER, 'a'.repeat(256))).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, ...Array(10).fill('a'.repeat(200)))).toThrow(StoragePathError);
  });
});

describe('parseStoragePath', () => {
  it('parses the org root', () => {
    expect(parseStoragePath('org_org-1')).toEqual({ zone: 'root', orgId: 'org-1', rest: [] });
  });

  it('parses shared paths including house and remaining segments', () => {
    expect(parseStoragePath('org_org-1/shared/haus-a/wohnung-1/Rechnungen/x.pdf')).toEqual({
      zone: 'shared',
      orgId: 'org-1',
      houseId: 'haus-a',
      rest: ['wohnung-1', 'Rechnungen', 'x.pdf'],
    });
  });

  it('parses the shared root without house', () => {
    expect(parseStoragePath('org_org-1/shared')).toEqual({ zone: 'shared', orgId: 'org-1', rest: [] });
  });

  it('parses private paths including user id', () => {
    expect(parseStoragePath('org_org-1/private/user-1/Rechnungen')).toEqual({
      zone: 'private',
      orgId: 'org-1',
      userId: 'user-1',
      rest: ['Rechnungen'],
    });
  });

  it('recognises legacy user_ paths without an org', () => {
    expect(parseStoragePath('user_user-1/haus/wohnung')).toEqual({
      zone: 'legacy-user',
      orgId: null,
      userId: 'user-1',
      rest: ['haus', 'wohnung'],
    });
  });

  it('round-trips builder output', () => {
    const path = sharedPath(ORG, HOUSE_A, 'wohnung-1', 'mieter-1');
    expect(parseStoragePath(path)).toEqual({
      zone: 'shared',
      orgId: ORG,
      houseId: HOUSE_A,
      rest: ['wohnung-1', 'mieter-1'],
    });
  });

  it.each([
    ['empty string', ''],
    ['leading slash', '/org_org-1/shared/haus-a'],
    ['trailing slash', 'org_org-1/shared/haus-a/'],
    ['double slash', 'org_org-1//shared/haus-a'],
    ['traversal segment', 'org_org-1/shared/../private/user-1'],
    ['traversal inside name', 'org_org-1/shared/haus-a/a..b'],
    ['NUL byte', 'org_org-1/shared/haus\u0000a'],
    ['backslash', 'org_org-1\\shared\\haus-a'],
    ['unknown prefix', 'docs/org_org-1/shared'],
    ['unknown zone', 'org_org-1/public/haus-a'],
    ['empty org id', 'org_/shared/haus-a'],
    ['empty legacy user id', 'user_/haus'],
  ])('rejects %s', (_label, path) => {
    expect(() => parseStoragePath(path)).toThrow(StoragePathError);
  });
});

describe('assertPathAllowed', () => {
  const unrestricted = { orgId: ORG, userId: USER, accessibleHouseIds: null };
  const restricted = { orgId: ORG, userId: USER, accessibleHouseIds: [HOUSE_A] };
  const noHouses = { orgId: ORG, userId: USER, accessibleHouseIds: [] as string[] };

  it('allows any house for unrestricted users (null)', () => {
    expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_B}/x`, unrestricted)).not.toThrow();
    expect(() => assertPathAllowed(`org_${ORG}/shared`, unrestricted)).not.toThrow();
  });

  it('allows only listed houses for restricted users', () => {
    expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_A}/wohnung`, restricted)).not.toThrow();
    expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_B}/wohnung`, restricted)).toThrow(StoragePathError);
  });

  it('denies all houses for an empty list', () => {
    expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_A}`, noHouses)).toThrow(StoragePathError);
    expect(() => assertPathAllowed(`org_${ORG}/shared`, noHouses)).toThrow(StoragePathError);
  });

  it('allows the own private area only', () => {
    expect(() => assertPathAllowed(`org_${ORG}/private/${USER}/Rechnungen`, restricted)).not.toThrow();
    expect(() => assertPathAllowed(`org_${ORG}/private/other-user`, restricted)).toThrow(StoragePathError);
    expect(() => assertPathAllowed(`org_${ORG}/private`, restricted)).toThrow(StoragePathError);
  });

  it('denies paths of another organisation', () => {
    expect(() => assertPathAllowed(`org_other-org/shared/${HOUSE_A}`, unrestricted)).toThrow(StoragePathError);
    expect(() => assertPathAllowed('org_other-org/private/user-1', unrestricted)).toThrow(StoragePathError);
  });

  it('rejects legacy user_ paths with code LEGACY_PATH', () => {
    try {
      assertPathAllowed(`user_${USER}/haus`, unrestricted);
      throw new Error('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(StoragePathError);
      expect((error as StoragePathError).code).toBe('LEGACY_PATH');
    }
  });

  it('rejects traversal before any access check', () => {
    try {
      assertPathAllowed(`org_${ORG}/private/${USER}/../other-user`, unrestricted);
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as StoragePathError).code).toBe('INVALID_PATH');
    }
  });

  it('allows the org root for any member', () => {
    expect(() => assertPathAllowed(`org_${ORG}`, noHouses)).not.toThrow();
  });
});
