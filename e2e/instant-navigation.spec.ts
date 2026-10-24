import { test, expect } from './diagnostics';
import { instant } from '@next/playwright';

/**
 * Instant-navigation regression tests (Cache Components). `instant()` scopes the assertions to the UI that is
 * available immediately, before any request-time content streams in, so a route that starts blocking fails here.
 *
 * `next dev` exposes the testing API automatically. For a production build it must be compiled in, so these tests
 * are skipped unless the build was made with the flag (the regular CI build does not set it):
 *
 *   EXPOSE_TESTING_API=1 npm run build && npm run start
 *   EXPOSE_TESTING_API=1 npx playwright test e2e/instant-navigation.spec.ts --project=chromium
 *
 * (A standalone server additionally needs `.next/static` and `public` copied next to it, as the Dockerfile does.)
 * Only public routes are covered here, so no credentials are needed.
 */
test.skip(process.env.EXPOSE_TESTING_API !== '1', 'needs a build with EXPOSE_TESTING_API=1');

test.describe('Instant navigation: public routes', () => {
  test('static legal page content is part of the shell on a page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/impressum');
        await expect(page.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();
      },
      { baseURL },
    );
  });

  test('client navigation from the landing page to the pricing page shows the skeleton instantly', async ({ page, baseURL }) => {
    await page.goto('/');
    await instant(
      page,
      async () => {
        await page.locator('nav a[href="/preise"]:visible').first().click();
        await page.waitForURL((url) => url.pathname === '/preise');
        // The skeleton marker, not the "Am beliebtesten" badge: that also shows in the loaded plans
        // and is absent in the waitlist and error states, which depend on PostHog and Stripe.
        await expect(page.getByTestId('pricing-skeleton')).toBeVisible();
      },
      { baseURL },
    );
  });

  test('pricing page skeleton is part of the shell on a page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/preise');
        await expect(page.getByTestId('pricing-skeleton')).toBeVisible();
      },
      { baseURL },
    );
  });
});
