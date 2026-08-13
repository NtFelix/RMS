import { test, type Page } from '@playwright/test';
import { login, acceptCookieConsent, VISUAL_TEST_EMAIL, VISUAL_TEST_PASSWORD } from '../e2e/utils';
import path from 'path';
import fs from 'fs';

/**
 * Disables all CSS transitions and animations to ensure deterministic screenshots.
 * This prevents "ghosting" diffs caused by capturing a UI mid-transition.
 */
async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition-property: none !important;
        transform: none !important;
        animation: none !important;
      }
    `,
  });
}

/**
 * Scrolls the page from top to bottom incrementally to trigger lazy-loaded images
 * and scroll-based animations (like Intersection Observers).
 */
async function triggerScrollAnimations(page: Page) {
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    
    // Scroll down in chunks to ensure all observers fire
    for (let i = 0; i < scrollHeight; i += viewportHeight / 2) {
      window.scrollTo(0, i);
      // Increased delay to let JS execution and observers catch up
      await new Promise(r => setTimeout(r, 100));
    }
    // Scroll back to the top
    window.scrollTo(0, 0);
    // Increased settling time
    await new Promise(r => setTimeout(r, 500));
  });
}

// Ensure snapshot directory exists
const snapshotDir = path.join(__dirname, '__snapshots__');


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

    test.beforeAll(() => {
    fs.mkdirSync(snapshotDir, { recursive: true });
  });

  for (const pathStr of publicPages) {
      // Generate a safe filename based on path and theme
      const baseFilename = pathStr === '/' ? 'landing' : `${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Public Page: ${pathStr}`, async ({ page }, testInfo) => {
        await page.goto(pathStr);
        await page.waitForLoadState('networkidle');
        await acceptCookieConsent(page);
        await disableAnimations(page);

        // Force the theme using classList.toggle
        await page.evaluate((t) => {
          document.documentElement.classList.toggle('dark', t === 'dark');
          document.documentElement.classList.toggle('light', t === 'light');
        }, theme);

        // Small wait to allow theme switch JS to settle
        await page.waitForTimeout(500);

        // Scroll the page to trigger all animations
        await triggerScrollAnimations(page);

        // Wait for the page to be fully settled
        await page.waitForLoadState('networkidle');
        // Wait for footer as a signal that the long page has rendered
        await page.locator('footer').first().waitFor({ state: 'visible' }).catch(() => {});


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
      await login(page, VISUAL_TEST_EMAIL, VISUAL_TEST_PASSWORD);
      await acceptCookieConsent(page);
    });

    for (const pathStr of dashboardPages) {
      const baseFilename = `dashboard-${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Dashboard Page: ${pathStr}`, async ({ page }, testInfo) => {
        await page.goto(pathStr);
        await page.waitForLoadState('networkidle');
        await disableAnimations(page);

        // Force the theme using classList.toggle
        await page.evaluate((t) => {
          document.documentElement.classList.toggle('dark', t === 'dark');
          document.documentElement.classList.toggle('light', t === 'light');
        }, theme);

        // Small wait to allow theme switch JS to settle
        await page.waitForTimeout(500);

        // Scroll the page to trigger all animations
        await triggerScrollAnimations(page);

        await page.waitForLoadState('networkidle');
        
        // Instead of a hard timeout, wait for main content or chart containers
        // This is much faster and more reliable
        await page.locator('main').waitFor({ state: 'visible' });
        // Optional: wait for charts if they exist (common in dashboards)
        await page.locator('.recharts-wrapper, canvas').first().waitFor({ state: 'visible' }).catch(() => {});


        // Capture screenshot for PostHog Visual Review
        await page.screenshot({
          path: path.join(snapshotDir, `${testInfo.project.name}-${filename}`),
          fullPage: true,
        });
      });
    }
  });
}

