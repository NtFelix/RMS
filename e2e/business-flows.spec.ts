import { test, expect } from '@playwright/test';
import { login, hasTestCredentials, generateRandomString, acceptCookieConsent, getUiErrorMessage } from './utils';


import { Page } from '@playwright/test';

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

// Testdaten tragen einen Zeitstempel (Sekunden). Die drei Browser-Jobs laufen parallel auf
// demselben Testaccount; so räumt der Cleanup nur Reste älterer Läufe weg, nicht die laufenden
// Daten der anderen Jobs. Namen ohne Zeitstempel (altes Format) gelten als Rückstand.
const E2E_STALE_AFTER_MS = 30 * 60 * 1000;

function isStaleE2EName(name: string): boolean {
  const match = name.match(/^E2E (?:House|Apt|Tenant) (\d{10}) /);
  if (!match) return true;
  return Date.now() - Number(match[1]) * 1000 > E2E_STALE_AFTER_MS;
}

type CleanupEntity = {
  label: string;
  path: string;
  // Präfix des aria-labels der Zeilen-Checkbox, z. B. "Wohnung <Name> auswählen"
  rowLabel: string;
  ownName: string;
};

async function deleteE2EEntries(page: Page, entity: CleanupEntity) {
  await safeNavigate(page, entity.path);

  const searchInput = page.locator('input[placeholder*="suchen" i]').first();
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await searchInput.fill('E2E');

  const rowCheckboxes = page.getByRole('checkbox', {
    name: new RegExp(`^${entity.rowLabel} E2E .+ auswählen$`),
  });
  const hasRows = await rowCheckboxes.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (!hasRows) {
    console.log(`[Cleanup] ${entity.label}: nothing to delete`);
    return;
  }

  // Einzeln anklicken statt "Alle auswählen": gelöscht wird nur, was wir sicher als Testdaten erkennen
  const labels = await rowCheckboxes.evaluateAll(els => els.map(el => el.getAttribute('aria-label') ?? ''));
  const nameOf = (label: string) => label.slice(entity.rowLabel.length + 1, -' auswählen'.length);
  const toDelete = labels.filter(label => {
    const name = nameOf(label);
    return name === entity.ownName || isStaleE2EName(name);
  });
  if (toDelete.length === 0) {
    console.log(`[Cleanup] ${entity.label}: ${labels.length} E2E entries belong to running jobs, skipping`);
    return;
  }

  for (const label of toDelete) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }

  // Der Button heißt "Löschen (N)"; ein zweiter Span nur für Mobile steckt im Text, nicht im Accessible Name
  const deleteBtn = page.getByRole('button', { name: /Löschen \(\d+\)/ }).first();
  await expect(deleteBtn).toBeVisible({ timeout: 10000 });
  const selectedCount = Number((await deleteBtn.innerText()).match(/\((\d+)\)/)?.[1]);
  if (selectedCount !== toDelete.length) {
    throw new Error(`selection mismatch: clicked ${toDelete.length}, button says ${selectedCount}`);
  }
  await deleteBtn.click();

  // Der Dialog öffnet erst nach einem Server-Action-Aufruf (Kautionsprüfung), daher warten
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: /^(?!.*(Abbrechen|Schließen|Close)).+/i }).last().click();
  await expect(dialog).toBeHidden({ timeout: 20000 });

  console.log(`[Cleanup] ${entity.label}: deleted ${toDelete.length} entries`);
}

test.describe('Business Logic Flows', () => {
  // Use serial mode because we are creating dependencies (House -> Apt -> Tenant)
  test.describe.configure({ mode: 'serial' });

  const randomId = `${Math.floor(Date.now() / 1000)} ${generateRandomString(6)}`;
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
      // Der Button wird serverseitig entschieden (Berechtigung, Abo, Limit); Warten hilft nur bei Hydration.
      // Dauerhaft disabled heißt meist: Limit erreicht, weil Testdaten nicht aufgeräumt wurden.
      await expect(createBtn, 'Wohnung-hinzufügen-Button ist disabled: Limit erreicht oder keine Berechtigung (Rückstand an "E2E Apt" im Testaccount prüfen)').toBeEnabled({ timeout: 15000 });
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
    const houseSearchbox = page.locator('[data-combobox-dropdown]').getByRole('searchbox').first();
    await expect(houseSearchbox).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Re-try opening the combobox if searchbox is not visible (Firefox/WebKit shift safeguard)
      await combobox.click({ force: true });
      await expect(houseSearchbox).toBeVisible({ timeout: 5000 });
    });

    await houseSearchbox.fill(houseName);
    await page.waitForTimeout(500);

    // Select option
    const option = page.getByRole('option', { name: houseName }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.scrollIntoViewIfNeeded().catch(() => {});
    await option.click({ force: true });
    await page.waitForTimeout(300);

    // Submit
    await page.getByRole('button', { name: /Wohnung erstellen|Speichern/i }).click();

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
    await expect(page.getByText(aptName).first()).toBeVisible({ timeout: 10000 });
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

    // Select Apartment
    // It's a CustomCombobox with id="wohnung_id" on the button trigger.
    const combobox = modal.locator('#wohnung_id').first();
    await expect(combobox).toBeVisible({ timeout: 10000 });
    await combobox.click();
    await page.waitForTimeout(300);

    const aptSearchbox = page.locator('[data-combobox-dropdown]').getByRole('searchbox').first();
    await aptSearchbox.fill(aptName);
    await page.waitForTimeout(500);

    const option = page.getByRole('option', { name: aptName }).first();
    // Re-try opening the combobox if option is not visible
    try {
      await expect(option).toBeVisible({ timeout: 5000 });
    } catch (e) {
      await modal.locator('#wohnung_id').first().click({ force: true });
      await expect(aptSearchbox).toBeVisible({ timeout: 5000 });
      await aptSearchbox.fill(aptName);
      await expect(option).toBeVisible({ timeout: 10000 });
    }
    await option.scrollIntoViewIfNeeded().catch(() => {});
    await option.click({ force: true });
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

      // Reihenfolge: Mieter -> Wohnung -> Haus. Fehler pro Entität werden mit Grund geloggt,
      // lassen den Test aber nicht scheitern.
      const entities: CleanupEntity[] = [
        { label: 'Tenant', path: '/mieter', rowLabel: 'Mieter', ownName: tenantName },
        { label: 'Apartment', path: '/wohnungen', rowLabel: 'Wohnung', ownName: aptName },
        { label: 'House', path: '/haeuser', rowLabel: 'Haus', ownName: houseName },
      ];

      for (const entity of entities) {
        try {
          await deleteE2EEntries(page, entity);
        } catch (entityError: any) {
          console.error(`[Cleanup] Could not clean up ${entity.label}: ${String(entityError?.message ?? entityError).split('\n')[0]}`);
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
