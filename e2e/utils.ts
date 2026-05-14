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

  // Use domcontentloaded for faster initial load
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  // Wait for the form to be ready
  const emailInput = page.locator('#email').first();
  await expect(emailInput).toBeVisible({ timeout: 30000 });

  // Fill in credentials
  await emailInput.fill(TEST_EMAIL!);
  const passwordInput = page.locator('#password').first();
  await passwordInput.fill(TEST_PASSWORD!);

  // Ensure button is ready to receive clicks (as a indicator that JS is loaded)
  const loginBtn = page.getByRole('button', { name: /anmelden/i }).first();
  await expect(loginBtn).toBeVisible();
  
  // On some browsers (Webkit), a small delay after filling fields can help React state sync
  await page.waitForTimeout(500);
  
  // Submit via Enter key - often more reliable than clicking a potentially moving/animated button
  await passwordInput.press('Enter');

  // Wait for navigation to dashboard or check for errors
  try {
    // Wait for URL change using Playwright's built-in waitForURL for better reliability
    await page.waitForURL(url => {
      const p = url.pathname;
      const normalizedPath = p.replace(/\/$/, '') || '/';
      return ['/dashboard', '/', '/haeuser', '/wohnungen', '/mieter', '/todos', '/finanzen'].includes(normalizedPath) || p.startsWith('/subscription-locked');
    }, { timeout: 30000 });

    // Wait for a key element to appear to ensure Next.js has hydrated and the session is loaded.
    await expect(page.locator('nav, aside, h1, .subscription-lock-container').first()).toBeVisible({ timeout: 15000 });
    
    // Final check of the URL to ensure we aren't stuck on login
    if (page.url().includes('/auth/login')) {
      throw new Error(`Login failed: Still on login page. URL: ${page.url()}`);
    }
  } catch (e) {
    // If navigation failed, check if there's an error message visible in the UI
    const errorText = await getUiErrorMessage(page);
    if (errorText) {
      throw new Error(`Login failed with error: ${errorText}`);
    }

    // Check if we are still on the login page
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      // Final attempt to click the button in case Enter didn't work
      try {
        await loginBtn.click({ timeout: 2000 });
        await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 10000 });
      } catch (clickErr) {
        // Still failing
        const bodyText = await page.innerText('body').catch(() => '');
        const hasGenericError = bodyText.toLowerCase().includes('fehler') || bodyText.toLowerCase().includes('error');
        throw new Error(`Login failed: Still on login page after timeout. URL: ${currentUrl}. ${hasGenericError ? 'Possible error visible on page.' : ''}`);
      }
    }

    throw e;
  }
};

export const acceptCookieConsent = async (page: Page) => {
  const consentBtn = page.getByRole('button', { name: /Alle akzeptieren|Akzeptieren/i }).first();
  try {
    if (await consentBtn.isVisible({ timeout: 2000 })) {
      await consentBtn.click();
      await expect(consentBtn).toBeHidden({ timeout: 5000 });
    }
  } catch (e) {
    // Ignore if not found
  }
};

/**
 * Reusable helper to extract error messages from the UI (toasts, alerts, etc.)
 */
export async function getUiErrorMessage(page: Page) {
  // We check multiple common error locations and roles
  const locators = [
    page.locator('[role="alert"]'),
    page.locator('[role="status"]').filter({ hasText: /fehler|error|fehlgeschlagen|failed/i }),
    page.locator('.destructive'),
    page.locator('.text-destructive'),
    page.locator('.text-red-500'),
    page.locator('.bg-red-50'),
    page.locator('.alert'),
  ];

  for (const locator of locators) {
    try {
      const matches = await locator.filter({ hasNotText: /^$/ }).all();
      for (const match of matches) {
        if (await match.isVisible({ timeout: 500 })) {
          const text = await match.innerText();
          if (text && text.trim().length > 0) return text.trim();
        }
      }
    } catch (e) {
      // Ignore timeout/not found for individual locators
    }
  }
  return '';
}
