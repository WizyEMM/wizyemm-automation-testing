import { Page, expect } from "@playwright/test";
import { time } from "console";

export class ProfileEnrollmentPage {
  constructor(private page: Page) {}

  async navigateToEnrollmentTab() {
    await this.page.getByRole("tab", { name: "Enrollment" }).click();
  }

  async toggleSystemApplications() {
    await this.page
      .getByRole("checkbox", { name: "Enable system applications" })
      .click();
  }

  async selectLocale(locale: string) {
    await this.page.getByRole("combobox", { name: "Locale :" }).click();
    await this.page.getByRole("combobox", { name: "Locale :" }).fill(locale);
    await this.page.getByText(locale).click();
  }

  async selectTimezone(timezone: string) {
    const combobox = this.page.getByRole("combobox", { name: "Time Zone :" });
    await combobox.click();
    await combobox.fill(timezone);
    await combobox.press("Enter");
  }

  async selectWifiNetwork(networkName: string) {
    const selector = "#wifi-network-selector";
    await this.page.locator(".ant-select").first().click();
    await this.page.locator(selector).fill(networkName);
    await this.page.waitForSelector(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
      {
        state: "attached",
      }
    );

    await this.page.locator(selector).press("Enter");
  }

  async toggleMobileData() {
    await this.page.getByRole("checkbox", { name: "Use Mobile Data" }).click();
  }

  async toggleWifiHidden() {
    await this.page.getByRole("checkbox", { name: "Wi-Fi Hidden" }).click();
  }

  async saveEnrollmentSettings() {
    await this.page.getByRole("button", { name: "Save" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }

  async verifyEnrollmentTokenVisible() {
    await expect(this.page.getByText("Enrollment Token")).toBeVisible();
    await expect(this.page.getByText("Regenerate")).toBeVisible();
  }

  async regenerateEnrollmentToken() {
    await this.page.getByRole("button", { name: "reload Regenerate" }).click();
    await this.page.getByRole("button", { name: "OK" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/qrcodes/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async configureEnrollmentSettings(config: {
    locale: string;
    timezone: string;
    wifiNetwork: string;
    enableSystemApps?: boolean;
    useMobileData?: boolean;
    wifiHidden?: boolean;
  }) {
    await this.navigateToEnrollmentTab();

    if (config.enableSystemApps) {
      await this.toggleSystemApplications();
    }

    await this.selectLocale(config.locale);
    await this.selectTimezone(config.timezone);
    await this.selectWifiNetwork(config.wifiNetwork);

    if (config.useMobileData) {
      await this.toggleMobileData();
    }

    if (config.wifiHidden) {
      await this.toggleWifiHidden();
    }

    await this.saveEnrollmentSettings();
  }

  async createWiFiNetwork(wifiNetwork: string): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Configuration" }).click();
    await this.page.getByRole("link", { name: "Wi-Fi Networks" }).click();
    await this.page.getByRole("button", { name: "Create" }).click();
    await this.page.locator("#name").fill(wifiNetwork);
    await this.page.getByRole("button", { name: "OK" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async deleteWiFiNetwork(wifiName: string): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Configuration" }).click();
    await this.page.getByRole("link", { name: "Wi-Fi Networks" }).click();

    await this.page
      .locator("#tableWifiNetworksColumns-search-input")
      .fill(wifiName);
    await this.page.keyboard.press("Enter");
    await this.page.getByRole("button", { name: "Refresh" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") && resp.status() === 200
    );

    await this.page.locator('input[type="checkbox"]').first().check();
    await this.page.getByRole("button", { name: "Remove" }).click();
    await this.page.getByRole("button", { name: "OK" }).click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }
}
