// jest.setup.js
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import 'jest-location-mock'

// Add TextEncoder/TextDecoder polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add URL polyfill for Node.js environment
const { URL } = require('url');
global.URL = URL;

// Add IntersectionObserver polyfill
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Add Request/Response polyfills for Next.js server APIs
global.Request = class Request {
  constructor(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    Object.defineProperty(this, 'url', {
      value: url,
      writable: false,
      enumerable: true,
      configurable: false
    });
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.body = init?.body;
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Map(Object.entries(init?.headers || {}));
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
  
  text() {
    return Promise.resolve(this.body);
  }
  
  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    });
  }
};

global.Headers = class Headers extends Map {
  constructor(init) {
    super();
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value));
      }
    }
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve(
    Response.json({ success: true })
  )
);

jest.mock('@supabase/ssr', () => {
  return {
    createBrowserClient: jest.fn(() => ({
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        resetPasswordForEmail: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => Promise.resolve({ data: null, error: null })),
        delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      rpc: jest.fn(() => Promise.resolve({
        data: [{ total_balance: 9600, total_income: 12000, total_expenses: 2400 }],
        error: null
      })),
    })),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  redirect: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
  requirePermission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn().mockResolvedValue(null),
  getAccessibleWohnungIds: jest.fn().mockResolvedValue(null),
  applyHaeuserScope: jest.fn((query, column, ids) => query),
}));

jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn().mockImplementation(async () => {
    const { createClient } = require('@/utils/supabase/server');
    const supabase = await createClient();
    if (supabase && supabase.auth && typeof supabase.auth.getUser === 'function') {
      try {
        const res = await supabase.auth.getUser();
        if (res) {
          if (res.error || (res.data && res.data.user === null)) {
            throw new Error("Nicht authentifiziert");
          }
          if (res.data && res.data.user) {
            return { user: res.data.user, supabase };
          }
        }
      } catch (e) {
        if (e.message === "Nicht authentifiziert") {
          throw e;
        }
      }
    }
    return {
      user: { id: 'test-user-id', email: 'test@example.com' },
      supabase,
    };
  }),
}));

jest.mock('next/server', () => ({
  NextRequest: class NextRequest extends global.Request {
    constructor(input, init) {
      super(input, init);
      this.nextUrl = new URL(typeof input === 'string' ? input : input.url);
    }
  },
  NextResponse: class NextResponse extends global.Response {
    constructor(body, init) {
      super(body, init);
    }
    
    static json(data, init) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        }
      });
    }
  }
}));

// Only define window properties if window exists (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock window.scrollTo for animation libraries (Framer Motion, etc.)
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  });
}

// Add polyfills for DOM methods only if Element exists (jsdom environment)
if (typeof Element !== 'undefined') {
  // Add polyfill for hasPointerCapture which is missing in JSDOM
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = jest.fn(() => false);
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = jest.fn();
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = jest.fn();
  }

  // Add scrollIntoView mock for Radix UI components
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = jest.fn();
  }
}

// Mock server actions to prevent actual imports during testing
jest.mock('@/app/betriebskosten-actions', () => ({
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
  getNebenkostenDetailsAction: jest.fn(),
  createRechnungenBatch: jest.fn(),
  deleteRechnungenByNebenkostenId: jest.fn(),
  getAbrechnungModalDataAction: jest.fn(() => Promise.resolve({ success: true, data: null })),
}));

// Mock hooks to prevent actual imports during testing
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
  toast: jest.fn(),
}));

// Mock complex AI-related dependencies to prevent hanging
jest.mock('@/hooks/use-ai-cache-client', () => ({
  useAICacheClient: () => ({
    cacheResponse: jest.fn(),
    getCachedResponse: jest.fn(),
    hasCachedResponse: jest.fn(),
    stats: { hits: 0, misses: 0 }
  }),
  useAICacheWarming: () => ({
    preloadFrequentQueries: jest.fn()
  })
}));

// AI input validation is used directly in tests to verify logic
jest.unmock('@/lib/ai-input-validation');

jest.mock('@/lib/ai-documentation-context', () => ({
  categorizeAIError: jest.fn(() => ({
    errorType: 'unknown_error',
    errorMessage: 'Test error',
    retryable: false
  })),
  trackAIRequestFailure: jest.fn()
}));

// Prevent timers from hanging tests
jest.useFakeTimers({ advanceTimers: true });

// Store original console.warn
const originalWarn = console.warn;

// Clean up after each test
afterEach(() => {
  // Temporarily suppress timer warnings
  console.warn = jest.fn((message) => {
    // Suppress fake timer warnings
    if (typeof message === 'string' && message.includes('timers APIs are not replaced')) {
      return;
    }
    originalWarn(message);
  });
  
  try {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
  } catch (error) {
    // Silently ignore if fake timers aren't active
  } finally {
    // Restore console.warn
    console.warn = originalWarn;
  }
});
