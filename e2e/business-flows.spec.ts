import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, generateRandomString, acceptCookieConsent } from './utils';

test.describe('Business Logic Flows', () => {
  // Use serial mode because we are creating dependencies (House -> Apt -> Tenant)
  test.describe.configure({ mode: 'serial' });

  const randomId = generateRandomString(6);
  const houseName = `E2E House ${randomId}`;
  const aptName = `E2E Apt ${randomId}`;
  const tenantName = `E2E Tenant ${randomId}`;

  let isLoggedIn = false;

  test.beforeAll(async ({ browser }) => {
    if (!hasTestCredentials()) {
      test.skip();
    }
    // We'll handle login in beforeEach for each test
  });

  test.beforeEach(async ({ page }) => {
    if (!hasTestCredentials()) {
      test.skip();
    }
    if (!isLoggedIn) {
      await login(page);
      await acceptCookieConsent(page);
      isLoggedIn = true;
    }
  });

  test('Create a House', async ({ page }) => {
    await page.goto('/haeuser', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Wait for page to fully render

    // Open modal
    const addBtn = page.getByRole('button', { name: /Haus hinzufügen/i });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      const createBtn = page.locator('#create-object-btn');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();
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
    await page.goto('/wohnungen', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open modal
    const addBtn = page.getByRole('button', { name: /Wohnung hinzufügen/i });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Wait for it to be enabled (might be disabled while loading plan details)
      await expect(addBtn).toBeEnabled({ timeout: 15000 });
      await addBtn.click();
    } else {
      const createBtn = page.locator('#create-unit-btn');
      await expect(createBtn).toBeEnabled({ timeout: 15000 });
      await createBtn.click();
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
    await page.goto('/mieter', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open modal
    const addBtn = page.getByRole('button', { name: /Mieter hinzufügen/i });
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      const createBtn = page.locator('#add-tenant-btn');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();
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

  test('Cleanup (Delete Entities)', async ({ page }) => {
    // Delete Tenant
    await page.goto('/mieter', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const searchInput = page.getByPlaceholder('Suchen...');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(tenantName);
      await page.waitForTimeout(1000);
    }

    // Select all/first
    const checkbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    // Or finding the specific row checkbox

    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(300);

      // Look for bulk delete button (trash icon)
      const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        
        const confirmBtn = page.getByRole('button', { name: /Löschen/i }).last();
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Delete Apartment
    await page.goto('/wohnungen', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const aptSearch = page.getByPlaceholder('Suchen...');
    if (await aptSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aptSearch.fill(aptName);
      await page.waitForTimeout(1000);
    }

    const aptCheckbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    if (await aptCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aptCheckbox.click();
      await page.waitForTimeout(300);
      
      const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        
        const confirmBtn = page.getByRole('button', { name: /Löschen/i }).last();
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Delete House
    await page.goto('/haeuser', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const houseSearch = page.getByPlaceholder('Suchen...');
    if (await houseSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await houseSearch.fill(houseName);
      await page.waitForTimeout(1000);
    }

    const houseCheckbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    if (await houseCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await houseCheckbox.click();
      await page.waitForTimeout(300);
      
      const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        
        const confirmBtn = page.getByRole('button', { name: /Löschen/i }).last();
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});
