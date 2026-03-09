import { Page } from "@playwright/test";

/**
 * Navigate to a specific page in the Customer Console
 */
export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // Wait for any spinners or loading states to complete
  const spinner = page.locator(".ant-spin-spinning");
  await spinner.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
}

/**
 * Check if a specific text appears anywhere on the page
 * Returns true if text is found, false otherwise
 */
export async function textAppearsOnPage(
  page: Page,
  text: string
): Promise<boolean> {
  try {
    const element = page.locator(`text=${text}`).first();
    return await element.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Check if any of the provided text strings appear on the page
 * Returns array of found text (empty if none found)
 */
export async function findTextOnPage(
  page: Page,
  textArray: string[]
): Promise<string[]> {
  const foundText: string[] = [];

  for (const text of textArray) {
    const isVisible = await textAppearsOnPage(page, text);
    if (isVisible) {
      foundText.push(text);
    }
  }

  return foundText;
}

/**
 * Navigate through key sections that would trigger modals
 */
export async function navigateToCreateAdminFlow(
  page: Page
): Promise<void> {
  try {
    // Navigate to admin accounts
    await page.goto("/admin/accounts", { waitUntil: "domcontentloaded" });
    
    // Wait for table to load
    const spinner = page.locator(".ant-spin-spinning");
    await spinner.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    
    // Try to find and click create admin button
    const createButton = page.locator("button").filter({ hasText: /create|add/i }).first();
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
      // Wait for modal to appear
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.log("Could not navigate to create admin flow:", error);
  }
}

/**
 * Navigate to settings to check password confirmation messages
 */
export async function navigateToSettings(page: Page): Promise<void> {
  try {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    const spinner = page.locator(".ant-spin-spinning");
    await spinner.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  } catch (error) {
    console.log("Could not navigate to settings:", error);
  }
}
