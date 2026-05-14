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

  // Monitor browser console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  // Monitor request failures
  page.on('requestfailed', request => {
    console.log(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Monitor response errors (4xx, 500)
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[Response Error] ${response.status()} ${response.url()}`);
    }
  });

  // Use domcontentloaded for faster initial load
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  // Wait for the form to be ready
  const emailInput = page.locator('#email').first();
  await expect(emailInput).toBeVisible({ timeout: 30000 });

  // Fill in credentials
  await emailInput.fill(TEST_EMAIL!, { timeout: 10000 });
  const passwordInput = page.locator('#password').first();
  await passwordInput.fill(TEST_PASSWORD!, { timeout: 10000 });

  // Ensure button is ready to receive clicks
  const loginBtn = page.getByRole('button', { name: /anmelden/i }).first();
  await expect(loginBtn).toBeVisible({ timeout: 10000 });
  
  // On some browsers (Webkit), a small delay after filling fields can help React state sync
  await page.waitForTimeout(1000);
  
  console.log('[Login] Attempting submission via Enter key...');
  await passwordInput.press('Enter');

  // Wait for navigation to dashboard or check for errors
  try {
    // Wait for URL change using a more flexible approach
    // We use a longer timeout (45s) for Webkit stability in CI
    await page.waitForURL(url => {
      const p = url.pathname;
      const normalizedPath = p.replace(/\/$/, '') || '/';
      const targets = ['/dashboard', '/', '/haeuser', '/wohnungen', '/mieter', '/todos', '/finanzen', '/objekte', '/einstellungen'];
      const isTarget = targets.includes(normalizedPath) || p.startsWith('/subscription-locked');
      if (isTarget) console.log(`[Login] Target URL reached: ${url.href}`);
      return isTarget;
    }, { timeout: 45000 });

    // Wait for a key element to appear to ensure Next.js has hydrated and the session is loaded.
    // We check for elements common to dashboard/management pages.
    const keyElement = page.locator('nav, aside, h1, .subscription-lock-container, main').first();
    await expect(keyElement).toBeVisible({ timeout: 20000 });
    
    // Final check of the URL
    if (page.url().includes('/auth/login')) {
      throw new Error(`Login failed: Still on login page. URL: ${page.url()}`);
    }
    
    console.log(`[Login] Successfully navigated to: ${page.url()}`);
  } catch (e) {
    console.log(`[Login] Navigation wait failed or timed out. Current URL: ${page.url()}`);
    
    // If we are still on login page, try clicking the button as a second attempt
    if (page.url().includes('/auth/login')) {
      console.log('[Login] Still on login page, attempting click on submit button...');
      await loginBtn.click({ force: true }).catch(() => {});
      
      try {
        await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 15000 });
        console.log(`[Login] Redirected after secondary click to: ${page.url()}`);
      } catch (secondaryError) {
        // Still failing, check for error messages
        const errorText = await getUiErrorMessage(page);
        if (errorText) {
          throw new Error(`Login failed with error: ${errorText}`);
        }
        
        const bodyText = await page.innerText('body').catch(() => '');
        const hasGenericError = bodyText.toLowerCase().includes('fehler') || bodyText.toLowerCase().includes('error');
        throw new Error(`Login failed: Still on login page after retries. URL: ${page.url()}. ${hasGenericError ? 'Possible error visible on page.' : ''}`);
      }
    } else {
      // It did navigate but maybe waitForURL or wait for element failed
      const currentUrl = page.url();
      console.log(`[Login] Navigation happened but test failed. Final URL: ${currentUrl}`);
      throw e;
    }
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
