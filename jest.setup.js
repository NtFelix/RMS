// jest.setup.js
import '@testing-library/jest-dom'

// Add TextEncoder/TextDecoder polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('@supabase/ssr', () => {
  return {
    createBrowserClient: jest.fn(() => ({
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        resetPasswordForEmail: jest.fn(),
      },
    })),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

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

// Mock server actions to prevent actual imports during testing
jest.mock('@/app/betriebskosten-actions', () => ({
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
  getNebenkostenDetailsAction: jest.fn(),
  createRechnungenBatch: jest.fn(),
  deleteRechnungenByNebenkostenId: jest.fn(),
}));

jest.mock('@/app/mieter-actions', () => ({
  getMieterByHausIdAction: jest.fn(),
}));
