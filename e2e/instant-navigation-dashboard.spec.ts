import { test, expect } from './diagnostics';
import { instant } from '@next/playwright';
import { login, hasTestCredentials, acceptCookieConsent } from './utils';

/**
 * Instant-navigation regression tests for the authenticated dashboard list routes (Cache Components).
 * Inside `instant()` only the prefetched shell is available, so each route must show its own loading skeleton
 * (not the page content, and not another route's skeleton) right after the click.
 *
 * Needs a build with the testing API and test credentials, see e2e/instant-navigation.spec.ts:
 *
 *   EXPOSE_TESTING_API=1 npm run build && npm run start
 *   EXPOSE_TESTING_API=1 npx playwright test e2e/instant-navigation-dashboard.spec.ts --project=chromium
 *
 * `instant()` relies on the Cookie Store API, which only Chromium ships, so the other browsers are skipped.
 */
test.skip(process.env.EXPOSE_TESTING_API !== '1', 'needs a build with EXPOSE_TESTING_API=1');

const ROUTES = [
  { path: '/mieter', skeleton: 'Mieter werden geladen', heading: 'Mieterverwaltung' },
  { path: '/haeuser', skeleton: 'Häuser werden geladen', heading: 'Hausverwaltung' },
  { path: '/wohnungen', skeleton: 'Wohnungen werden geladen', heading: 'Wohnungsverwaltung' },
];

test.describe('Instant navigation: dashboard list routes', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'instant() needs the Cookie Store API (Chromium only)');
    test.skip(!hasTestCredentials(), 'No test credentials provided in environment');
    try {
      await login(page);
      await acceptCookieConsent(page);
    } catch (error) {
      test.skip(true, `Login unavailable (${error instanceof Error ? error.message : error})`);
    }
  });

  for (const { path, skeleton, heading } of ROUTES) {
    test(`sidebar navigation to ${path} shows its own skeleton before any data`, async ({ page, baseURL }) => {
      await page.goto('/dashboard');
      await instant(
        page,
        async () => {
          await page.locator(`a[href="${path}"]:visible`).first().click();
          await page.waitForURL((url) => url.pathname === path);
          await expect(page.getByRole('status', { name: skeleton })).toBeVisible();
          await expect(page.getByText(heading)).toHaveCount(0);
        },
        { baseURL },
      );
    });
  }
});
