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

  // Fill in credentials using IDs which are often more stable than labels if labels have complex DOM
  await page.fill('#email', TEST_EMAIL!);
  await page.fill('#password', TEST_PASSWORD!);

  // Submit
  await page.getByRole('button', { name: /anmelden/i }).click();

  // Wait for navigation to dashboard
  await expect(page).toHaveURL(/\/dashboard|^\/$/, { timeout: 30000 });
};
