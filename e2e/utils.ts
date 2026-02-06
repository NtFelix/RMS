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

  await page.goto('/auth/login', { waitUntil: 'networkidle' });

  // Wait for the form to be ready
  await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

  // Fill in credentials using IDs with form context to avoid potential duplicates
  const form = page.locator('form').first();
  await form.locator('#email').first().fill(TEST_EMAIL!);
  await form.locator('#password').first().fill(TEST_PASSWORD!);

  // Submit with a small delay to ensure React state is updated
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /anmelden/i }).first().click();

  // Wait for navigation to dashboard or check for errors
  try {
    await page.waitForURL(/\/dashboard|^\/$/, { timeout: 30000 });
  } catch (e) {
    // If navigation failed, check if there's an error message visible
    // We filter for alerts that aren't the hidden route announcer
    const errorAlert = page.locator('[role="alert"]').filter({ hasNotText: /^$/ }).first();
    
    // Check if page is still open before calling isVisible
    if (!page.isClosed()) {
      try {
        if (await errorAlert.isVisible({ timeout: 2000 })) {
          const errorText = await errorAlert.innerText();
          throw new Error(`Login failed with error: ${errorText}`);
        }
      } catch (alertError) {
        // Alert check failed, continue to other checks
      }
      
      // Check if we are still on the login page
      if (page.url().includes('/auth/login')) {
        throw new Error(`Login failed: Still on login page after timeout. URL: ${page.url()}`);
      }
    }
    
    throw e;
  }
};

export const acceptCookieConsent = async (page: Page) => {
  const consentBtn = page.getByRole('button', { name: /Alle akzeptieren|Akzeptieren/i }).first();
  if (await consentBtn.isVisible()) {
    await consentBtn.click();
    await expect(consentBtn).toBeHidden();
  }
};
