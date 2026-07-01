import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, generateRandomString, acceptCookieConsent, getUiErrorMessage } from './utils';


import { Page, Locator } from '@playwright/test';

async function selectComboboxOption(page: Page, modal: Locator, optionName: string, comboboxLocator: string = '[role="combobox"]') {
  const maxRetries = 3
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const cmb = modal.locator(comboboxLocator).first()
    // Use evaluate click to bypass overlay interception (WebKit) and viewport checks (Chromium)
    await cmb.evaluate(el => (el as HTMLElement).click())
    await page.waitForTimeout(300)

    const searchbox = page.locator('[data-combobox-dropdown]').getByRole('searchbox').first()
    if (!(await searchbox.isVisible({ timeout: 5000 }).catch(() => false))) {
      continue
    }

    await searchbox.fill(optionName)
    await page.waitForTimeout(500)

    const option = page.getByRole('option', { name: optionName }).first()
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.evaluate(el => (el as HTMLElement).click())
      // Wait for combobox to close — confirms the value was committed
      await page.waitForTimeout(500)
      const dropdown = page.locator('[data-combobox-dropdown]')
      if (!(await dropdown.isVisible({ timeout: 2000 }).catch(() => false))) {
        return
      }
    }

    // Close combobox if still open before retry (only press Escape when
    // dropdown is visible — pressing it when already closed would close the parent Dialog)
    const dropdown = page.locator('[data-combobox-dropdown]')
    if (await dropdown.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
  }
  throw new Error(`Option "${optionName}" not found after ${maxRetries} attempts`)
}

async function verifyEntityInTable(page: Page, name: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
      return
    } catch {
      if (attempt < maxRetries - 1) {
        // Page might have stale data — reload and wait for hydration
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1000)
      }
    }
  }
  throw new Error(`Entity "${name}" not found in table after ${maxRetries} attempts`)
}

async function safeNavigate(page: Page, url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' = 'domcontentloaded') {
  let retries = 3;
  while (retries > 0) {
    try {
      await page.goto(url, { waitUntil });
      return;
    } catch (e: any) {
      if (e.message.includes('interrupted') && retries > 1) {
        retries--;
        await page.waitForTimeout(500);
      } else {
        throw e;
      }
    }
  }
}

test.describe('Business Logic Flows', () => {
  // Use serial mode because we are creating dependencies (House -> Apt -> Tenant)
  test.describe.configure({ mode: 'serial' });

  const randomId = generateRandomString(6);
  const houseName = `E2E House ${randomId}`;
  const aptName = `E2E Apt ${randomId}`;
  const tenantName = `E2E Tenant ${randomId}`;

  test.beforeAll(async () => {
    if (!hasTestCredentials()) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page }) => {
    if (!hasTestCredentials()) {
      test.skip();
    }
    // In serial mode, each test gets a fresh page context, so we need to log in each time
    await login(page);
    await acceptCookieConsent(page);
  });

  test('Create a House', async ({ page }) => {
    await safeNavigate(page, '/haeuser');

    // Wait for the page content to fully load (look for a key element)
    await expect(page.getByText('Hausverwaltung').first()).toBeAttached({ timeout: 15000 });
    await page.waitForTimeout(500); // Short wait for React hydration

    // Open modal - button shows "Hinzufügen" on mobile, "Haus hinzufügen" on desktop
    const createBtn = page.locator('#create-object-btn');
    const addBtn = page.getByRole('button', { name: /Haus hinzufügen|Hinzufügen/i });

    // Wait for button to be present in DOM first
    await expect(createBtn.or(addBtn)).toBeAttached({ timeout: 15000 });

    if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createBtn.click();
    } else if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      // Final fallback
      const fallbackBtn = page.locator('button').filter({ hasText: /hinzufügen/i }).first();
      await fallbackBtn.click();
    }

    const modal = page.locator('#house-form-container, [role="dialog"]').filter({ has: page.locator('#name') }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill form using IDs
    await page.fill('#name', houseName);
    await page.fill('#strasse', 'Teststr. 1');
    await page.fill('#ort', 'Test City');

    // Manual Size
    // Checkbox ID is automaticSize
    const autoSizeCheckbox = page.locator('#automaticSize');
    if (await autoSizeCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isChecked = await autoSizeCheckbox.isChecked();
      if (isChecked) {
        await autoSizeCheckbox.click();
        await page.waitForTimeout(500); // Wait for manual size input to appear
      }
    }

    // Wait for manual size input to be enabled/visible if needed
    await page.fill('#manualGroesse', '150');

    // Submit
    await page.getByRole('button', { name: /anlegen|speichern|aktualisieren/i }).click();

    // Wait for modal to close
    try {
      await expect(modal).toBeHidden({ timeout: 10000 });
    } catch (e) {
      const errorText = await getUiErrorMessage(page);
      if (errorText) {
        throw new Error(`Failed to create entity. Error shown in UI: ${errorText}`);
      }
      throw e;
    }
    await page.waitForTimeout(500);

    // Verify in table
    await expect(page.getByText(houseName).first()).toBeVisible({ timeout: 10000 });
  });

  test('Create an Apartment linked to the House', async ({ page }) => {
    await safeNavigate(page, '/wohnungen');

    // Wait for the page content to fully load (card with title)
    await expect(page.getByText('Wohnungsverwaltung').first()).toBeAttached({ timeout: 15000 });
    await page.waitForTimeout(500); // Short wait for React hydration

    // Open modal - button shows "Hinzufügen" on mobile, "Wohnung hinzufügen" on desktop
    // Try the ID selector first for reliability, then fallback to role
    const createBtn = page.locator('#create-unit-btn');
    const addBtn = page.getByRole('button', { name: /Wohnung hinzufügen|Hinzufügen/i });

    // Wait for button to be present in DOM first
    await expect(createBtn.or(addBtn)).toBeVisible({ timeout: 15000 });

    if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Wait for it to be enabled (might be disabled while loading plan details)
      await expect(createBtn).toBeEnabled({ timeout: 15000 });
      await createBtn.click();
    } else if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(addBtn).toBeEnabled({ timeout: 15000 });
      await addBtn.click();
    } else {
      // Final fallback: find any button with the add apartment text
      const fallbackBtn = page.locator('button').filter({ hasText: /hinzufügen/i }).first();
      await expect(fallbackBtn).toBeEnabled({ timeout: 15000 });
      await fallbackBtn.click();
    }

    const modal = page.locator('[role="dialog"]').filter({ has: page.locator('#miete') }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill form using IDs
    await page.fill('#name', aptName);
    await page.fill('#groesse', '75');
    await page.fill('#miete', '1200');

    // Select House (Combobox)
    await selectComboboxOption(page, modal, houseName);

    // Submit
    const submitBtn = page.getByRole('button', { name: /Wohnung erstellen|Speichern/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Wait for modal to close with better error reporting
    try {
      await expect(modal).not.toBeVisible({ timeout: 15000 });
    } catch (e) {
      // Check for error messages in the modal or page
      const errorText = await getUiErrorMessage(page);
      if (errorText) {
        throw new Error(`Failed to create entity. Error shown in UI: ${errorText}`);
      }
      throw e;
    }
    await page.waitForTimeout(500);

    // Verify
    await verifyEntityInTable(page, aptName);
  });

  test('Create a Tenant linked to the Apartment', async ({ page }) => {
    await safeNavigate(page, '/mieter');

    // Wait for the page content to fully load (look for a key element)
    await expect(page.getByText('Mieterverwaltung').first()).toBeAttached({ timeout: 15000 });


    // Open modal - button shows "Hinzufügen" on mobile, "Mieter hinzufügen" on desktop
    const createBtn = page.locator('#add-tenant-btn');
    const addBtn = page.getByRole('button', { name: /Mieter hinzufügen|Hinzufügen/i });

    // Wait for button to be present in DOM first
    await expect(createBtn.or(addBtn)).toBeVisible({ timeout: 15000 });

    if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createBtn.click();
    } else if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      // Final fallback
      const fallbackBtn = page.locator('button').filter({ hasText: /hinzufügen/i }).first();
      await fallbackBtn.click();
    }

    // Handle Dropdown Menu if present (New UI has import option)
    const manualAddOption = page.getByRole('menuitem', { name: /Manuell hinzufügen/i });
    // Wait briefly for dropdown animation
    if (await manualAddOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await manualAddOption.click();
    }

    const modal = page.locator('[role="dialog"]').filter({ has: page.locator('#einzug') }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill form using IDs
    await page.fill('#name', tenantName);
    await page.waitForTimeout(300);

    // Select Apartment (CustomCombobox with id="wohnung_id")
    await selectComboboxOption(page, modal, aptName, '#wohnung_id');

    // Date - try to fill the date input
    const dateInput = page.getByPlaceholder('TT.MM.JJJJ').first();
    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateInput.fill('01.01.2024');
    } else {
      // Try to find and fill by ID
      const dateById = page.locator('#einzug');
      if (await dateById.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dateById.fill('01.01.2024');
      }
    }

    await page.fill('#email', 'test@example.com');
    await page.waitForTimeout(300);

    // Submit
    const submitBtn = page.getByRole('button', { name: /Speichern/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Wait for modal to close
    try {
      await expect(modal).toBeHidden({ timeout: 10000 });
    } catch (e) {
      const errorText = await getUiErrorMessage(page);
      if (errorText) {
        throw new Error(`Failed to create entity. Error shown in UI: ${errorText}`);
      }
      throw e;
    }
    await page.waitForTimeout(500);

    // Verify
    await verifyEntityInTable(page, tenantName);
  });

  test.afterAll(async ({ browser }) => {
    if (!hasTestCredentials()) return;

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await login(page);
      await acceptCookieConsent(page);

      console.log('[Cleanup] Calling E2E cleanup API...');
      const response = await page.request.post('/api/e2e/cleanup');
      const result = await response.json();

      if (response.ok()) {
        console.log(`[Cleanup] Deleted: ${result.houses} houses, ${result.apartments} apartments, ${result.tenants} tenants`);
      } else {
        console.error(`[Cleanup] API error:`, result.error);
      }
    } catch (error) {
      console.error('[Cleanup] Error:', error);
    } finally {
      await page.close();
      await context.close();
    }
  });
});
