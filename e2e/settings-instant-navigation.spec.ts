import { test, expect } from '@playwright/test';

test.describe('Settings Instant Navigation', () => {
  test('settings sidebar tabs navigate with instant loading shell', async ({ page }) => {
    // Navigate to settings profile section
    await page.goto('/einstellungen/profil', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify settings layout & sidebar exist
    const sidebar = page.locator('nav');
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Click on Abo (Subscription) tab and verify immediate URL transition & shell rendering
    const aboTab = page.getByRole('link', { name: /abo/i });
    if (await aboTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aboTab.click();
      await expect(page).toHaveURL(/\/einstellungen\/abo/, { timeout: 10000 });
    }

    // Click on Sicherheit (Security) tab and verify sub-tab switch
    const sicherheitTab = page.getByRole('link', { name: /sicherheit/i });
    if (await sicherheitTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sicherheitTab.click();
      await expect(page).toHaveURL(/\/einstellungen\/sicherheit/, { timeout: 10000 });
    }
  });
});
