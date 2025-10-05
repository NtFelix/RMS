import re
from playwright.sync_api import Page, expect

def test_tenant_page_redesign(page: Page):
    """
    This test verifies the redesigned tenant page layout.
    It logs in, navigates to the tenant page, and takes a screenshot.
    """
    # 1. Arrange: Go to the login page.
    page.goto("http://localhost:3000/auth/login")

    # 2. Act: Log in.
    #    Since there are no test credentials, I will attempt to register a new user.
    #    If registration is not possible, I will assume a user is already logged in.
    try:
        # Click on the "Noch kein Konto? Registrieren" link
        page.get_by_role("link", name="Noch kein Konto? Registrieren").click()

        # Fill in the registration form
        page.get_by_label("E-Mail").fill("testuser@example.com")
        page.get_by_label("Passwort").fill("password123")
        page.get_by_label("Passwort bestätigen").fill("password123")
        page.get_by_role("button", name="Registrieren").click()

        # After registration, we should be redirected to the dashboard.
        # We'll wait for the main content to appear.
        expect(page.locator("h1").get_by_text("Dashboard")).to_be_visible(timeout=15000)

    except Exception:
        # If registration fails or we are already logged in, proceed to the tenant page.
        # This is a fallback in case the test environment has a pre-existing user.
        pass

    # 3. Navigate to the tenant page
    page.goto("http://localhost:3000/mieter")

    # 4. Assert: Check for the new layout elements.
    #    - The main content area with the tenant table.
    #    - The sidebar with actions, filters, and stats.
    expect(page.get_by_role("heading", name="Mieterübersicht")).to_be_visible()
    expect(page.get_by_role("heading", name="Aktionen")).to_be_visible()
    expect(page.get_by_role("heading", name="Filter")).to_be_visible()
    expect(page.get_by_role("heading", name="Statistiken")).to_be_visible()

    # 5. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")