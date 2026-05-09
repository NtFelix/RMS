import { test, expect } from '@playwright/test';

test.describe('@visual Visual Review', () => {
  test('Landing Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('landing.png', {
      fullPage: true,
      threshold: 0.02,
    });
  });

  test('Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', {
      threshold: 0.02,
    });
  });
});
