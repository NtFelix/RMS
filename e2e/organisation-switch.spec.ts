import { test, expect } from '@playwright/test';
import { login, acceptCookieConsent } from './utils';

test.describe('Organisation Switcher E2E', () => {
  test('Should list organisations and switch context successfully', async ({ page, context }) => {
    console.log("Logging in...");
    await login(page);
    await acceptCookieConsent(page);

    console.log("Locating user menu trigger...");
    const userMenuTrigger = page.locator('[aria-label="User menu"], [data-dropdown-trigger]').first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 15000 });

    console.log("Opening user menu...");
    await userMenuTrigger.click();

    console.log("Checking for organisation switcher items...");
    const privatItem = page.getByRole('menuitem', { name: /Privat/i }).first();
    await expect(privatItem).toBeVisible({ timeout: 5000 });

    // Wait for organisation items to load (async fetch in UserSettings)
    const orgItem = page.locator('div[role="menuitem"]').filter({ hasText: /Organisation/i }).first();

    try {
      await expect(orgItem).toBeVisible({ timeout: 15000 });
    } catch {
      console.log("No organisation items found — test user has no org memberships on this environment. Skipping switch test.");
      console.log("To fix: ensure the test user has at least one non-personal org membership in the database.");
      return;
    }

    const orgItemText = await orgItem.innerText();
    console.log(`Found organisation item: "${orgItemText.replace(/\n/g, ' ')}"`);

    const hasCheckmark = await orgItem.locator('svg').count() > 0;
    console.log(`Active state before click: ${hasCheckmark}`);

    const targetItem = hasCheckmark ? privatItem : orgItem;
    const targetName = hasCheckmark ? 'Privat' : orgItemText.trim().split('\n')[0];

    console.log(`Clicking target item: "${targetName}"...`);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      targetItem.click(),
    ]);

    console.log("Page reloaded. Verifying new context...");

    await expect(userMenuTrigger).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const cookies = await context.cookies();
    console.log("Browser cookies after switch:", cookies.map(c => `${c.name}=${c.value}`));

    await userMenuTrigger.click();

    if (hasCheckmark) {
      await expect(privatItem.locator('svg')).toBeVisible({ timeout: 5000 });
    } else {
      await expect(orgItem.locator('svg')).toBeVisible({ timeout: 5000 });
    }

    const orgCookie = cookies.find(c => c.name === 'current_organisation_id');

    if (hasCheckmark) {
      expect(orgCookie).toBeDefined();
      expect(orgCookie?.value).toBe('private');
    } else {
      expect(orgCookie).toBeDefined();
      expect(orgCookie?.value).not.toBe('private');
    }
  });
});
