import { getCookie, setCookie, deleteCookie } from './cookies';

describe('cookies utils', () => {
  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');

  beforeAll(() => {
    // Redefine document.cookie for the test suite
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterAll(() => {
    // Restore original document.cookie descriptor
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalCookieDescriptor);
    }
  });

  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = '';
  });

  describe('setCookie', () => {
    it('should set a cookie with the correct format', () => {
      setCookie('testCookie', 'testValue', 7);
      expect(document.cookie).toContain('testCookie=testValue');
      // Check for expires
      expect(document.cookie).toMatch(/expires=/i);
    });

    it('should encode the cookie value', () => {
      setCookie('encodedCookie', 'value with spaces', 7);
      expect(document.cookie).toContain('encodedCookie=value%20with%20spaces');
    });
  });

  describe('getCookie', () => {
    it('should get a cookie value', () => {
      document.cookie = 'foo=bar';
      expect(getCookie('foo')).toBe('bar');
    });

    it('should get a cookie when there are multiple cookies', () => {
      document.cookie = 'first=one; foo=bar; last=end';
      expect(getCookie('foo')).toBe('bar');
      expect(getCookie('first')).toBe('one');
      expect(getCookie('last')).toBe('end');
    });

    it('should return null for a non-existent cookie', () => {
      document.cookie = 'foo=bar';
      expect(getCookie('nonExistent')).toBeNull();
    });

    it('should handle cookies with encoded values', () => {
      document.cookie = 'encoded=value%20with%20spaces';
      expect(getCookie('encoded')).toBe('value with spaces');
    });

    it('should not match partial cookie names', () => {
      document.cookie = 'foobar=wrong; foo=right';
      expect(getCookie('foo')).toBe('right');
    });
  });

  describe('deleteCookie', () => {
    it('should delete a cookie by setting its expiry to the past', () => {
      deleteCookie('foo');

      // Verify the SET command contained the expiry instruction for the past
      expect(document.cookie).toContain('foo=');
      expect(document.cookie).toMatch(/expires=Thu, 01 Jan 1970/i);
    });
  });
});
