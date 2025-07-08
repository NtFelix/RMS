// Extends Jest expect with custom matchers from jest-dom
require('@testing-library/jest-dom');

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for fetch, Request, Response
require('whatwg-fetch'); // Makes fetch, Request, Response globally available

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

// Mock next/server
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  class MockNextResponse extends originalModule.NextResponse {
    // No custom constructor - will inherit from originalModule.NextResponse
    // The main purpose here is to mock the static methods.

    static json = jest.fn((body, init) => {
      const status = init?.status || 200;
      const headers = new Headers(init?.headers);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      // Simulate a Response object structure more closely
      const responseBody = body === undefined ? null : JSON.stringify(body);
      return {
        status,
        headers,
        ok: status >= 200 && status < 300,
        json: async () => JSON.parse(responseBody || 'null'), // Ensure it parses back for await response.json()
        text: async () => responseBody || '',
        clone: function() { return { ...this }; }, // Basic clone
        get type() { return 'default'; },
        get statusText() { return ''; }, // Add other getters if needed
        get redirected() { return false; },
        get url() { return ''; },
        // Add other methods like arrayBuffer, blob, formData if necessary
      }; // Removed type assertion
    });

    static next = jest.fn((init) => {
        const headers = new Headers(init?.request?.headers);
        return {
            status: 200,
            headers,
            ok: true,
            json: async () => ({}), text: async () => '', clone: function() { return this; }
        }; // Removed type assertion
    });

    static redirect = jest.fn((url, init) => {
      const status = init?.status || 307; // Common redirect status
      const headers = new Headers(init?.headers);
      headers.set('Location', typeof url === 'string' ? url : url.toString());
      return {
        status,
        headers,
        ok: false, // Redirects are not "ok" in the 2xx sense
        redirected: true,
        json: async () => ({}), text: async () => '', clone: function() { return this; }
      }; // Removed type assertion
    });
  }

  return {
    ...originalModule,
    NextResponse: MockNextResponse,
  };
});

// You can add other global setups here if needed
// For example, mocking global objects:
// global.matchMedia = global.matchMedia || function() {
//   return {
//     matches : false,
//     addListener : function() {},
//     removeListener: function() {}
//   }
// }
