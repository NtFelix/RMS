import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, acceptCookieConsent } from './utils';

test.describe('Authentication Flows', () => {

  test('Login page should render correctly', async ({ page }) => {
    await page.goto('/auth/login');
    // Wait for animation/loading
    await expect(page.getByRole('heading', { name: /ANMELDEN/i })).toBeVisible({ timeout: 10000 });

    // Check inputs by ID as fallback or direct label, scoped to the form
    const form = page.locator('form').first();
    await expect(form.locator('#email').first()).toBeVisible();
    await expect(form.locator('#password').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /anmelden/i }).first()).toBeVisible();
  });

  test('Registration page should render correctly', async ({ page }) => {
    await page.goto('/auth/register');
    // Wait for potential animation/loading
    await expect(page.getByRole('heading', { name: /REGISTRIEREN/i })).toBeVisible({ timeout: 10000 });

    const form = page.locator('form').first();
    await expect(form.locator('#email').first()).toBeVisible();
    await expect(form.locator('#password').first()).toBeVisible();
    // Register button text might vary
    await expect(page.getByRole('button', { name: /registrieren|konto erstellen|kostenlos starten/i }).first()).toBeVisible();
  });

  // Conditional test: Only runs if credentials are provided
  test('Should be able to log in with valid credentials', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Skipping login test: No credentials provided in environment variables');

    await login(page);
    await acceptCookieConsent(page);

    // Verify we are on the dashboard
    // Check for common dashboard elements using more specific locators
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Häuser|Objekte/i }).first()).toBeVisible();
  });

  test('Should be able to log out', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Skipping logout test: No credentials provided');

    await login(page);
    await acceptCookieConsent(page);
    await page.waitForTimeout(1000);

    // Try to find logout button.
    // It might be in a sidebar or user menu.
    
    // First, try to open user menu if it exists (using aria-label from UserSettings component)
    const userMenuTrigger = page.getByLabel('User menu').first();
    const fallbackTrigger = page.locator('button').filter({ has: page.locator('svg.lucide-user, .avatar, svg.lucide-settings') }).first();
    
    if (await userMenuTrigger.isVisible()) {
        await userMenuTrigger.click();
    } else if (await fallbackTrigger.isVisible()) {
        await fallbackTrigger.click();
    }

    // Now look for logout button in the dropdown
    const logoutBtn = page.getByRole('menuitem', { name: /abmelden|logout/i }).first();
    const logoutBtnAlt = page.getByRole('button', { name: /abmelden|logout/i }).first();
    const logoutLink = page.getByRole('link', { name: /abmelden|logout/i }).first();
    const logoutText = page.getByText(/abmelden|logout/i).first();

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else if (await logoutBtnAlt.isVisible()) {
      await logoutBtnAlt.click();
    } else if (await logoutLink.isVisible()) {
      await logoutLink.click();
    } else if (await logoutText.isVisible()) {
      await logoutText.click();
    } else {
      console.log('Could not find logout button or user menu trigger');
      await page.screenshot({ path: 'logout-failure.png' });
    }

    // After logout, should be redirected to login or home
    await expect(page).toHaveURL(/\/auth\/login|^\/$/, { timeout: 15000 });
  });
});
