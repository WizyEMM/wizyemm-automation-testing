import { Page, Locator, expect } from "@playwright/test";

export class ConfigurationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async clickByRole(
    role: "button" | "link" | "tab",
    name: string
  ): Promise<void> {
    await this.page.getByRole(role, { name }).click();
  }

  private async waitForUpdateResponse(): Promise<void> {
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }
  async searchAndSelectProfile(profileName: string): Promise<void> {
    await this.page
      .locator('input[placeholder*="Filter by"][placeholder*="name"]')
      .fill(profileName);
    await this.page.getByRole("button", { name: "Refresh" }).click();

    const row = this.page.getByRole("row", { name: profileName }).first();
    await row.locator("a").first().click();
    await expect(this.page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );

    await this.page.locator('[id$="-tab-config"]').click();
  }

  async navigateToConfiguration(): Promise<void> {
    await this.clickByRole("tab", "Configuration");
  }

  async navigateToAdvancedFeatures(): Promise<void> {
    await this.clickByRole("tab", "Advanced Features");
  }

  async navigateToSecuritySettings(): Promise<void> {
    await this.clickByRole("tab", "Security Settings");
  }

  async toggleSwitch(
    policyName: string,
    buttonName: string = "Save"
  ): Promise<void> {
    const switchLocator = this.page
      .getByRole("listitem")
      .filter({ hasText: policyName })
      .getByRole("switch");

    await switchLocator.click();
    await this.clickByRole("button", buttonName);
    await this.waitForUpdateResponse();
  }

  getSwitchLocator(policyName: string): Locator {
    return this.page
      .getByRole("listitem")
      .filter({ hasText: policyName })
      .getByRole("switch");
  }

  async isSwitchEnabled(policyName: string): Promise<boolean> {
    const switchLocator = this.getSwitchLocator(policyName);
    const ariaChecked = await switchLocator.getAttribute("aria-checked");
    return ariaChecked === "true";
  }

  async ensureSwitchEnabled(policyName: string): Promise<void> {
    const isEnabled = await this.isSwitchEnabled(policyName);
    if (!isEnabled) {
      await this.toggleSwitch(policyName);
    }
  }

  async cycleDropdown(
    rowText: string,
    modes: string[],
    options: { container: string; inner: string }
  ): Promise<string> {
    const normalizeMode = (mode: string): string => {
      return mode.replace(/\s*\(deprecated\)$/i, "").trim();
    };

    const escapeRegex = (str: string): string => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const selectorLocator = this.page
      .locator(options.container, {
        has: this.page.getByText(rowText, { exact: true }),
      })
      .locator(options.inner);

    await expect(selectorLocator).toBeVisible();

    const rawText = (await selectorLocator.textContent())?.trim() ?? "";
    const currentMode = normalizeMode(rawText);
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    await selectorLocator.click();

    const dropdown = this.page.locator(".ant-select-dropdown:visible");
    await dropdown.waitFor({ state: "visible"});

    const optionLocator = dropdown.locator(".ant-select-item-option").filter({
      hasText: new RegExp(
        `^${escapeRegex(nextMode)}(\\s*\\(deprecated\\))?$`,
        "i"
      ),
    });

    await optionLocator.first().click();

    await this.clickByRole("button", "Save");
    await this.waitForUpdateResponse();

    return nextMode;
  }

  async getCurrentDropdownValue(rowText: string): Promise<string> {
    const currentModeElement = await this.page
      .locator("li.ant-list-item")
      .filter({ hasText: rowText })
      .locator(".ant-select-selector");

    const currentModeText = await currentModeElement.textContent();
    return currentModeText?.trim() ?? "";
  }

  async setupKeyguardConfiguration(): Promise<void> {
    await this.clickByRole("button", "Set up Keyguard Configuration");

    const switchLocator = this.page
      .getByRole("listitem")
      .filter({ hasText: "Disable all customizations" })
      .getByRole("switch");

    await switchLocator.click();
    await this.clickByRole("button", "OK");
    await this.clickByRole("button", "Save");
    await this.waitForUpdateResponse();
  }

  async addFactoryResetProtectionEmail(email: string): Promise<void> {
    await this.page.locator(".ant-select-selection-overflow").click();
    await this.page
      .locator(".ant-select-selection-search-input:not([readonly])")
      .fill(email);
    await this.page
      .locator(".ant-select-selection-search-input:not([readonly])")
      .press("Enter");

    await this.page.getByRole("button", { name: "save Save" }).click();
    await this.waitForUpdateResponse();
  }

  async incrementPasswordInputs(): Promise<void> {
    await this.page
      .getByRole("listitem")
      .filter({ hasText: "Password History LengthNumber" })
      .getByLabel("Increase Value")
      .click();

    await this.page
      .getByRole("listitem")
      .filter({ hasText: "Maximum failed passwords for" })
      .getByLabel("Increase Value")
      .click();

    await this.page
      .getByRole("button", { name: "Increase Value" })
      .nth(2)
      .click();
    await this.page
      .getByRole("button", { name: "Increase Value" })
      .nth(3)
      .click();
  }

  async togglePasswordQualityRadio(): Promise<void> {
    await this.page
      .locator(
        ".ant-radio-button-wrapper:not(.ant-radio-button-wrapper-checked)"
      )
      .first()
      .click();

    const checkedCount = await this.page
      .locator(".ant-radio-button-wrapper-checked")
      .count();
    expect(checkedCount).toBeGreaterThanOrEqual(1);
  }
}
