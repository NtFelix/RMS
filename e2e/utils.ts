import { Page, Response, expect } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_EMAIL;
export const TEST_PASSWORD = process.env.TEST_PASSWORD;

export const VISUAL_TEST_EMAIL = process.env.VISUAL_TEST_EMAIL || process.env.TEST_EMAIL;
export const VISUAL_TEST_PASSWORD = process.env.VISUAL_TEST_PASSWORD || process.env.TEST_PASSWORD;

export const hasTestCredentials = (email = TEST_EMAIL, password = TEST_PASSWORD) => {
  return !!email && !!password;
};

export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Testdaten tragen einen Zeitstempel (Sekunden): "E2E <Art> <Sekunden> <Zufall>". Die drei Browser-Jobs laufen
// parallel auf demselben Testaccount; so räumt der Cleanup nur Reste älterer Läufe weg, nicht die laufenden
// Daten der anderen Jobs. Als Rückstand gilt außerdem das alte Format ohne Zeitstempel ("E2E Apt <6 Zeichen>");
// alle anderen Namen mit "E2E " fasst der Cleanup nicht an. Die Frist liegt über dem Job-Timeout (30 min),
// damit auch ein sehr langer Lauf seine Daten behält.
const E2E_STALE_AFTER_MS = 60 * 60 * 1000;

export const makeE2ERandomId = () => `${Math.floor(Date.now() / 1000)} ${generateRandomString(6)}`;

export const isStaleE2EName = (name: string): boolean => {
  if (/^E2E (?:House|Apt|Tenant) [A-Za-z0-9]{6}$/.test(name)) return true;
  const match = name.match(/^E2E (?:House|Apt|Tenant) (\d{10}) [A-Za-z0-9]{6}$/);
  return !!match && Date.now() - Number(match[1]) * 1000 > E2E_STALE_AFTER_MS;
};

export const login = async (
  page: Page,
  email = TEST_EMAIL,
  password = TEST_PASSWORD
) => {
  if (!hasTestCredentials(email, password)) {
    throw new Error('Cannot log in: TEST_EMAIL or TEST_PASSWORD not set');
  }

  // Cookie-Banner vorab abwählen: er rendert erst nach einem useEffect und kann sonst Klicks überdecken
  await skipCookieBanner(page);

  const loginStartedAt = Date.now();
  await page.goto('/auth/login', { waitUntil: 'load' });

  // Wait for Next.js hydration to be complete.
  // The social login buttons are only rendered client-side after component mount/hydration.
  const socialBtn = page.getByRole('button', { name: /Google|Microsoft/i }).first();
  await expect(socialBtn).toBeVisible({ timeout: 15000 });

  // Wait for the form to be ready
  await expect(page.locator('form')).toBeVisible({ timeout: 30000 });

  // Fill in credentials using IDs with form context to avoid potential duplicates
  const form = page.locator('form').first();
  await form.locator('#email').first().fill(email!);
  await form.locator('#password').first().fill(password!);

  // Ensure button is ready to receive clicks
  const loginBtn = page.getByRole('button', { name: /anmelden/i }).first();
  await expect(loginBtn).toBeEnabled();

  // Antwort des Auth-Endpunkts mitschneiden, um "Submit hängt" von "Redirect zurück zum Login" zu unterscheiden
  const tokenResponse = page
    .waitForResponse(r => /\/auth\/v1\/token/.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 })
    .catch(() => null);
  await loginBtn.click();

  // Wait for navigation to dashboard or check for errors
  try {
    // Wait for URL change using Playwright's built-in waitForURL for better reliability
    await page.waitForURL(url => {
      const p = url.pathname;
      return p === '/dashboard' || p === '/' || p === '/haeuser' || p.startsWith('/subscription-locked');
    }, { timeout: 30000 });

    // Wait for a key element to appear to ensure Next.js has hydrated and the session is loaded.
    // We check for elements common to dashboard/management pages OR the subscription lock page.
    await expect(page.locator('nav, aside, h1, .subscription-lock-container').first()).toBeVisible({ timeout: 15000 });
    
    // Final check of the URL to ensure we aren't stuck on login due to some silent failure
    if (page.url().includes('/auth/login')) {
      throw new Error(`Login failed: Still on login page. URL: ${page.url()}`);
    }
  } catch (e) {
    // If navigation failed, check if there's an error message visible
    // We filter for alerts that aren't the hidden route announcer
    const errorAlert = page.locator('[role="alert"]').filter({ hasNotText: /^$/ }).first();

    // Check if page is still open before calling isVisible
    if (!page.isClosed()) {
      let alertText = '';
      try {
        if (await errorAlert.isVisible({ timeout: 2000 })) {
          alertText = await errorAlert.innerText();
        }
      } catch {
        // Alert check failed, continue to other checks
      }
      // Außerhalb des try werfen, sonst verschluckt das catch den Alert-Text
      if (alertText) {
        throw new Error(`Login failed with error: ${alertText} | ${await describeLoginState(page, tokenResponse, loginStartedAt)}`);
      }

      // Final check of the URL
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        throw new Error(`Login failed: Still on login page after timeout. URL: ${currentUrl} | ${await describeLoginState(page, tokenResponse, loginStartedAt)}`);
      }

      // If we are on some other page (like /subscription-locked), report it
      if (currentUrl.includes('/subscription-locked')) {
        throw new Error(`Login failed: Redirected to subscription-locked page. URL: ${currentUrl}`);
      }
    }

    throw e;
  }
};

/**
 * Setzt die Cookie-Einwilligung (nur notwendige) vor dem ersten Seitenaufruf, damit der Banner gar nicht erscheint.
 * Schlüssel siehe components/common/cookie-consent-banner.tsx. Für Contexts aus dem page-Fixture setzt
 * playwright.config.ts (use.storageState) denselben Wert; dieses Init-Script deckt manuell erzeugte Contexts ab
 * (z. B. browser.newContext() im Cleanup), die die use-Optionen nicht erben.
 */
const skipCookieBanner = async (page: Page) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('cookieConsent', 'necessary');
    } catch {
      // localStorage nicht verfügbar: acceptCookieConsent() fängt den Banner dann ab
    }
  });
};

/**
 * Fallback, falls der Banner trotzdem erscheint (z. B. in einem Context ohne Init-Script).
 */
export const acceptCookieConsent = async (page: Page) => {
  const consentBtn = page.getByRole('button', { name: /Alle akzeptieren|Akzeptieren/i }).first();
  // login() unterdrückt den Banner; hier nur ein sofortiger Check, kein Warten
  if (await consentBtn.isVisible()) {
    await consentBtn.click();
    await expect(consentBtn).toBeHidden();
  }
};

/**
 * Der App-Logout ruft signOut() ohne Scope auf (Supabase-Default: global) und widerruft damit ALLE Sessions
 * des Testaccounts, auch die der parallel laufenden Browser-Jobs. Für Logout-Tests den Scope auf "local" drücken.
 * Gibt einen Zähler der umgeschriebenen Requests zurück: bleibt er bei 0, lief der Logout nicht über den Browser
 * (z. B. nach einer Umstellung auf eine Server Action) und der Scope wurde NICHT begrenzt.
 */
export const limitLogoutToCurrentSession = async (page: Page) => {
  let rewritten = 0;
  await page.route(/\/auth\/v1\/logout/, route => {
    const url = new URL(route.request().url());
    url.searchParams.set('scope', 'local');
    rewritten++;
    return route.continue({ url: url.toString() });
  });
  return () => rewritten;
};

async function describeLoginState(page: Page, tokenResponse: Promise<Response | null>, startedAt: number) {
  const response = await tokenResponse;
  const parts: string[] = [
    `elapsed=${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
    `tokenResponse=${response ? response.status() : 'none within 30s'}`,
  ];
  try {
    // Nur Cookie-Namen, niemals Werte
    const cookieNames = (await page.context().cookies()).map(c => c.name).filter(n => n.startsWith('sb-'));
    parts.push(`sessionCookies=${cookieNames.length ? cookieNames.join(',') : 'none'}`);
  } catch {
    // Context bereits geschlossen
  }
  return parts.join(' ');
}

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
  ];

  for (const locator of locators) {
    try {
      const first = locator.filter({ hasNotText: /^$/ }).first();
      if (await first.isVisible({ timeout: 1000 })) {
        const text = await first.innerText();
        if (text && text.trim().length > 0) return text.trim();
      }
    } catch (e) {
      // Ignore timeout/not found for individual locators
    }
  }
  return '';
}
