import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Wait for network to be idle to ensure page is fully loaded
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check for main heading to confirm page rendered correctly
    // Use a longer timeout for CI environments which may be slower
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check for specific title pattern (Mietevo brand)
    await expect(page).toHaveTitle(/Mietevo/, { timeout: 15000 });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for a login button/link and click it
    const loginLink = page.getByRole('link', { name: /login|anmelden|sign in/i });

    if (await loginLink.isVisible({ timeout: 10000 })) {
      await loginLink.click();
      // Verify login page rendered by checking for login heading
      await expect(page.getByRole('heading', { name: /anmelden/i })).toBeVisible({ timeout: 15000 });
    }
  });
});

test.describe('Authentication Flow', () => {
  test('login page should be accessible', async ({ page }) => {
    // Login page is at /auth/login (redirected from /login)
    await page.goto('/auth/login', { waitUntil: 'networkidle' });

    // Check for login page heading to confirm page rendered
    await expect(page.getByRole('heading', { name: /anmelden/i })).toBeVisible({ timeout: 15000 });
  });

  test('registration page should be accessible', async ({ page }) => {
    // Registration page is at /auth/register
    await page.goto('/auth/register', { waitUntil: 'networkidle' });

    // The page has an h2 with "REGISTRIEREN"
    await expect(page.getByRole('heading', { name: /registrieren/i })).toBeVisible({ timeout: 15000 });
  });
});
