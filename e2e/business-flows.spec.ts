import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, generateRandomString, acceptCookieConsent } from './utils';

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
    await page.goto('/haeuser', { waitUntil: 'domcontentloaded' });

    // Wait for the page content to fully load (look for a key element)
    await expect(page.getByText('Hausverwaltung').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500); // Short wait for React hydration

    // Open modal - button shows "Hinzufügen" on mobile, "Haus hinzufügen" on desktop
    const createBtn = page.locator('#create-object-btn');
    const addBtn = page.getByRole('button', { name: /Haus hinzufügen|Hinzufügen/i });

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
    await page.getByRole('button', { name: /Speichern|Aktualisieren/i }).click();

    // Wait for modal to close
    await expect(modal).toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify in table
    await expect(page.getByText(houseName).first()).toBeVisible({ timeout: 10000 });
  });

  test('Create an Apartment linked to the House', async ({ page }) => {
    await page.goto('/wohnungen', { waitUntil: 'domcontentloaded' });

    // Wait for the page content to fully load (card with title)
    await expect(page.getByText('Wohnungsverwaltung').first()).toBeVisible({ timeout: 15000 });
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
    // Click the combobox trigger. It usually has aria-expanded or role combobox.
    const combobox = modal.getByRole('combobox').first();
    await expect(combobox).toBeVisible({ timeout: 10000 });
    await combobox.click();
    await page.waitForTimeout(300);

    // Type to search
    await page.keyboard.type(houseName);
    await page.waitForTimeout(500);

    // Select option
    const option = page.getByRole('option', { name: houseName }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await page.waitForTimeout(300);

    // Submit
    await page.getByRole('button', { name: /Wohnung erstellen|Speichern/i }).click();

    // Wait for modal to close
    await expect(modal).toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify
    await expect(page.getByText(aptName).first()).toBeVisible({ timeout: 10000 });
  });

  test('Create a Tenant linked to the Apartment', async ({ page }) => {
    await page.goto('/mieter', { waitUntil: 'domcontentloaded' });

    // Wait for the page content to fully load (look for a key element)
    await expect(page.getByText('Mieterverwaltung').first()).toBeVisible({ timeout: 15000 });


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

    const modal = page.locator('[role="dialog"]').filter({ has: page.locator('#einzug') }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill form using IDs
    await page.fill('#name', tenantName);
    await page.waitForTimeout(300);

    // Select Apartment
    // It's a CustomCombobox. ID might be on the hidden input, not the trigger.
    // We look for the combobox trigger again.
    const combobox = modal.getByRole('combobox').first();
    await expect(combobox).toBeVisible({ timeout: 10000 });
    await combobox.click();
    await page.waitForTimeout(300);

    await page.keyboard.type(aptName);
    await page.waitForTimeout(500);

    const option = page.getByRole('option', { name: aptName }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await page.waitForTimeout(300);

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
    await page.getByRole('button', { name: /Speichern/i }).click();

    // Wait for modal to close
    await expect(modal).toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify
    await expect(page.getByText(tenantName).first()).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async ({ browser }) => {
    // Only cleanup if we have credentials
    if (!hasTestCredentials()) return;

    // Fresh browser context for cleanup
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await login(page);
      await acceptCookieConsent(page);

      const entities = [
        { name: tenantName, path: '/mieter', label: 'Tenant' },
        { name: aptName, path: '/wohnungen', label: 'Apartment' },
        { name: houseName, path: '/haeuser', label: 'House' }
      ];

      for (const entity of entities) {
        try {
          console.log(`[Cleanup] Processing ${entity.label}: ${entity.name}`);
          await page.goto(entity.path, { waitUntil: 'networkidle' });

          // Strategy 1: Search for the specific entity name
          let foundAndDeleted = false;
          const searchInput = page.locator('input[placeholder*="suchen" i]').first();

          if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
            await searchInput.clear();
            await searchInput.fill(entity.name);
            await page.waitForTimeout(2000);

            foundAndDeleted = await attemptDelete(page, entity);
          }

          // Strategy 2: If specific name didn't work, search for "E2E" prefix to catch all test data
          if (!foundAndDeleted && await searchInput.isVisible().catch(() => false)) {
            console.log(`[Cleanup] Trying broader E2E search for ${entity.label}...`);
            await searchInput.clear();
            await searchInput.fill('E2E');
            await page.waitForTimeout(2000);

            foundAndDeleted = await attemptDelete(page, entity);
          }

          if (!foundAndDeleted) {
            console.log(`[Cleanup] Could not delete ${entity.label}: ${entity.name}`);
          }
        } catch (entityError) {
          console.error(`[Cleanup] Error during ${entity.label} cleanup:`, entityError);
        }
      }

      async function attemptDelete(page: any, entity: any): Promise<boolean> {
        // Look for any checkbox in the table header or the first checkbox overall
        const selectAll = page.locator('thead input[type="checkbox"], thead [role="checkbox"], table [role="checkbox"]').first();

        if (!(await selectAll.isVisible({ timeout: 3000 }).catch(() => false))) {
          console.log(`[Cleanup] No checkboxes found for ${entity.label}`);
          return false;
        }

        console.log(`[Cleanup] Selecting entries for ${entity.label}...`);
        await selectAll.click({ force: true });
        await page.waitForTimeout(1500); // Increased wait for bulk action bar

        // Find the delete button - try multiple strategies
        let deleteBtn = page.getByRole('button')
          .filter({ hasText: /Löschen/i })
          .filter({ has: page.locator('svg.lucide-trash-2, .lucide-trash-2, .lucide-trash') })
          .first();

        if (!(await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
          // Try without the icon filter
          deleteBtn = page.getByRole('button').filter({ hasText: /^Löschen \(\d+\)$/i }).first();
        }

        if (!(await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
          console.log(`[Cleanup] Delete button not visible for ${entity.label}`);
          return false;
        }

        console.log(`[Cleanup] Clicking delete for ${entity.label}...`);
        await deleteBtn.click({ force: true });

        // Handle confirmation Dialog/AlertDialog
        const confirmBtn = page.getByRole('button')
          .filter({ hasText: /Löschen bestätigen|Löschen|Bestätigen/i })
          .filter({ hasNotText: /Abbrechen/i })
          .last();

        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click({ force: true });
          console.log(`[Cleanup] Successfully deleted ${entity.label}`);
          await page.waitForTimeout(2000);
          return true;
        } else {
          console.log(`[Cleanup] Confirmation button not found for ${entity.label}`);
          return false;
        }
      }
    } catch (globalError) {
      console.error('[Cleanup] Global error:', globalError);
    } finally {
      await page.close();
      await context.close();
    }
  });
});
