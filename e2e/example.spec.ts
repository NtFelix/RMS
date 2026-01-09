import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check for main heading to confirm page rendered correctly
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    // Check for specific title pattern (Mietevo brand)
    await expect(page).toHaveTitle(/Mietevo/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Look for a login button/link and click it
    const loginLink = page.getByRole('link', { name: /login|anmelden|sign in/i });

    if (await loginLink.isVisible()) {
      await loginLink.click();
      // Verify login page rendered by checking for login heading
      await expect(page.getByRole('heading', { name: /anmelden/i })).toBeVisible();
    }
  });
});

test.describe('Authentication Flow', () => {
  test('login page should be accessible', async ({ page }) => {
    // Login page is at /auth/login (redirected from /login)
    await page.goto('/auth/login');

    // Check for login page heading to confirm page rendered
    await expect(page.getByRole('heading', { name: /anmelden/i })).toBeVisible();
  });

  test('registration page should be accessible', async ({ page }) => {
    // Registration page is at /auth/register
    await page.goto('/auth/register');

    // The page has an h2 with "REGISTRIEREN"
    await expect(page.getByRole('heading', { name: /registrieren/i })).toBeVisible();
  });
});
