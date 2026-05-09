import { test, expect } from '@playwright/test';
import { login, acceptCookieConsent } from '../e2e/utils';

// Array of public pages to screenshot
const publicPages = [
  '/',
  '/preise',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/loesungen/privatvermieter',
  '/loesungen/kleine-mittlere-hausverwaltungen',
  '/loesungen/grosse-hausverwaltungen',
  '/funktionen/wohnungsverwaltung',
  '/funktionen/finanzverwaltung',
  '/funktionen/betriebskosten',
  '/warteliste/mobile-app',
  '/warteliste/browser-erweiterung',
];

// Array of authenticated dashboard pages to screenshot
const dashboardPages = [
  '/dashboard',
  '/haeuser',
  '/wohnungen',
  '/mieter',
  '/finanzen',
  '/betriebskosten',
  '/dateien',
  '/todos',
  '/mails',
];

test.describe('@visual Visual Review - Public Pages', () => {
  for (const path of publicPages) {
    // Generate a safe filename based on path
    const filename = path === '/' ? 'landing.png' : `${path.replace(/^\//, '').replace(/\//g, '-')}.png`;

    test(`Public Page: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await acceptCookieConsent(page);
      // Wait for any animations to settle
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(filename, {
        fullPage: true,
        threshold: 0.02,
      });
    });
  }
});

test.describe('@visual Visual Review - Dashboard Pages', () => {
  // Login once before running all dashboard tests if using serial, but Playwright parallelizes by default.
  // Using beforeEach ensures each test gets an authenticated state.
  test.beforeEach(async ({ page }) => {
    await login(page);
    await acceptCookieConsent(page);
  });

  for (const path of dashboardPages) {
    const filename = `dashboard-${path.replace(/^\//, '').replace(/\//g, '-')}.png`;

    test(`Dashboard Page: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Give charts and dynamic data extra time to render
      await page.waitForTimeout(2500);
      await expect(page).toHaveScreenshot(filename, {
        fullPage: true,
        threshold: 0.02,
      });
    });
  }
});
