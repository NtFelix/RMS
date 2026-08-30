import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Creates a type-safe mock of Next.js AppRouterInstance for use in unit tests.
 */
export function createMockRouter(overrides: Partial<AppRouterInstance> = {}): AppRouterInstance {
  return {
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  } as unknown as AppRouterInstance;
}
