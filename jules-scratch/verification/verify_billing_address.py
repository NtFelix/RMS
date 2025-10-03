from playwright.sync_api import sync_playwright, expect, Page, Playwright

def run_verification(playwright: Playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:3000/auth/login")

        # Accept cookies first
        page.get_by_role("button", name="Alle akzeptieren").click()

        # Fill in the email and password
        page.get_by_label("E-Mail").fill("test@test.com")
        page.get_by_label("Passwort").fill("password")

        # Click the login button
        page.get_by_role("button", name="Anmelden").click()

        # Check for navigation, but take a screenshot on failure
        try:
            expect(page).to_have_url("http://localhost:3000/home", timeout=10000) # Increased timeout
        except AssertionError:
            page.screenshot(path="jules-scratch/verification/login_failure.png")
            print("Login failed. Screenshot saved to jules-scratch/verification/login_failure.png")
            raise

        # Click the user settings avatar to open the dropdown
        page.locator('div[aria-label="User menu"]').click()

        # Click the "Einstellungen" (Settings) menu item
        page.get_by_role("menuitem", name="Einstellungen").click()

        # Wait for the settings modal to be visible
        settings_dialog = page.get_by_role("dialog", name="Einstellungen")
        expect(settings_dialog).to_be_visible()

        # The "Profil" tab should be active by default. We'll wait for the billing address section to be visible.
        billing_address_section = settings_dialog.get_by_text("Rechnungsadresse")
        expect(billing_address_section).to_be_visible()

        # Take a screenshot of the entire modal content
        page.screenshot(path="jules-scratch/verification/billing_address_verification.png")
        print("Verification successful. Screenshot saved to jules-scratch/verification/billing_address_verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)