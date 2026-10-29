import {
  archivePathFor,
  archiveTimestamp,
  archiveTimestampToDate,
  isOwnLegacyPath,
  parseArchivePath,
  assertPathAllowed,
  childPath,
  isArchivePath,
  orgIdOfPath,
  orgRootOfPath,
  privateRoot,
  sharedRoot,
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

  it('builds the zone roots', () => {
    expect(sharedRoot(ORG)).toBe('org_org-1/shared');
    expect(privateRoot(ORG, USER)).toBe('org_org-1/private/user-1');
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
    expect(() => sharedPath(ORG, HOUSE_A, '.')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, 'a/b')).toThrow(StoragePathError);
    expect(() => sharedPath(ORG, HOUSE_A, '../x')).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, 'a\u0000b')).toThrow(StoragePathError);
    expect(() => privatePath(ORG, USER, 'a\nb')).toThrow(StoragePathError);
  });

  it('allows ".." inside a name and backslashes (only the whole segment ".." is traversal)', () => {
    expect(sharedPath(ORG, HOUSE_A, 'Vertrag..pdf')).toBe('org_org-1/shared/haus-a/Vertrag..pdf');
    expect(sharedPath(ORG, HOUSE_A, 'Rechnung 12..2025.pdf')).toBe('org_org-1/shared/haus-a/Rechnung 12..2025.pdf');
    expect(sharedPath(ORG, HOUSE_A, '...')).toBe('org_org-1/shared/haus-a/...');
    expect(privatePath(ORG, USER, 'a\\b.pdf')).toBe('org_org-1/private/user-1/a\\b.pdf');
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

  it('accepts ".." inside a file name and keeps it unchanged', () => {
    expect(parseStoragePath('org_org-1/shared/haus-a/Vertrag..pdf')).toEqual({
      zone: 'shared',
      orgId: 'org-1',
      houseId: 'haus-a',
      rest: ['Vertrag..pdf'],
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
    ['traversal at the end', 'org_org-1/shared/haus-a/..'],
    ['current-dir segment', 'org_org-1/shared/./haus-a'],
    ['NUL byte', 'org_org-1/shared/haus\u0000a'],
    ['unknown prefix', 'docs/org_org-1/shared'],
    ['unknown zone', 'org_org-1/public/haus-a'],
    ['empty org id', 'org_/shared/haus-a'],
    ['empty legacy user id', 'user_/haus'],
  ])('rejects %s', (_label, path) => {
    expect(() => parseStoragePath(path)).toThrow(StoragePathError);
  });
});

describe('orgIdOfPath / orgRootOfPath', () => {
  it('derives org id and root from valid paths', () => {
    expect(orgIdOfPath('org_org-1/shared/haus-a')).toBe('org-1');
    expect(orgRootOfPath('org_org-1/private/user-1/x')).toBe('org_org-1');
  });

  it('returns null for legacy, invalid or traversal paths instead of throwing', () => {
    expect(orgIdOfPath('user_user-1/haus')).toBeNull();
    expect(orgRootOfPath('org_org-1/../x')).toBeNull();
    expect(orgIdOfPath('')).toBeNull();
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
    expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_A}`, noHouses, 'write')).toThrow(StoragePathError);
  });

  it('allows the own private area only', () => {
    expect(() => assertPathAllowed(`org_${ORG}/private/${USER}/Rechnungen`, restricted)).not.toThrow();
    expect(() => assertPathAllowed(`org_${ORG}/private/other-user`, restricted)).toThrow(StoragePathError);
    expect(() => assertPathAllowed(`org_${ORG}/private/other-user/x`, unrestricted, 'write')).toThrow(StoragePathError);
  });

  describe('mode read (default)', () => {
    it.each([
      ['restricted', restricted],
      ['no houses', noHouses],
      ['unrestricted', unrestricted],
    ])('allows the browsable roots for %s users', (_label, ctx) => {
      expect(() => assertPathAllowed(`org_${ORG}`, ctx, 'read')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/shared`, ctx, 'read')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/private`, ctx, 'read')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/shared`, ctx)).not.toThrow();
    });

    it('still checks the house scope and the own user below the zone roots', () => {
      expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_B}`, restricted)).toThrow(StoragePathError);
      expect(() => assertPathAllowed(`org_${ORG}/private/other-user`, unrestricted)).toThrow(StoragePathError);
    });

    it('denies the roots of another organisation', () => {
      expect(() => assertPathAllowed('org_other-org/shared', unrestricted)).toThrow(StoragePathError);
      expect(() => assertPathAllowed('org_other-org', unrestricted)).toThrow(StoragePathError);
    });
  });

  describe('mode write', () => {
    it.each([
      ['org root', `org_${ORG}`],
      ['shared root', `org_${ORG}/shared`],
      ['private root', `org_${ORG}/private`],
    ])('never allows the %s', (_label, path) => {
      for (const ctx of [unrestricted, restricted, noHouses]) {
        expect(() => assertPathAllowed(path, ctx, 'write')).toThrow(StoragePathError);
      }
    });

    it('allows house folder (as parent) and below only for houses in scope', () => {
      expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_A}`, restricted, 'write')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_A}/Rechnungen/x.pdf`, restricted, 'write')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_B}/x.pdf`, restricted, 'write')).toThrow(StoragePathError);
      expect(() => assertPathAllowed(`org_${ORG}/shared/${HOUSE_B}/x.pdf`, unrestricted, 'write')).not.toThrow();
    });

    it('allows the own private folder and below only', () => {
      expect(() => assertPathAllowed(`org_${ORG}/private/${USER}`, restricted, 'write')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/private/${USER}/Notizen/a.md`, noHouses, 'write')).not.toThrow();
      expect(() => assertPathAllowed(`org_${ORG}/private/other-user/a.md`, restricted, 'write')).toThrow(StoragePathError);
    });

    it('denies the foreign organisation and legacy paths', () => {
      expect(() => assertPathAllowed(`org_other-org/shared/${HOUSE_A}/x`, unrestricted, 'write')).toThrow(StoragePathError);
      expect(() => assertPathAllowed(`user_${USER}/x`, unrestricted, 'write')).toThrow(StoragePathError);
    });
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

describe('childPath', () => {
  it('joins parent and a safe name', () => {
    expect(childPath(`org_${ORG}/shared/${HOUSE_A}/Rechnungen`, 'x.pdf')).toBe(`org_${ORG}/shared/${HOUSE_A}/Rechnungen/x.pdf`);
    expect(childPath(`org_${ORG}/shared/${HOUSE_A}`, 'Vertrag..pdf')).toBe(`org_${ORG}/shared/${HOUSE_A}/Vertrag..pdf`);
    expect(childPath(`org_${ORG}/private/${USER}`, 'Notizen')).toBe(`org_${ORG}/private/${USER}/Notizen`);
  });

  it.each([
    ['dot-dot', '..'],
    ['dot', '.'],
    ['empty', ''],
    ['separator', 'a/b'],
    ['leading traversal', '../x'],
    ['trailing traversal', 'x/..'],
    ['NUL byte', 'a\u0000b'],
    ['too long', 'a'.repeat(256)],
  ])(
    'rejects the unsafe name: %s',
    (_label, name) => {
      try {
        childPath(`org_${ORG}/shared/${HOUSE_A}`, name);
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StoragePathError);
        expect((error as StoragePathError).code).toBe('INVALID_NAME');
      }
    },
  );

  it('rejects an invalid parent', () => {
    expect(() => childPath(`org_${ORG}/shared/../x`, 'a')).toThrow(StoragePathError);
    expect(() => childPath('', 'a')).toThrow(StoragePathError);
  });

  it('rejects the org root and the zone roots as parent (their children are house and user folders)', () => {
    expect(() => childPath(`org_${ORG}`, HOUSE_A)).toThrow(StoragePathError);
    expect(() => childPath(`org_${ORG}/shared`, HOUSE_A)).toThrow(StoragePathError);
    expect(() => childPath(`org_${ORG}/private`, USER)).toThrow(StoragePathError);
  });

  it('passes a legacy parent through so that the access check can decide', () => {
    expect(childPath(`user_${USER}/haus`, 'x.pdf')).toBe(`user_${USER}/haus/x.pdf`);
  });
});

describe('isArchivePath', () => {
  it('recognises paths in or at an archive folder', () => {
    expect(isArchivePath(`org_${ORG}/shared/${HOUSE_A}/__archive__`)).toBe(true);
    expect(isArchivePath(`org_${ORG}/shared/${HOUSE_A}/__archive__/2026/x.pdf`)).toBe(true);
    expect(isArchivePath(`org_${ORG}/private/${USER}/__archive__/2026/x.pdf`)).toBe(true);
  });

  it('is false for normal paths, also if a deeper folder has the archive name', () => {
    expect(isArchivePath(`org_${ORG}/shared/${HOUSE_A}/Rechnungen/__archive__`)).toBe(false);
    expect(isArchivePath(`org_${ORG}/shared/${HOUSE_A}`)).toBe(false);
  });
});

describe('archive paths', () => {
  const TS = '2026-10-29T10-00-00';

  it('puts the archive of a shared file inside the house zone', () => {
    expect(archivePathFor(`org_${ORG}/shared/${HOUSE_A}/wohnung-1/Rechnungen/x.pdf`, TS)).toBe(
      `org_${ORG}/shared/${HOUSE_A}/__archive__/${TS}/wohnung-1/Rechnungen/x.pdf`,
    );
  });

  it('puts the archive of a private file inside the private zone', () => {
    expect(archivePathFor(`org_${ORG}/private/${USER}/Notizen/a.md`, TS)).toBe(
      `org_${ORG}/private/${USER}/__archive__/${TS}/Notizen/a.md`,
    );
  });

  it('round-trips through parseArchivePath', () => {
    const archived = archivePathFor(`org_${ORG}/shared/${HOUSE_A}/wohnung-1/x.pdf`, TS);
    expect(parseArchivePath(archived)).toEqual({
      originalPath: `org_${ORG}/shared/${HOUSE_A}/wohnung-1/x.pdf`,
      timestamp: TS,
    });
  });

  it('returns null for non-archive paths', () => {
    expect(parseArchivePath(`org_${ORG}/shared/${HOUSE_A}/wohnung-1`)).toBeNull();
    expect(parseArchivePath(`org_${ORG}/private/${USER}/x`)).toBeNull();
  });

  it('refuses zone roots, house folders, legacy and already archived paths', () => {
    expect(() => archivePathFor(`org_${ORG}/shared/${HOUSE_A}`, TS)).toThrow(StoragePathError);
    expect(() => archivePathFor(`org_${ORG}/shared`, TS)).toThrow(StoragePathError);
    expect(() => archivePathFor(`user_${USER}/haus/x`, TS)).toThrow(StoragePathError);
    expect(() => archivePathFor(`org_${ORG}/shared/${HOUSE_A}/__archive__/${TS}/x`, TS)).toThrow(StoragePathError);
    expect(() => archivePathFor(`org_${ORG}/shared/${HOUSE_A}/x`, '../evil')).toThrow(StoragePathError);
  });

  it('allows the owner to read a legacy user_ path only', () => {
    expect(isOwnLegacyPath(`user_${USER}/haus/x.pdf`, USER)).toBe(true);
    expect(isOwnLegacyPath(`user_${USER}/haus/x.pdf`, 'other')).toBe(false);
    expect(isOwnLegacyPath(`org_${ORG}/private/${USER}/x`, USER)).toBe(false);
    expect(isOwnLegacyPath('user_/x', USER)).toBe(false);
  });

  it('round-trips archive timestamps', () => {
    const date = new Date('2026-10-29T10:00:00.123Z');
    const ts = archiveTimestamp(date);
    expect(ts).toBe('2026-10-29T10-00-00-123Z');
    expect(archiveTimestampToDate(ts)?.getTime()).toBe(date.getTime());
    expect(archiveTimestampToDate(archiveTimestamp())).toBeInstanceOf(Date);
  });

  it('returns null for invalid archive timestamps', () => {
    expect(archiveTimestampToDate('')).toBeNull();
    expect(archiveTimestampToDate('not-a-timestamp')).toBeNull();
  });
});
