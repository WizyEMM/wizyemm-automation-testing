import { Page, expect } from "@playwright/test";

export class IntegrationPage {
  constructor(private page: Page) {}

  async navigateToProfile(profileName: string) {
    await this.page.getByRole("link", { name: "Profile Management" }).click();
    await this.page.locator("table").waitFor({ state: "visible" });

    const searchBox = this.page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.click();
    await this.page.getByRole("button", { name: "Refresh" }).click();
    await searchBox.fill(profileName);

    await this.page
      .getByRole("link", { name: profileName, exact: true })
      .waitFor({ state: "visible" });

    await this.page
      .getByRole("link", { name: profileName, exact: true })
      .click();

    await expect(this.page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );
  }

  async navigateToConfiguration(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Configuration" }).click();
  }

  async navigateToAdvanced(): Promise<void> {
    await this.page.getByRole("link", { name: "Advanced" }).click();
  }

  async toggleAllOEMIntegrations(enable: boolean): Promise<void> {
    await this.navigateToConfiguration();
    await this.navigateToAdvanced();

    const oemHeader = this.page
      .getByRole("button")
      .filter({ hasText: "OEM Integrations" });
    const isExpanded = await oemHeader.getAttribute("aria-expanded");

    if (isExpanded !== "true") {
      await oemHeader.click();
    }
    const switches = this.page
      .getByRole("listitem")
      .filter({
        hasText: /Show (Datalogic|Honeywell|M3 Mobile|Samsung|Urovo|Zebra)/,
      })
      .getByRole("switch");

    const count = await switches.count();
    for (let i = 0; i < count; i++) {
      const switchElement = switches.nth(i);
      const isChecked = await switchElement.getAttribute("aria-checked");
      const currentState = isChecked === "true";
      if (currentState !== enable) {
        await switchElement.click();
      }
    }
  }

  async navigateToTab(tabName: "Knox" | "Zebra" | "Datalogic" | "Honeywell") {
    await this.page.getByRole("tab", { name: tabName }).click();
  }

  async resetConfiguration() {
    await this.page.getByRole("button", { name: "Reset", exact: true }).click();
    await this.page.getByRole("button", { name: "OK" }).click();
  }

  async saveConfiguration() {
    await this.page.getByRole("button", { name: "Save" }).click();
  }

  async waitForUpdateSuccess() {
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }

  async searchForSetting(searchTerm: string) {
    const searchBox = this.page.getByRole("textbox", { name: "Press Enter" });
    await searchBox.click();
    await searchBox.fill(searchTerm);
    await searchBox.press("Enter");
  }

  async searchKnoxSetting(searchTerm: string) {
    const searchBox = this.page.getByRole("textbox", {
      name: "Press Enter to search for",
    });
    await searchBox.click();
    await searchBox.fill(searchTerm);
    await this.page.getByRole("button", { name: "Refresh" }).click();
  }

  async toggleFirstSwitch() {
    await this.page.locator(".ant-switch").first().click();
  }

  async resetAdvancedRestrictionPolicies() {
    await this.page
      .getByRole("button", {
        name: "Advanced Restriction policies (Premium) undo Reset Bundle",
      })
      .getByRole("button")
      .click();
    await this.page.getByRole("button", { name: "OK" }).click();
  }

  async openZebraStep() {
    await this.page.getByRole("button", { name: "Open Step" }).click();
    await expect(
      this.page.getByRole("textbox", { name: "Press Enter" })
    ).toBeVisible();
  }

  async verifyZebraSettingVisible(settingName: string) {
    await expect(this.page.getByText(settingName)).toBeVisible();
  }

  async submitZebraConfiguration() {
    await this.page.getByRole("button", { name: "Submit" }).click();
  }

  async toggleDatalogicBluetoothRadio() {
    await this.page
      .getByRole("listitem")
      .filter({ hasText: /^Enable\/disable the Bluetooth radio$/ })
      .getByRole("switch")
      .click();
  }

  async saveDatalogicSetting() {
    await this.page.getByRole("button", { name: "Save" }).click();
  }

  async resetDatalogicBluetooth() {
    await this.page
      .getByRole("button", { name: "Bluetooth undo Reset" })
      .getByRole("button")
      .click();
  }

  async setHoneywellBluetoothToEnable() {
    const header = this.page
      .getByRole("button")
      .filter({ hasText: "Restrict Bluetooth" })
      .filter({ hasNotText: "Quick Menu" })
      .first();

    const isExpanded = await header.getAttribute("aria-expanded");

    if (isExpanded !== "true") {
      await header.click();
      await this.page.waitForTimeout(500);
    }

    await header
      .locator("..")
      .getByRole("radio", { name: "Enable" })
      .first()
      .check();
  }

  async resetHoneywellRestrictions() {
    await this.page
      .getByRole("button", { name: "Restrictions undo Reset" })
      .getByRole("button")
      .click();
    await this.page.getByRole("button", { name: "OK", exact: true }).click();
  }
}
