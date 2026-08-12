import { test, expect } from '@playwright/test';

test.describe('Settings Pages PPR & Navigation', () => {

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
