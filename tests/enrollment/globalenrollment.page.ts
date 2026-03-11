import { Page, Locator, expect } from "@playwright/test";
import { globalEnrollmentData } from "./globalenrollmentdata";

export class globalEnrollmentPage {
  readonly page: Page;

  readonly globalQRCodeLink: Locator;
  readonly systemAppsCheckbox: Locator;
  readonly wifiHiddenCheckbox: Locator;
  readonly useMobileDataCheckbox: Locator;
  readonly updateQRButton: Locator;
  readonly okButton: Locator;
  readonly successMessage: Locator;
  readonly enrollmentLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.globalQRCodeLink = page.getByRole("menuitem", {
      name: globalEnrollmentData.navigation.globalQRCode,
    });
    this.enrollmentLink = page.getByRole("menuitem", {
      name: globalEnrollmentData.navigation.enrollment,
    });
    this.systemAppsCheckbox = page.getByRole("checkbox", {
      name: globalEnrollmentData.checkboxes.systemApps,
    });
    this.wifiHiddenCheckbox = page.getByRole("checkbox", {
      name: globalEnrollmentData.checkboxes.wifiHidden,
    });
    this.useMobileDataCheckbox = page.getByRole("checkbox", {
      name: globalEnrollmentData.checkboxes.useMobileData,
    });
    this.updateQRButton = page.getByRole("button", {
      name: globalEnrollmentData.buttons.updateQRCode,
    });
    this.okButton = page.getByRole("button", {
      name: globalEnrollmentData.buttons.ok,
    });
    this.successMessage = page.getByText(
      globalEnrollmentData.messages.updateSuccess
    );
  }

  async navigateToEnrollment(): Promise<void> {
    await this.enrollmentLink.click();
  }

  async navigateToGlobalQRCode(): Promise<void> {
    await this.globalQRCodeLink.click();
  }

  async navigateToConfiguration(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: globalEnrollmentData.navigation.configuration,
      })
      .click();
  }

  async toggleCheckbox(checkbox: Locator): Promise<void> {
    const isChecked = await checkbox.isChecked();
    await checkbox.setChecked(!isChecked);
  }

  async toggleSystemApps(): Promise<void> {
    await this.toggleCheckbox(this.systemAppsCheckbox);
  }

  async toggleWifiHidden(): Promise<void> {
    await this.toggleCheckbox(this.wifiHiddenCheckbox);
  }

  async toggleUseMobileData(): Promise<void> {
    await this.toggleCheckbox(this.useMobileDataCheckbox);
  }

  async toggleSelector(
    selectorLocator: Locator,
    option1: string,
    option2: string
  ): Promise<void> {
    // Get current selection
    const currentSelectionText = await selectorLocator
      .locator(".ant-select-selection-item")
      .textContent();
    const currentSelection = currentSelectionText?.trim() || "";
    const targetOption = currentSelection === option1 ? option2 : option1;

    // Click to open dropdown
    await selectorLocator.click();
    await this.page.waitForTimeout(500);

    // Wait for dropdown options to appear
    const option = this.page
      .locator(".ant-select-item-option-content")
      .filter({ hasText: new RegExp(`^${targetOption}$`) })
      .first();
    
    await option.waitFor({ state: "visible", timeout: 5000 });
    
    // Scroll to and click the option
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await this.page.waitForTimeout(500);
  }

  async toggleLanguage(option1: string, option2: string): Promise<void> {
    const selector = this.page.locator("//input[@id='locale']/ancestor::div[@class[contains(., 'ant-select-selector')]]");
    await this.toggleSelector(selector, option1, option2);
  }

  async toggleTimezone(option1: string, option2: string): Promise<void> {
    const selector = this.page.locator("//input[@id='timezone']/ancestor::div[@class[contains(., 'ant-select-selector')]]");
    await this.toggleSelector(selector, option1, option2);
  }

  async toggleWifiNetwork(option1: string, option2: string): Promise<void> {
    const selector = this.page.locator("//input[@id='wifi-network-selector']/ancestor::div[@class[contains(., 'ant-select-selector')]]");
    await this.toggleSelector(selector, option1, option2);
  }

  async toggleWifiSecurity(option1: string, option2: string): Promise<void> {
    const selector = this.page.locator("//input[@id='wifi-security-selector']/ancestor::div[@class[contains(., 'ant-select-selector')]]");
    await this.toggleSelector(selector, option1, option2);
  }

  async updateQRCode(): Promise<void> {
    await this.updateQRButton.click();
  }

  async confirmUpdate(): Promise<void> {
    await this.okButton.click();
  }

  async completeQRCodeUpdate(): Promise<void> {
    await this.updateQRCode();
    await this.confirmUpdate();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/signin-details/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }
}
