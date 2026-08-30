import { sanitizeOrgId, getOrgCookieHeader } from './supabase-env';

describe('lib/supabase-env', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  describe('sanitizeOrgId', () => {
    it('returns valid UUID when given a clean UUID', () => {
      expect(sanitizeOrgId(validUuid)).toBe(validUuid);
    });

    it('trims whitespace around a valid UUID', () => {
      expect(sanitizeOrgId(`  ${validUuid}  `)).toBe(validUuid);
    });

    it('returns null for undefined, null, or empty string', () => {
      expect(sanitizeOrgId(undefined)).toBeNull();
      expect(sanitizeOrgId(null)).toBeNull();
      expect(sanitizeOrgId('')).toBeNull();
      expect(sanitizeOrgId('   ')).toBeNull();
    });

    it('returns null for sentinel strings', () => {
      expect(sanitizeOrgId('private')).toBeNull();
      expect(sanitizeOrgId(' Private ')).toBeNull();
      expect(sanitizeOrgId('null')).toBeNull();
      expect(sanitizeOrgId('NULL')).toBeNull();
      expect(sanitizeOrgId('undefined')).toBeNull();
      expect(sanitizeOrgId(' UNDEFINED ')).toBeNull();
    });

    it('returns null for arbitrary invalid strings', () => {
      expect(sanitizeOrgId('invalid-not-a-uuid')).toBeNull();
      expect(sanitizeOrgId('12345')).toBeNull();
    });
  });

  describe('getOrgCookieHeader', () => {
    it('returns Cookie header for a valid UUID', () => {
      expect(getOrgCookieHeader(validUuid)).toEqual({
        Cookie: `current_organisation_id=${validUuid}`,
      });
    });

    it('returns empty object for sentinels and falsy values without logging warnings', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(getOrgCookieHeader('', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader('   ', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader('private', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader(' Private ', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader('null', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader(' NULL ', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader('undefined', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader(' UNDEFINED ', 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader(null, 'TestCaller')).toEqual({});
      expect(getOrgCookieHeader(undefined, 'TestCaller')).toEqual({});

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('logs warning in development for unexpected non-UUID strings', () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'development';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getOrgCookieHeader('malformed-uuid', 'TestCaller');
      expect(result).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(
        '[TestCaller] Invalid current_organisation_id format (expected UUID):',
        'malformed-uuid'
      );

      warnSpy.mockRestore();
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('suppresses warning in production (NODE_ENV !== development) for invalid strings', () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getOrgCookieHeader('malformed-uuid', 'TestCaller');
      expect(result).toEqual({});
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
      (process.env as any).NODE_ENV = originalEnv;
    });
  });
});

