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

  async navigateToWifiNetworks(): Promise<void> {
    await this.page
      .getByRole("link", {
        name: globalEnrollmentData.navigation.wifiNetworks,
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
    selectorId: string,
    option1: string,
    option2: string
  ): Promise<void> {
    const selector = this.page.locator(
      `.ant-select-selector:has(#${selectorId})`
    );
    const currentSelectionText = await selector
      .locator(".ant-select-selection-item")
      .textContent();
    const currentSelection = currentSelectionText?.trim() || "";
    const targetOption = currentSelection === option1 ? option2 : option1;

    await selector.click();

    try {
      await this.page
        .locator(`#${selectorId}`)
        .fill(targetOption, { timeout: 2000 });
    } catch (error) {
      console.log(
        `Selector ${selectorId} is readonly, clicking option directly`
      );
    }
    await this.page
      .locator(".ant-select-item-option-content")
      .filter({ hasText: targetOption })
      .first()
      .click();
  }

  async toggleLanguage(option1: string, option2: string): Promise<void> {
    await this.toggleSelector("locale", option1, option2);
  }

  async toggleTimezone(option1: string, option2: string): Promise<void> {
    await this.toggleSelector("timezone", option1, option2);
  }

  async toggleWifiNetwork(option1: string, option2: string): Promise<void> {
    await this.toggleSelector("wifi-network-selector", option1, option2);
  }

  async toggleWifiSecurity(option1: string, option2: string): Promise<void> {
    await this.toggleSelector("wifi-security-selector", option1, option2);
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

  async createWifiNetwork(name: string): Promise<void> {
    await this.page
      .getByRole("button", { name: globalEnrollmentData.buttons.createPlus })
      .click();
    await this.page.getByRole("textbox", { name: "* Name" }).fill(name);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async configureWifiSecurity(
    password: string,
    protocol: string = "WEP-PSK"
  ): Promise<void> {
    const securityDropdown = this.page
      .locator(".ant-select-selector")
      .filter({ hasText: "Select security protocol" });

    await securityDropdown.waitFor({ state: "visible" });

    await expect(
      securityDropdown.locator(
        'xpath=ancestor::div[@class[contains(., "ant-select")]]'
      )
    ).not.toHaveClass(/ant-select-disabled/);

    await securityDropdown.click();

    await this.page
      .locator(".ant-select-item-option-content")
      .filter({ hasText: protocol })
      .click();

    await this.page.getByRole("textbox", { name: "Password" }).fill(password);

    await this.page
      .getByRole("button", { name: globalEnrollmentData.buttons.save })
      .click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async searchWifiByName(name: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Filter by name" }).fill(name);
  }

  async deleteWifiNetwork(name: string): Promise<void> {
    await this.page.getByRole("row", { name }).getByLabel("").check();
    await this.page
      .getByRole("button", { name: globalEnrollmentData.buttons.remove })
      .click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async refreshTable(): Promise<void> {
    await this.page.getByRole("button", { name: "Refresh" }).click();
  }
}
