import { test, expect } from '@playwright/test';
import { login, acceptCookieConsent } from './utils';

test.describe('Organisation Switcher E2E', () => {
  test('Should list organisations and switch context successfully', async ({ page, context }) => {
    // 1. Login to the application
    console.log("Logging in...");
    await login(page);
    await acceptCookieConsent(page);

    // 2. Locate User Menu trigger
    console.log("Locating user menu trigger...");
    const userMenuTrigger = page.locator('[aria-label="User menu"], [data-dropdown-trigger]').first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 15000 });
    
    // 3. Open user menu dropdown
    console.log("Opening user menu...");
    await userMenuTrigger.click();

    // 4. Assert that "Privat" and organisations list are visible
    console.log("Checking for organisation switcher items...");
    const privatItem = page.getByRole('menuitem', { name: /Privat/i }).first();
    await expect(privatItem).toBeVisible({ timeout: 5000 });

    // Wait for dropdown to render organisation items
    const orgItem = page.locator('div[role="menuitem"]').filter({ hasText: /Organisation/i }).first();
    await expect(orgItem).toBeVisible({ timeout: 10000 });

    const orgItemText = await orgItem.innerText();
    console.log(`Found organisation item: "${orgItemText.replace(/\n/g, ' ')}"`);

    // Check if it's already active or not by checking for checkmark/Check icon inside the item
    const hasCheckmark = await orgItem.locator('svg').count() > 0;
    console.log(`Active state before click: ${hasCheckmark}`);

    // If it's already active, click Privat, otherwise click the organisation
    const targetItem = hasCheckmark ? privatItem : orgItem;
    const targetName = hasCheckmark ? 'Privat' : orgItemText.trim().split('\n')[0];

    console.log(`Clicking target item: "${targetName}"...`);
    
    // We expect a page reload, so let's wait for navigation/reload
    const reloadPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 30000 });
    await targetItem.click();
    await reloadPromise;

    console.log("Page reloaded. Verifying new context...");

    // Print the cookies to see if they were set correctly
    const cookies = await context.cookies();
    console.log("Browser cookies after switch:", cookies.map(c => `${c.name}=${c.value}`));

    // 5. Open user menu again to verify the switch
    await userMenuTrigger.click();
    
    // 6. Verify that the correct item has the checkmark/active styling
    if (hasCheckmark) {
      // Switched to Privat
      await expect(privatItem.locator('svg')).toBeVisible({ timeout: 5000 });
    } else {
      // Switched to Organisation
      await expect(orgItem.locator('svg')).toBeVisible({ timeout: 5000 });
    }

    // 7. Verify the cookie is set correctly in the browser
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
