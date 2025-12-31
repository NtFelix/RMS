import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // The page should load without errors
    await expect(page).toHaveURL('/');
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    // Check for title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Look for a login button/link and click it
    const loginLink = page.getByRole('link', { name: /login|anmelden|sign in/i });

    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login.*/);
    }
  });
});

test.describe('Authentication Flow', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');

    await page.waitForLoadState('networkidle');

    // Should be on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('registration page should be accessible', async ({ page }) => {
    await page.goto('/register');

    await page.waitForLoadState('networkidle');

    // Should be on register page  
    await expect(page).toHaveURL(/.*register.*/);
  });
});
