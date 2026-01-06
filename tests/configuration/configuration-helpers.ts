import { Page, Locator, expect } from "@playwright/test";

/**
 * Configuration Helper Functions
 * Extracted from helpers.ts for dedicated configuration management
 */

type FilterType = "Type" | "Source";

/**
 * Click the filter button for a specific column
 * @param page - Playwright page object
 * @param columnName - Column filter name
 */
export async function clickFilterButton(
  page: Page,
  columnName: FilterType
): Promise<void> {
  const filterButton = page
    .getByRole("cell", { name: `${columnName} filter` })
    .getByRole("button", { name: "filter" });
  await expect(filterButton).toBeVisible();
  await filterButton.click();
}

/**
 * Select a filter option and apply it
 * @param page - Playwright page object
 * @param columnName - Column filter name
 * @param optionName - Option to select
 */
export async function selectFilterOption(
  page: Page,
  columnName: FilterType,
  optionName: string
): Promise<void> {
  await clickFilterButton(page, columnName);
  await page
    .getByRole("menuitem", { name: optionName })
    .getByLabel("")
    .check();
  await page.getByRole("button", { name: "OK" }).click();
}

/**
 * Uncheck a filter option and apply
 * @param page - Playwright page object
 * @param columnName - Column filter name
 * @param optionName - Option to uncheck
 */
export async function uncheckFilterOption(
  page: Page,
  columnName: FilterType,
  optionName: string
): Promise<void> {
  await clickFilterButton(page, columnName);
  await page
    .getByRole("menuitem", { name: optionName })
    .getByLabel("")
    .uncheck();
  await page.getByRole("button", { name: "OK" }).click();
}

/**
 * Reset all filters
 * @param page - Playwright page object
 * @param columnName - Column filter to reset
 */
export async function resetAllFilters(
  page: Page,
  columnName: FilterType
): Promise<void> {
  await clickFilterButton(page, columnName);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "OK" }).click();
}

/**
 * Click and wait for a button action
 * @param page - Playwright page object
 * @param buttonName - Button text to click
 */
export async function clickConfigurationButton(
  page: Page,
  buttonName: "Create" | "OK" | "Remove" | "Refresh" | "Apply" | "Reset" | "save Save"
): Promise<void> {
  const button = page.getByRole("button", { name: buttonName });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
}

/**
 * Click plus variant buttons (e.g., "plus Create")
 * @param page - Playwright page object
 * @param buttonVariant - Button variant text
 */
export async function clickPlusButton(
  page: Page,
  buttonVariant: string
): Promise<void> {
  const button = page.getByRole("button", { name: `plus ${buttonVariant}` });
  await expect(button).toBeVisible();
  await button.click();
}

/**
 * Fill a textbox input field
 * @param page - Playwright page object
 * @param label - Label text for the textbox
 * @param value - Value to fill
 */
export async function fillConfigurationTextbox(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const textbox = page.getByRole("textbox", { name: label });
  await expect(textbox).toBeVisible();
  await textbox.fill(value);
  await expect(textbox).toHaveValue(value);
}

/**
 * Get a textbox locator by label
 * @param page - Playwright page object
 * @param label - Label text for the textbox
 */
export function getConfigurationTextbox(
  page: Page,
  label: string
): Locator {
  return page.getByRole("textbox", { name: label });
}

/**
 * Toggle table column visibility via control button
 * @param page - Playwright page object
 * @param columnSelector - CSS selector for the column checkbox
 * @param waitForApi - Whether to wait for API response
 */
export async function toggleTableColumn(
  page: Page,
  columnSelector: string,
  waitForApi: boolean = true
): Promise<void> {
  const checkbox = page.locator(columnSelector);
  await expect(checkbox).toBeVisible();
  await checkbox.click();

  if (waitForApi) {
    await page.getByRole("button", { name: "Apply" }).click();
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("firestore.googleapis.com") &&
        resp.url().includes("/Write/channel") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }
}

/**
 * Wait for API response after configuration change
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param method - HTTP method
 */
export async function waitForConfigurationApi(
  page: Page,
  urlPattern: string,
  method: "POST" | "GET" | "PUT" | "DELETE" = "POST"
): Promise<void> {
  await page.waitForResponse(
    (resp) =>
      resp.url().includes(urlPattern) &&
      resp.status() >= 200 &&
      resp.status() < 300 &&
      resp.request().method() === method
  );
}

/**
 * Navigate to a configuration section
 * @param page - Playwright page object
 * @param sectionName - Name of the section to navigate to
 * @param isMenuItem - Whether it's a menu item or link
 */
export async function navigateToConfigSection(
  page: Page,
  sectionName: string,
  isMenuItem: boolean = true
): Promise<void> {
  const selector = isMenuItem
    ? page.getByRole("menuitem", { name: sectionName })
    : page.getByRole("link", { name: sectionName });
  
  await expect(selector).toBeVisible();
  await selector.click();
}

/**
 * Search within configuration by a filter field
 * @param page - Playwright page object
 * @param filterLabel - Filter label/placeholder
 * @param searchTerm - Search term
 */
export async function searchInConfiguration(
  page: Page,
  filterLabel: string,
  searchTerm: string
): Promise<void> {
  const searchBox = page.getByRole("textbox", { name: filterLabel });
  await expect(searchBox).toBeVisible();
  await searchBox.fill(searchTerm);
}

/**
 * Verify a value exists in configuration table
 * @param page - Playwright page object
 * @param value - Value to verify
 */
export async function verifyValueInTable(
  page: Page,
  value: string
): Promise<void> {
  const row = page.getByText(value);
  await expect(row).toBeVisible();
}
