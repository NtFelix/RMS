from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000/auth/login")
    page.fill('input[id="email"]', 'test@test.com')
    page.fill('input[id="password"]', 'password')
    page.click('button[type="submit"]')
    page.wait_for_selector('[aria-label="User menu"]')
    page.click('[aria-label="User menu"]')
    page.click('text=Einstellungen')
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
