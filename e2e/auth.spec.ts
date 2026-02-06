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
    // It is in a sidebar user menu (UserSettings component).
    
    // The UserSettings component has aria-label="User menu" on the trigger div
    // CustomDropdown wraps it and adds data-dropdown-trigger
    const userMenuTrigger = page.locator('[aria-label="User menu"], [data-dropdown-trigger]').first();
    
    await expect(userMenuTrigger).toBeVisible({ timeout: 10000 });
    await userMenuTrigger.click();

    // Now look for logout button in the dropdown
    // Radix UI DropdownMenu uses role="menuitem"
    const logoutBtn = page.getByRole('menuitem', { name: /abmelden|logout/i }).first();
    const logoutBtnAlt = page.locator('div[role="menuitem"]').filter({ hasText: /abmelden|logout/i }).first();

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else if (await logoutBtnAlt.isVisible()) {
      await logoutBtnAlt.click();
    } else {
      console.log('Could not find logout button in dropdown');
      const dropdownContent = page.locator('[role="menu"], .dropdown-content, .popover').first();
      if (await dropdownContent.isVisible()) {
          console.log('Dropdown content is visible, but logout button not found by role/name');
      }
      await page.screenshot({ path: 'logout-failure.png' });
      // Fallback: try clicking anything with logout text
      await page.getByText(/abmelden|logout/i).last().click({ timeout: 5000 }).catch(() => {});
    }

    // After logout, should be redirected to login or home
    // UserSettings uses window.location.href = '/'
    // We check for URL ending in /auth/login or just / (root)
    await expect(page).toHaveURL(/(\/auth\/login$)|(\/$)/, { timeout: 15000 });
  });
});
