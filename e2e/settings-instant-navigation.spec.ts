import { test, expect } from '@playwright/test';

test.describe('Settings Instant Navigation', () => {
  test('unauthenticated access to settings redirects to login', async ({ page }) => {
    await page.goto('/einstellungen/profil', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
  });

  test('auth login page renders instant layout frame', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
  });
});
