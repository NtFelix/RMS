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

const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  test.describe(`@visual Visual Review - Public Pages (${theme} mode)`, () => {
    test.use({ colorScheme: theme });

    for (const path of publicPages) {
      // Generate a safe filename based on path and theme
      const baseFilename = path === '/' ? 'landing' : `${path.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Public Page: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await acceptCookieConsent(page);

        // Force the theme using a custom function if the app uses next-themes or similar class-based approach
        await page.evaluate((t) => {
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        // Wait for any animations to settle
        await page.waitForTimeout(1000);
        await expect(page).toHaveScreenshot(filename, {
          fullPage: true,
          threshold: 0.02,
        });
      });
    }
  });

  test.describe(`@visual Visual Review - Dashboard Pages (${theme} mode)`, () => {
    test.use({ colorScheme: theme });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await acceptCookieConsent(page);
    });

    for (const path of dashboardPages) {
      const filename = `dashboard-${path.replace(/^\//, '').replace(/\//g, '-')}-${theme}.png`;

      test(`Dashboard Page: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        // Force the theme using a custom function if the app uses next-themes or similar class-based approach
        await page.evaluate((t) => {
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        // Give charts and dynamic data extra time to render
        await page.waitForTimeout(2500);
        await expect(page).toHaveScreenshot(filename, {
          fullPage: true,
          threshold: 0.02,
        });
      });
    }
  });
}
