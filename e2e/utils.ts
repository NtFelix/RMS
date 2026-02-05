import { Page, expect } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_EMAIL;
export const TEST_PASSWORD = process.env.TEST_PASSWORD;

export const hasTestCredentials = () => {
  return !!TEST_EMAIL && !!TEST_PASSWORD;
};

export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const login = async (page: Page) => {
  if (!hasTestCredentials()) {
    throw new Error('Cannot log in: TEST_EMAIL or TEST_PASSWORD not set');
  }

  await page.goto('/auth/login');

  // Wait for the form to be ready
  await expect(page.locator('form')).toBeVisible();

  // Fill in credentials using IDs with form context to avoid potential duplicates
  const form = page.locator('form');
  await form.locator('#email').fill(TEST_EMAIL!);
  await form.locator('#password').fill(TEST_PASSWORD!);

  // Submit
  await page.getByRole('button', { name: /anmelden/i }).click();

  // Wait for navigation to dashboard or check for errors
  try {
    await expect(page).toHaveURL(/\/dashboard|^\/$/, { timeout: 15000 });
  } catch (e) {
    // If navigation failed, check if there's an error message visible
    const errorAlert = page.locator('[role="alert"]');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.innerText();
      throw new Error(`Login failed with error: ${errorText}`);
    }
    
    // Check if we are still on the login page
    if (page.url().includes('/auth/login')) {
       throw new Error(`Login failed: Still on login page after timeout. URL: ${page.url()}`);
    }
    
    throw e;
  }
};
