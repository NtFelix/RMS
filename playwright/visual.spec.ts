import { test } from '@playwright/test';
import { login, acceptCookieConsent } from '../e2e/utils';
import path from 'path';
import fs from 'fs';

// Ensure snapshot directory exists
const snapshotDir = path.join(__dirname, '__snapshots__');
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

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

    for (const pathStr of publicPages) {
      // Generate a safe filename based on path and theme
      const baseFilename = pathStr === '/' ? 'landing' : `${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Public Page: ${pathStr}`, async ({ page }, testInfo) => {
        await page.goto(pathStr);
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

        // Capture screenshot for PostHog Visual Review
        // We use page.screenshot instead of expect().toHaveScreenshot to avoid 
        // baseline mismatch errors in CI, as PostHog handles the comparison.
        await page.screenshot({
          path: path.join(snapshotDir, `${testInfo.project.name}-${filename}`),
          fullPage: true,
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

    for (const pathStr of dashboardPages) {
      const baseFilename = `dashboard-${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Dashboard Page: ${pathStr}`, async ({ page }, testInfo) => {
        await page.goto(pathStr);
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

        // Capture screenshot for PostHog Visual Review
        await page.screenshot({
          path: path.join(snapshotDir, `${testInfo.project.name}-${filename}`),
          fullPage: true,
        });
      });
    }
  });
}

