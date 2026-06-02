import { test, type Page } from '@playwright/test';
import { login, acceptCookieConsent } from '../e2e/utils';
import path from 'path';
import fs from 'fs';

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

async function triggerScrollAnimations(page: Page) {
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;

    for (let i = 0; i < scrollHeight; i += viewportHeight / 2) {
      window.scrollTo(0, i);
      await new Promise(r => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
  });
}

const snapshotDir = path.join(__dirname, '__snapshots__');

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

const pagesWithTabs: Record<string, Array<{ tabKey: string; tabText: string }>> = {
  '/finanzen': [
    { tabKey: 'finanzen', tabText: 'Finanzen' },
    { tabKey: 'uebersicht', tabText: 'Übersicht' },
  ],
  '/mieter': [
    { tabKey: 'mieter', tabText: 'Mieter' },
    { tabKey: 'uebersicht', tabText: 'Übersicht' },
  ],
  '/wohnungen': [
    { tabKey: 'wohnungen', tabText: 'Wohnungen' },
    { tabKey: 'uebersicht', tabText: 'Übersicht' },
  ],
};

const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  test.describe(`@visual Visual Review - Public Pages (${theme} mode)`, () => {
    test.use({ colorScheme: theme });

    test.beforeAll(() => {
    fs.mkdirSync(snapshotDir, { recursive: true });
  });

  for (const pathStr of publicPages) {
      const baseFilename = pathStr === '/' ? 'landing' : `${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
      const filename = `${baseFilename}-${theme}.png`;

      test(`Public Page: ${pathStr}`, async ({ page }, testInfo) => {
        await page.goto(pathStr);
        await page.waitForLoadState('networkidle');
        await acceptCookieConsent(page);
        await disableAnimations(page);

        await page.evaluate((t) => {
          document.documentElement.classList.toggle('dark', t === 'dark');
          document.documentElement.classList.toggle('light', t === 'light');
        }, theme);

        await page.waitForTimeout(500);
        await triggerScrollAnimations(page);
        await page.waitForLoadState('networkidle');
        await page.locator('footer').first().waitFor({ state: 'visible' }).catch(() => {});

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
      const tabs = pagesWithTabs[pathStr];

      if (tabs) {
        for (const tabInfo of tabs) {
          const baseFilename = `dashboard-${pathStr.replace(/^\//, '').replace(/\//g, '-')}-${tabInfo.tabKey}`;
          const filename = `${baseFilename}-${theme}.png`;

          test(`Dashboard Page: ${pathStr} - ${tabInfo.tabText}`, async ({ page }, testInfo) => {
            await page.goto(pathStr);
            await page.waitForLoadState('networkidle');
            await disableAnimations(page);

            await page.evaluate((t) => {
              document.documentElement.classList.toggle('dark', t === 'dark');
              document.documentElement.classList.toggle('light', t === 'light');
            }, theme);

            await page.locator('button').filter({ hasText: tabInfo.tabText }).first().click();
            await page.waitForTimeout(500);

            await triggerScrollAnimations(page);
            await page.waitForLoadState('networkidle');

            await page.locator('main').waitFor({ state: 'visible' });
            await page.locator('.recharts-wrapper, canvas').first().waitFor({ state: 'visible' }).catch(() => {});

            await page.screenshot({
              path: path.join(snapshotDir, `${testInfo.project.name}-${filename}`),
              fullPage: true,
            });
          });
        }
      } else {
        const baseFilename = `dashboard-${pathStr.replace(/^\//, '').replace(/\//g, '-')}`;
        const filename = `${baseFilename}-${theme}.png`;

        test(`Dashboard Page: ${pathStr}`, async ({ page }, testInfo) => {
          await page.goto(pathStr);
          await page.waitForLoadState('networkidle');
          await disableAnimations(page);

          await page.evaluate((t) => {
            document.documentElement.classList.toggle('dark', t === 'dark');
            document.documentElement.classList.toggle('light', t === 'light');
          }, theme);

          await page.waitForTimeout(500);
          await triggerScrollAnimations(page);
          await page.waitForLoadState('networkidle');

          await page.locator('main').waitFor({ state: 'visible' });
          await page.locator('.recharts-wrapper, canvas').first().waitFor({ state: 'visible' }).catch(() => {});

          await page.screenshot({
            path: path.join(snapshotDir, `${testInfo.project.name}-${filename}`),
            fullPage: true,
          });
        });
      }
    }
  });
}
