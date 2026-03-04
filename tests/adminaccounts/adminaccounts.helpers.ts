import { Page, expect } from "@playwright/test";

export function generateAdminTimestamp(date?: Date): string {
  const now = date ?? new Date();
  return [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
}

export function buildAdminEmail(
  prefix: string,
  domain: string,
  date?: Date
): string {
  const timestamp = generateAdminTimestamp(date);
  return `${prefix}${timestamp}${domain}`;
}

export async function waitForAdminTable(page: Page): Promise<void> {
  const spinner = page.locator(".ant-spin-spinning");
  await spinner.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  const firstRow = page.getByRole("row").nth(1);

  await expect(firstRow).toBeVisible();
}

export async function waitForAdminSuccessMessage(
  page: Page,
  message: string,
  timeout: number = 10_000
): Promise<void> {
  await page.waitForSelector(`text=${message}`, {
    state: "visible",
    timeout,
  });
}

async function openAdminFilterDropdown(
  page: Page,
  filterName: string
): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page
    .getByRole("columnheader", { name: filterName })
    .getByRole("button")
    .click();
}

async function setAdminFilterOption(
  page: Page,
  optionName: string,
  shouldBeChecked: boolean
): Promise<void> {
  const menuItem = page.getByRole("menuitem", {
    name: optionName,
    exact: true,
  });
  const checkbox = menuItem.getByLabel("");
  await checkbox.setChecked(shouldBeChecked);
}

export async function applyAdminRoleFilters(
  page: Page,
  filterName: string,
  filters: readonly string[]
): Promise<void> {
  let previous: string | null = null;

  for (const current of filters) {
    await openAdminFilterDropdown(page, filterName);

    if (previous) {
      await setAdminFilterOption(page, previous, false);
    }

    await setAdminFilterOption(page, current, true);
    await page.getByRole("button", { name: "OK" }).click();
    await waitForAdminTable(page);

    previous = current;
  }
}

export async function resetAdminFilters(
  page: Page,
  filterName: string
): Promise<void> {
  await openAdminFilterDropdown(page, filterName);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "OK" }).click();
  await waitForAdminTable(page);
}
