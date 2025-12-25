
import { getCookie, setCookie, deleteCookie } from './cookies';

describe('cookies utils', () => {
  let originalCookie: string;

  beforeEach(() => {
    // Store original cookie property descriptor or value
    originalCookie = document.cookie;

    // Reset cookies
    // In jsdom, document.cookie is just a string setter/getter but doesn't handle expiry automatically in real-time usually.
    // We can define a property to intercept calls to verify what was set.
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterAll(() => {
    // Restore
    Object.defineProperty(document, 'cookie', {
        writable: true,
        value: originalCookie,
    });
  });

  it('should set a cookie', () => {
    // We will spy on the setter logic by observing the value change
    setCookie('testCookie', 'testValue', 7);
    expect(document.cookie).toContain('testCookie=testValue');
    // Check for expires OR max-age
    expect(document.cookie).toMatch(/expires=|max-age=/i);
  });

  it('should get a cookie', () => {
    document.cookie = 'foo=bar';
    expect(getCookie('foo')).toBe('bar');
  });

  it('should delete a cookie', () => {
    // deleteCookie sets max-age=0 or expires in past
    deleteCookie('foo');

    // Verify the SET command contained the expiry instruction
    expect(document.cookie).toContain('foo=');
    expect(document.cookie).toMatch(/max-age=0|expires=/i);
  });
});
