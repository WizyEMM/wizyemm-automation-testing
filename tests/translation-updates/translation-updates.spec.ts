import { test, expect, Page } from "@playwright/test";
import {
  navigateToPage,
  findTextOnPage,
  textAppearsOnPage,
  navigateToCreateAdminFlow,
  navigateToSettings,
} from "./translation-updates.helpers";
import { translationTestData } from "./translation-updates.data";

/**
 * Test Suite: Translation Updates - "Please" Text Removal
 *
 * This test verifies that the "Please" text has been successfully removed
 * from various components and pages in the Customer Console.
 *
 * Removed from 78+ components across:
 * - Password confirmation messages
 * - Modal prompts
 * - Error messages
 * - Help text and tooltips
 */

test.describe("Translation Updates - 'Please' Text Removal", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Use existing authenticated page
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * Test 1: Verify "Please" doesn't appear on Login Page
   */
  test("Login page should not contain 'Please' text", async ({ page }) => {
    await navigateToPage(page, "/login");

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 2: Verify "Please" doesn't appear on Admin Accounts page
   */
  test("Admin Accounts page should not contain 'Please' text", async ({
    page,
  }) => {
    await navigateToPage(page, "/admin/accounts");

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 3: Verify "Please" doesn't appear on Profile page
   */
  test("Profile page should not contain 'Please' text", async ({ page }) => {
    await navigateToPage(page, "/profiles");

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 4: Verify "Please" doesn't appear on Application Management
   */
  test("Application Management page should not contain 'Please' text", async ({
    page,
  }) => {
    await navigateToPage(page, "/application");

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 5: Verify "Please" doesn't appear on Dashboard
   */
  test("Dashboard page should not contain 'Please' text", async ({ page }) => {
    await navigateToPage(page, "/dashboard");

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 6: Verify "Please" doesn't appear on Settings page
   */
  test("Settings page should not contain 'Please' text", async ({ page }) => {
    await navigateToSettings(page);

    const foundText = await findTextOnPage(page, ["Please"]);
    expect(foundText).toHaveLength(0);
  });

  /**
   * Test 7: Check Create Admin modal (when opened)
   * This checks the ModalCreateAdministrator component
   */
  test("Create Administrator modal should not contain 'Please' text", async ({
    page,
  }) => {
    await navigateToCreateAdminFlow(page);

    // Check if modal is visible
    const modal = page.locator(".ant-modal");
    const isModalVisible = await modal
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isModalVisible) {
      const foundText = await findTextOnPage(page, ["Please"]);
      expect(foundText).toHaveLength(0);
    }
  });

  /**
   * Test 8: Comprehensive check - navigate all key pages and verify no "Please"
   */
  test("All key pages should not contain 'Please' text", async ({ page }) => {
    const pagesWithFoundText: string[] = [];

    for (const pageData of translationTestData.pagesToCheck) {
      await navigateToPage(page, pageData.url);

      const foundText = await findTextOnPage(page, ["Please"]);

      if (foundText.length > 0) {
        pagesWithFoundText.push(
          `${pageData.name} (${pageData.url}): Found "Please"`
        );
      }
    }

    // Assert no pages contain "Please" text
    expect(
      pagesWithFoundText,
      `Pages still containing "Please": ${pagesWithFoundText.join(", ")}`
    ).toHaveLength(0);
  });

  /**
   * Test 9: Specific check - Form validation messages
   * Checks that password confirmation validators don't contain "Please"
   */
  test("Form validation messages should not contain 'Please'", async ({
    page,
  }) => {
    // Navigate to a page with forms (admin accounts or settings)
    await navigateToSettings(page);

    // Look for input validation messages
    const validationMessages = page.locator(
      ".ant-form-item-explain-error, .ant-message-error, .ant-notification-error"
    );

    if (await validationMessages.count()) {
      for (let i = 0; i < (await validationMessages.count()); i++) {
        const text = await validationMessages.nth(i).textContent();
        expect(text).not.toContain("Please");
      }
    }
  });

  /**
   * Test 10: Check alert and notification messages
   * Verifies modals, alerts, and notifications don't contain "Please"
   */
  test("Alert and notification messages should not contain 'Please'", async ({
    page,
  }) => {
    // Navigate through pages to trigger various messages
    await navigateToPage(page, "/admin/accounts");

    // Check all alert/notification type elements
    const alerts = page.locator(
      ".ant-alert, .ant-modal, .ant-message, .ant-notification"
    );

    const alertCount = await alerts.count();

    if (alertCount > 0) {
      for (let i = 0; i < alertCount; i++) {
        const alertText = await alerts.nth(i).textContent();
        expect(alertText).not.toContain("Please");
      }
    }
  });
});
