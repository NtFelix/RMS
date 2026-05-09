import { test, expect } from '@playwright/test';
import { login, acceptCookieConsent } from '../e2e/utils';

test.describe('@visual Visual Review', () => {
  test('Landing Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await acceptCookieConsent(page);
    await expect(page).toHaveScreenshot('landing.png', {
      fullPage: true,
      threshold: 0.02,
    });
  });

  test('Dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await acceptCookieConsent(page);
    // Give it a moment to render charts etc
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('dashboard.png', {
      threshold: 0.02,
    });
  });
});
