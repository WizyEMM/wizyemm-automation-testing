import { Page, expect } from "@playwright/test";
import { userConfigurationData } from "./userconfigurationdata";

export class UserConfigurationPage {
  constructor(private page: Page) {}

  private get createButton() {
    return this.page.getByRole("button", { name: "Create" });
  }

  private get createPlusButton() {
    return this.page.getByRole("button", { name: "plus Create" });
  }

  private get okButton() {
    return this.page.getByRole("button", { name: "OK" });
  }

  private get removeButton() {
    return this.page.getByRole("button", { name: "Remove" });
  }

  private get refreshButton() {
    return this.page.getByRole("button", { name: "Refresh" });
  }

  private get applyButton() {
    return this.page.getByRole("button", { name: "Apply" });
  }

  private get resetButton() {
    return this.page.getByRole("button", { name: "Reset" });
  }

  private getFilterButton(columnName: "Type" | "Source") {
    return this.page
      .getByRole("cell", { name: `${columnName} filter` })
      .getByRole("button", { name: "filter" });
  }

  private get controlButton() {
    return this.page.getByRole("button", { name: "control" });
  }

  private get saveButton() {
    return this.page.getByRole("button", { name: "save Save" });
  }

  private get addActionButton() {
    return this.page.getByRole("button", { name: "plus Add action" });
  }

  async navigateToConfiguration(): Promise<void> {
    await this.page
      .getByRole("menuitem", {
        name: userConfigurationData.navigation.configuration,
      })
      .click();
  }

  async navigateToUsers() {
    await this.page
      .getByRole("menuitem", { name: userConfigurationData.navigation.users })
      .click();
  }

  async navigateToWifiNetworks() {
    await this.page
      .getByRole("link", {
        name: userConfigurationData.navigation.wifiNetworks,
      })
      .click();
  }

  async navigateToBundledActions() {
    await this.page
      .getByRole("link", {
        name: userConfigurationData.navigation.bundledActions,
      })
      .click();
  }

  async navigateToAdvanced() {
    await this.page
      .getByRole("link", { name: userConfigurationData.navigation.advanced })
      .click();
  }

  async sortUserColumns() {
    await this.clickSortColumn("Username");
    await this.clickSortColumn("Email");
    await this.clickSortColumn("First Name");
    await this.clickSortColumn("Last Name");
    await this.clickSortColumn("Devices");
  }

  async filterByUserType(userType: "Regular" | "Staging") {
    await this.getFilterButton("Type").click();
    await this.page
      .getByRole("menuitem", { name: userType })
      .getByLabel("")
      .check();
    await this.okButton.click();
  }

  async uncheckFilterByUserType(userType: "Regular" | "Staging") {
    await this.getFilterButton("Type").click();
    await this.page
      .getByRole("menuitem", { name: userType })
      .getByLabel("")
      .uncheck();
    await this.okButton.click();
  }

  async resetFilter() {
    await this.getFilterButton("Type").click();
    await this.resetButton.click();
    await this.okButton.click();
  }

  async toggleTableColumnVisibility() {
    await this.controlButton.click();
    await this.page
      .locator(
        ".ant-tree-treenode.ant-tree-treenode-switcher-close.ant-tree-treenode-checkbox-checked.ant-tree-treenode-leaf-last > .ant-tree-checkbox"
      )
      .click();
    await this.applyButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("firestore.googleapis.com") &&
        resp.url().includes("/Write/channel") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }

  async toggleAnotherTableColumn() {
    await this.page
      .locator(
        "div:nth-child(8) > .ant-tree-checkbox > .ant-tree-checkbox-inner"
      )
      .click();
    await this.applyButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("firestore.googleapis.com") &&
        resp.url().includes("/Write/channel") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }

  async createUser(userData: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
  }) {
    await this.createButton.click();
    await this.page
      .getByRole("textbox", { name: "* Username :" })
      .fill(userData.username);
    await this.page
      .getByRole("textbox", { name: "Password :", exact: true })
      .fill(userData.password);
    await this.page
      .getByRole("textbox", { name: "* Confirm Password :", exact: true })
      .fill(userData.password);
    await this.page
      .getByRole("textbox", { name: "First Name :" })
      .fill(userData.firstName);
    await this.page
      .getByRole("textbox", { name: "Last Name :" })
      .fill(userData.lastName);
    await this.page
      .getByRole("textbox", { name: "* Email :" })
      .fill(userData.email);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/users") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async searchUserByEmail(email: string) {
    await this.page
      .getByRole("textbox", { name: "Filter by email" })
      .fill(email);
  }

  async updateUser(username: string, firstName: string, lastName: string) {
    await this.page.getByText(username).click();
    await this.page
      .getByRole("textbox", { name: "First Name :" })
      .fill(firstName);
    await this.page
      .getByRole("textbox", { name: "Last Name :" })
      .fill(lastName);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/users/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async deleteUser(username: string) {
    await this.page
      .getByRole("row", { name: username })
      .getByRole("checkbox")
      .check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/users/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async refreshTable() {
    await this.refreshButton.click();
  }

  async createWifiNetwork(name: string) {
    await this.createPlusButton.click();
    await this.page.getByRole("textbox", { name: "* Name" }).click();
    await this.page.getByRole("textbox", { name: "* Name" }).fill(name);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async configureWifiSecurity(password: string, protocol: string = "WEP-PSK") {
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
    await this.saveButton.click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async searchWifiByName(name: string) {
    await this.page.getByRole("textbox", { name: "Filter by name" }).click();
    await this.page.getByRole("textbox", { name: "Filter by name" }).fill(name);
  }

  async updateWifiNetwork(oldName: string, newName: string, newSsid: string) {
    await this.page.getByRole("link", { name: oldName }).click();
    await this.page.getByRole("textbox", { name: "* Name" }).click();
    await this.page.getByRole("textbox", { name: "* Name" }).click();
    await this.page.getByRole("textbox", { name: "* Name" }).fill(newName);
    await this.page.getByRole("textbox", { name: "* SSID" }).click();
    await this.page.getByRole("textbox", { name: "* SSID" }).fill(newSsid);
    await this.saveButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async deleteWifiNetwork(name: string) {
    await this.page.getByRole("row", { name }).getByLabel("").check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async createBundledAction(name: string) {
    await this.createPlusButton.click();
    await this.page.getByRole("textbox", { name: "* Name" }).click();
    await this.page.getByRole("textbox", { name: "* Name" }).fill(name);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/device-actions") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async addActionToBundledAction(actionType: string) {
    await this.addActionButton.click();
    await this.page.locator(".ant-select-selector").first().click();
    await this.page.getByText(actionType).click();
    await this.saveButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/device-actions/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async toggleManufacturerVisibility(manufacturer: string) {
    const toggle = this.page
      .getByRole("listitem")
      .filter({ hasText: manufacturer })
      .getByRole("switch");
    await toggle.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/settings/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async clickSortColumn(columnName: string, reps: number = 3) {
    const locator = this.page
      .locator("#app")
      .getByText(columnName, { exact: true });
    for (let i = 0; i < reps; i++) {
      await locator.click();
    }
  }
}
