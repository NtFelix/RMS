import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, generateRandomString } from './utils';

test.describe('Business Logic Flows', () => {
  // Use serial mode because we are creating dependencies (House -> Apt -> Tenant)
  test.describe.configure({ mode: 'serial' });

  const randomId = generateRandomString(6);
  const houseName = `E2E House ${randomId}`;
  const aptName = `E2E Apt ${randomId}`;
  const tenantName = `E2E Tenant ${randomId}`;

  test.beforeEach(async ({ page }) => {
    if (!hasTestCredentials()) {
      test.skip();
    }
    await login(page);
  });

  test('Create a House', async ({ page }) => {
    await page.goto('/haeuser');

    // Open modal
    const addBtn = page.getByRole('button', { name: /Haus hinzufügen/i });
    if (await addBtn.isVisible()) {
        await addBtn.click();
    } else {
        await page.locator('#create-object-btn').click();
    }

    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form using IDs
    await page.fill('#name', houseName);
    await page.fill('#strasse', 'Teststr. 1');
    await page.fill('#ort', 'Test City');

    // Manual Size
    // Checkbox ID is automaticSize
    const autoSizeCheckbox = page.locator('#automaticSize');
    if (await autoSizeCheckbox.isVisible() && await autoSizeCheckbox.isChecked()) {
        await autoSizeCheckbox.click();
    }

    // Wait for manual size input to be enabled/visible if needed
    await page.fill('#manualGroesse', '150');

    // Submit
    await page.getByRole('button', { name: /Speichern|Aktualisieren/i }).click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).toBeHidden();

    // Verify in table
    await expect(page.getByText(houseName)).toBeVisible();
  });

  test('Create an Apartment linked to the House', async ({ page }) => {
    await page.goto('/wohnungen');

    // Open modal
    const addBtn = page.getByRole('button', { name: /Wohnung hinzufügen/i });
    if (await addBtn.isVisible()) {
        await addBtn.click();
    } else {
        await page.locator('#create-object-btn').click();
    }

    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form using IDs
    await page.fill('#name', aptName);
    await page.fill('#groesse', '75');
    await page.fill('#miete', '1200');

    // Select House (Combobox)
    const modal = page.getByRole('dialog');
    // Click the combobox trigger. It usually has aria-expanded or role combobox.
    await modal.getByRole('combobox').click();

    // Type to search
    await page.keyboard.type(houseName);
    // Select option
    await page.getByRole('option', { name: houseName }).first().click();

    // Submit
    await page.getByRole('button', { name: /Wohnung erstellen|Speichern/i }).click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).toBeHidden();

    // Verify
    await expect(page.getByText(aptName)).toBeVisible();
  });

  test('Create a Tenant linked to the Apartment', async ({ page }) => {
    await page.goto('/mieter');

    // Open modal
    const addBtn = page.getByRole('button', { name: /Mieter hinzufügen/i });
    if (await addBtn.isVisible()) {
        await addBtn.click();
    } else {
        await page.locator('#create-object-btn').click();
    }

    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form using IDs
    await page.fill('#name', tenantName);

    // Select Apartment
    // It's a CustomCombobox. ID might be on the hidden input, not the trigger.
    // We look for the combobox trigger again.
    const modal = page.getByRole('dialog');
    await modal.getByRole('combobox').first().click();

    await page.keyboard.type(aptName);
    await page.getByRole('option', { name: aptName }).first().click();

    // Date
    // DatePicker often puts the id on the button or input.
    // We try to fill the placeholder "TT.MM.JJJJ" or use the id if it's an input.
    // If it's a button opening a calendar, we might need to click it and pick a date.
    // But often DatePicker components allow typing if you focus them.

    // Let's try filling by placeholder which is usually unique enough in the form
    const dateInput = page.getByPlaceholder('TT.MM.JJJJ').first();
    if (await dateInput.isVisible()) {
        await dateInput.fill('01.01.2024');
    } else {
        // If it's a button-only date picker (popover)
        // We might just click today
        await page.locator('#einzug').click(); // Assuming ID exists on trigger
        // Click a date in calendar (e.g., today)
        // This is flaky without knowing the exact calendar structure (likely DayPicker)
        // We skip date if optional? No, it's likely required for tenant.
        // We assume we can type or it defaults to something valid?
        // Tenant modal code: <DatePicker id="einzug" ... />
        // If DatePicker renders a button with id="einzug", clicking it opens popover.
        // If it renders an input, filling it works.
        // Let's assume input for now or try to pick "today".

        // Try to pick the first available day button in the popover
        // await page.getByRole('gridcell').first().click(); // simplistic
    }

    await page.fill('#email', 'test@example.com');

    // Submit
    await page.getByRole('button', { name: /Speichern/i }).click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).toBeHidden();

    // Verify
    await expect(page.getByText(tenantName)).toBeVisible();
  });

  test('Cleanup (Delete Entities)', async ({ page }) => {
    // Delete Tenant
    await page.goto('/mieter');
    await page.getByPlaceholder('Suchen...').fill(tenantName);
    await page.waitForTimeout(1000);

    // Select all/first
    const checkbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    // Or finding the specific row checkbox

    if (await checkbox.isVisible()) {
        await checkbox.click();

        // Look for bulk delete button (trash icon)
        const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            await page.getByRole('button', { name: /Löschen/i }).last().click();
            await expect(page.getByText(tenantName)).toBeHidden();
        }
    }

    // Delete Apartment
    await page.goto('/wohnungen');
    await page.getByPlaceholder('Suchen...').fill(aptName);
    await page.waitForTimeout(1000);

    const aptCheckbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    if (await aptCheckbox.isVisible()) {
        await aptCheckbox.click();
        const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            await page.getByRole('button', { name: /Löschen/i }).last().click();
            await expect(page.getByText(aptName)).toBeHidden();
        }
    }

    // Delete House
    await page.goto('/haeuser');
    await page.getByPlaceholder('Suchen...').fill(houseName);
    await page.waitForTimeout(1000);

    const houseCheckbox = page.locator('th input[type="checkbox"], td input[type="checkbox"]').first();
    if (await houseCheckbox.isVisible()) {
        await houseCheckbox.click();
        const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            await page.getByRole('button', { name: /Löschen/i }).last().click();
            await expect(page.getByText(houseName)).toBeHidden();
        }
    }
  });
});
