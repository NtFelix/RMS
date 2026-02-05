import { test, expect } from '@playwright/test';
import { login, hasTestCredentials } from './utils';

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

    // Verify we are on the dashboard
    // Check for common dashboard elements
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Häuser')).toBeVisible();
  });

  test('Should be able to log out', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Skipping logout test: No credentials provided');

    await login(page);

    // Try to find logout button.
    // It might be in a sidebar or user menu.
    // Based on typical sidebar navigation:

    // Check for a visible logout button first (e.g. in sidebar bottom)
    const logoutBtn = page.getByText(/abmelden|logout/i);

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // If not visible, check for user menu trigger
      // Try finding an avatar or user icon button
      const userMenuTrigger = page.locator('button').filter({ has: page.locator('svg.lucide-user, .avatar') }).first();

      if (await userMenuTrigger.isVisible()) {
        await userMenuTrigger.click();
        await expect(page.getByText(/abmelden|logout/i)).toBeVisible();
        await page.getByText(/abmelden|logout/i).click();
      } else {
        console.log('Could not find logout button or user menu trigger');
      }
    }

    // After logout, should be redirected to login or home
    await expect(page).toHaveURL(/\/auth\/login|^\/$/, { timeout: 15000 });
  });
});
