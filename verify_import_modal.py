import os
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Create dummy CSV
        csv_content = "id,date,value\nZ-001,2024-01-01,110\nZ-002,2024-01-01,50\nZ-003,2024-01-01,10"
        csv_path = "/tmp/test_readings.csv"
        with open(csv_path, "w") as f:
            f.write(csv_content)

        try:
            page.goto("http://localhost:3000/test-import")

            expect(page.get_by_role("dialog")).to_be_visible(timeout=30000)

            page.set_input_files("input[type='file']", csv_path)

            expect(page.get_by_text("Ordnen Sie die Spalten")).to_be_visible()

            page.locator("div.grid-cols-2").filter(has_text="Zähler Custom ID Spalte").get_by_role("combobox").click()
            page.get_by_role("option", name="id").click()

            page.locator("div.grid-cols-2").filter(has_text="Ablesedatum Spalte").get_by_role("combobox").click()
            page.get_by_role("option", name="date").click()

            page.locator("div.grid-cols-2").filter(has_text="Zählerstand Spalte").get_by_role("combobox").click()
            page.get_by_role("option", name="value").click()

            page.get_by_role("button", name="Vorschau anzeigen").click()

            expect(page.get_by_text("Überprüfen Sie die Daten")).to_be_visible()

            # Take screenshot
            page.screenshot(path="/home/jules/verification/import_modal_styled.png")
            print("Screenshot taken at /home/jules/verification/import_modal_styled.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e

        finally:
            browser.close()
            if os.path.exists(csv_path):
                os.remove(csv_path)

if __name__ == "__main__":
    run()
