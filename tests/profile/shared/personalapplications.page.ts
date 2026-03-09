import { Page, Locator, expect } from "@playwright/test";

export class PersonalAppsPage {
  readonly page: Page;

  private readonly personalAppsTab: Locator;
  private readonly okButton: Locator;
  private readonly yesButton: Locator;
  private readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.personalAppsTab = page.getByRole("tab", { name: "Personal Apps" });
    this.okButton = page.getByRole("button", { name: "OK" });
    this.yesButton = page.getByRole("button", { name: "Yes" });
    this.saveButton = page.getByRole("button", { name: "Save" });
  }

  async navigateToPersonalAppsTab(): Promise<void> {
    await this.personalAppsTab.click();
  }

  private getModeLocator(): Locator {
    const settingRow = this.page
      .getByRole("listitem")
      .filter({ hasText: "Play Store Mode" });
    return settingRow.locator('[role="combobox"]');
  }

  async getCurrentPlayStoreMode(modes: string[]): Promise<string> {
    const currentModeLocator = this.getModeLocator();
    await expect(currentModeLocator).toBeVisible();

    const currentMode = (await currentModeLocator.textContent())?.trim() ?? "";

    if (!modes.includes(currentMode)) {
      throw new Error(`Current mode "${currentMode}" not found in mode list`);
    }

    return currentMode;
  }

  async selectPlayStoreMode(mode: string): Promise<void> {
    const settingRowLocator = this.page
      .getByRole("listitem")
      .filter({ hasText: "Play Store Mode" });

    await settingRowLocator.getByRole("combobox").click();

    const modeOption = this.page.getByText(mode).last();

    await modeOption.click();
    await this.yesButton.click();
  }

  async cyclePlayStoreMode(modes: string[]): Promise<string> {
    const currentMode = await this.getCurrentPlayStoreMode(modes);
    const currentIndex = modes.indexOf(currentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    await this.selectPlayStoreMode(nextMode);
    await this.saveButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );

    return nextMode;
  }

  async cycleAllPlayStoreModes(modes: string[]): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < modes.length; i++) {
      const nextMode = await this.cyclePlayStoreMode(modes);
      results.push(nextMode);
    }

    return results;
  }

  async saveChanges(): Promise<void> {
    await this.saveButton.click();
  }

  async confirmAction(): Promise<void> {
    await this.okButton.click();
  }

  async confirmWithYes(): Promise<void> {
    await this.yesButton.click();
  }
}
