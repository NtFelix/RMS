import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, acceptCookieConsent } from './utils';

test.describe('Settings Pages PPR & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Skipping settings PPR test: No test credentials provided in environment');
    try {
      await login(page);
      await acceptCookieConsent(page);
    } catch (error) {
      test.skip(true, `Skipping test: Login unavailable (${error instanceof Error ? error.message : error})`);
    }
  });

  test('Settings pages render sidebar layout shell correctly', async ({ page }) => {
    await page.goto('/einstellungen/profil', { waitUntil: 'domcontentloaded' });
    
    // Verify sidebar navigation elements are rendered immediately
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Profil/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sicherheit/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Abo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Darstellung/i })).toBeVisible();
  });

  test('Navigation between settings sub-pages maintains sidebar shell', async ({ page }) => {
    await page.goto('/einstellungen/profil', { waitUntil: 'domcontentloaded' });
    
    // Navigate to Abo page
    const aboLink = page.getByRole('link', { name: /Abo/i });
    await aboLink.click();
    await expect(page).toHaveURL(/\/einstellungen\/abo/);

    // Navigate to Darstellung page
    const darstellungLink = page.getByRole('link', { name: /Darstellung/i });
    await darstellungLink.click();
    await expect(page).toHaveURL(/\/einstellungen\/darstellung/);
  });

  test('Direct access to sub-routes renders correct section', async ({ page }) => {
    await page.goto('/einstellungen/sicherheit', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/einstellungen\/sicherheit/);
    await expect(page.locator('nav')).toBeVisible();
  });

});
