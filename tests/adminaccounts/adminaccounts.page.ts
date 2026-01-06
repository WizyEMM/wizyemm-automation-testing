import { Page, Locator, expect } from "@playwright/test";
import { adminAccountsData } from "./adminaccountsdata";
import {
  applyAdminRoleFilters,
  resetAdminFilters,
  waitForAdminSuccessMessage,
  waitForAdminTable,
  buildAdminEmail,
} from "./adminaccounts.helpers";

export interface AdminUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  label?: string;
  profileLabel?: string;
}

export class AdminAccountsPage {
  private readonly page: Page;

  private readonly createButton: Locator;
  private readonly removeButton: Locator;
  private readonly refreshButton: Locator;
  private readonly okButton: Locator;
  private readonly searchInput: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly roleDropdown: Locator;
  private readonly profileInput: Locator;
  private readonly profileLabelInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByRole("button", { name: "Create" });
    this.removeButton = page.getByRole("button", { name: "Remove" });
    this.refreshButton = page.getByRole("button", { name: "Refresh" });
    this.okButton = page.getByRole("button", { name: "OK" });
    this.searchInput = page.locator("#tableAdministratorsColumns-search-input");
    this.firstNameInput = page.locator("#firstName");
    this.lastNameInput = page.locator("#lastName");
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.confirmPasswordInput = page.locator("#confirmPassword");
    this.roleDropdown = page.locator("#create-admin-role");
    this.profileInput = page.locator("#profile");
    this.profileLabelInput = page.locator("#name");
  }

  async createProfile(): Promise<void> {
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.profileManagementLink,
      })
      .click();
    await waitForAdminTable(this.page);
    await this.createButton.click();
    await this.profileLabelInput.fill(
      adminAccountsData.users.regionalAdmin.profileLabel
    );
    await this.page
      .locator('input[type="radio"][value="FULLY_MANAGED"]')
      .check();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async deleteProfile(): Promise<void> {
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.profileManagementLink,
      })
      .click();
    await this.page
      .locator("#tableProfilesColumns-search-input")
      .fill(adminAccountsData.users.regionalAdmin.profileLabel);
    await this.page.keyboard.press("Enter");
    await this.page.locator('input[type="checkbox"]').first().check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async createWiFiNetwork(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: adminAccountsData.navigation.configurationLink,
      })
      .click();
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.wifiNetworksLink,
      })
      .waitFor({ state: "visible" });
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.wifiNetworksLink,
      })
      .click();
    await this.createButton.click();
    const wifiDialog = this.page
      .locator('[role="dialog"]')
      .filter({ hasText: "New Wi-Fi Network" });
    await wifiDialog.waitFor({ state: "visible" });
    await wifiDialog.locator("#name").fill(adminAccountsData.labels.wifiLabel);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async deleteWiFiNetwork(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: adminAccountsData.navigation.configurationLink,
      })
      .click();
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.wifiNetworksLink,
      })
      .waitFor({ state: "visible" });
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.wifiNetworksLink,
      })
      .click();
    await this.page
      .locator("#tableWifiNetworksColumns-search-input")
      .fill(adminAccountsData.labels.wifiLabel);
    await this.page.keyboard.press("Enter");
    await this.refreshButton.click();
    await this.page.locator('input[type="checkbox"]').first().check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async createLabel(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: adminAccountsData.navigation.fleetManagementLink,
      })
      .click();
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.androidDeviceListLink,
      })
      .waitFor({ state: "visible" });
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.androidDeviceListLink,
      })
      .click();
    const manageLabelsButton = this.page.getByRole("button", {
      name: "Manage Labels",
    });
    await manageLabelsButton.waitFor({ state: "visible", timeout: 10000 });

    await manageLabelsButton.click();
    await this.createButton.click();
    await this.page
      .locator("#name")
      .fill(adminAccountsData.users.regionalAdmin.label);
    await this.page.getByText("Red", { exact: true }).click();
    const wifiSelector = this.page.locator("#wifi-network-selector");
    await wifiSelector.click();
    await wifiSelector.waitFor({ state: "visible" });
    await wifiSelector.fill(adminAccountsData.labels.wifiLabel);
    const wifiOptionName = `${adminAccountsData.labels.wifiLabel} (${adminAccountsData.labels.wifiLabel})`;
    const wifiOptions = this.page.getByRole("option", { name: wifiOptionName });
    const optionCount = await wifiOptions.count();

    if (optionCount === 0) {
      throw new Error(`WiFi option '${wifiOptionName}' not found in dropdown`);
    }

    const optionToSelect =
      optionCount >= 3
        ? wifiOptions.first()
        : this.getDropdownOption(wifiOptionName);

    await optionToSelect.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels") &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
  }

  async deleteLabel(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: adminAccountsData.navigation.fleetManagementLink,
      })
      .click();
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.androidDeviceListLink,
      })
      .waitFor({ state: "visible" });
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.androidDeviceListLink,
      })
      .click();
    await this.page.getByRole("button", { name: "Manage Labels" }).click();
    await this.page.getByRole("button", { name: "Edit/Delete" }).click();
    const dialog = this.page.getByLabel("Manage Labels");
    await dialog.waitFor({ state: "visible" });
    await this.page
      .locator("#undefined-labels-search-input")
      .fill(adminAccountsData.users.regionalAdmin.label);
    await this.page.keyboard.press("Enter");
    const spinner = dialog.locator('svg[data-icon="loading"]');
    await spinner.waitFor({ state: "visible" }).catch(() => {});
    await spinner.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    await dialog.getByRole("button", { name: "Refresh" }).click();
    await spinner.waitFor({ state: "visible" }).catch(() => {});
    await spinner.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    await dialog
      .getByText(adminAccountsData.users.regionalAdmin.label)
      .waitFor({
        state: "visible",
        timeout: 5000,
      });
    const tableBody = dialog.locator("tbody");
    await tableBody.locator('input[type="checkbox"]').first().check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
    await dialog.getByRole("button", { name: "Close" }).last().click();
    await dialog.waitFor({ state: "detached" });
  }

  async cleanupTest(): Promise<void> {
    const cancelButton = this.page.getByRole("button", { name: "Cancel" });
    if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelButton.click();
      await this.page.locator(".ant-modal-wrap").waitFor({ state: "detached" });
    }
  }

  async navigateToAdminAccounts(): Promise<void> {
    await this.page
      .getByRole("link", {
        name: adminAccountsData.navigation.adminAccountsLink,
      })
      .click();
  }

  async sortByColumn(columnName: string, times: number = 3): Promise<void> {
    const columnLocator = this.page
      .locator("#app")
      .getByText(columnName, { exact: true });

    for (let i = 0; i < times; i++) {
      await columnLocator.click();
      await waitForAdminTable(this.page);
    }
  }

  async applyRoleFilters(filters: readonly string[]): Promise<void> {
    await applyAdminRoleFilters(this.page, "filter", filters);
  }

  async resetFilters(filterName: string): Promise<void> {
    await resetAdminFilters(this.page, filterName);
  }

  async openCreateDialog(): Promise<void> {
    await this.createButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: "visible" });
    await this.firstNameInput.waitFor({ state: "visible" });
    await this.roleDropdown.waitFor({ state: "attached", timeout: 5000 });
  }

  async fillUserBasicInfo(user: AdminUser): Promise<void> {
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.emailInput.fill(user.email);
  }

  async selectRole(role: string): Promise<void> {
    await this.roleDropdown.click();
    await this.page.getByTitle(role).locator("div").click();
  }

  async selectRoleById(roleId: string): Promise<void> {
    await this.roleDropdown.click();
    await this.page.locator(`#${roleId}`).locator("div").click();
  }

  async selectLabel(labelText: string): Promise<void> {
    await this.page.locator("#selector-label-0").click();
    await this.page.locator("#selector-label-0").fill(labelText);
    await this.getDropdownOption(labelText, 1).click();
  }

  async selectProfile(profileLabel: string): Promise<void> {
    await this.profileInput.click();
    await this.profileInput.fill(profileLabel);
    await this.getDropdownOption(profileLabel, 1).click();
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
  }

  async submitUserCreation(): Promise<void> {
    await this.okButton.click();
    await this.page.locator('[role="dialog"]').waitFor({
      state: "detached",
      timeout: 10000,
    });
  }

  async createSuperAdmin(user: AdminUser): Promise<void> {
    await this.openCreateDialog();
    await this.fillUserBasicInfo(user);
    await this.selectRole(user.role);
    await this.fillPassword(user.password);
    await this.submitUserCreation();
    await waitForAdminTable(this.page);
  }

  async createRegionalAdmin(user: AdminUser): Promise<void> {
    await this.openCreateDialog();
    await this.fillUserBasicInfo(user);
    await this.selectRoleById(user.role);

    if (user.label) {
      await this.selectLabel(user.label);
    }

    if (user.profileLabel) {
      await this.selectProfile(user.profileLabel);
    }

    await this.fillPassword(user.password);
    await this.submitUserCreation();
    await waitForAdminTable(this.page);
  }

  async searchUser(email: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(email);
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/administrators") &&
        resp.status() === 200 &&
        resp.request().method() === "GET"
    );
  }

  async selectUserByName(firstName: string, lastName: string): Promise<void> {
    await this.page
      .getByRole("row", { name: `${firstName} ${lastName}` })
      .getByLabel("")
      .check();
  }

  async selectUserByEmail(email: string): Promise<void> {
    await waitForAdminTable(this.page);

    const row = this.page.getByRole("row").filter({ hasText: email });
    await row.locator('input[type="checkbox"]').check();
  }

  async deleteSelectedUser(): Promise<void> {
    await this.removeButton.click();
    await this.okButton.click();
  }

  async refreshTable(): Promise<void> {
    await this.refreshButton.click();
  }

  async verifyUserExists(email: string): Promise<void> {
    await this.page.keyboard.press("Escape");
    await waitForAdminTable(this.page);
    await expect(
      this.page.getByRole("row").filter({ hasText: email })
    ).toBeVisible();
  }

  async verifyUserNotExists(email: string): Promise<void> {
    await expect(this.page.getByText(email)).not.toBeVisible();
  }

  generateUniqueEmail(prefix: string, domain: string): string {
    return buildAdminEmail(prefix, domain);
  }

  private getDropdownOption(value: string, occurrence: number = 0): Locator {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactMatch = new RegExp(`^${escaped}$`);
    return this.page
      .locator("div")
      .filter({ hasText: exactMatch })
      .nth(occurrence);
  }
}
