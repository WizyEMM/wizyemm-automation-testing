import { Page, Locator, expect } from "@playwright/test";

export class NotificationsPage {
  readonly page: Page;
  readonly configureLink: Locator;
  readonly bellNotificationSwitch: Locator;
  readonly emailNotificationSwitch: Locator;
  readonly emailFrequencySelector: Locator;
  readonly updateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.configureLink = page.getByRole("link", { name: "Configure" });
    this.bellNotificationSwitch = page.locator("#byBellNotificationSwitch");
    this.emailNotificationSwitch = page.locator("#byEmailNotificationSwitch");
    this.emailFrequencySelector = page.locator("#emailFrequencySelector");
    this.updateButton = page.getByRole("button", { name: "Update" });
  }

  async navigateToNotifications() {
    await this.page.getByRole("menuitem", { name: "Notifications" }).click();
  }

  async openConfiguration() {
    await this.configureLink.click();
  }

  async toggleBellNotifications() {
    await this.bellNotificationSwitch.click();
  }

  async toggleEmailNotifications() {
    await this.emailNotificationSwitch.click();
  }

  async ensureEmailNotificationsEnabled() {
    if (!(await this.emailNotificationSwitch.isChecked())) {
      await this.emailNotificationSwitch.click();
    }
  }

  async updateSettings() {
    await this.updateButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/administrators/me") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async isEmailFrequencySelectorEnabled(): Promise<boolean> {
    return await this.emailFrequencySelector.isEnabled();
  }

  async openEmailFrequencyDropdown() {
    const frequencyDropdown = this.page.locator(
      '.ant-select-selection-item[title="By day"]'
    );
    await frequencyDropdown.click();
  }

  async getVisibleFrequencyOptions(): Promise<string[]> {
    const options = await this.page
      .locator(".ant-select-item-option-content")
      .allTextContents();
    return options;
  }
}
