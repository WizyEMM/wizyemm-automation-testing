import { Page, Locator } from "@playwright/test";

export class fleetManagementPage {
  readonly page: Page;

  private readonly fleetManagementMenu: Locator;
  private readonly fleetTrackingMenu: Locator;
  private readonly applicationLogsLink: Locator;
  private readonly geolocationLink: Locator;
  private readonly geofencingLink: Locator;

  private readonly refreshButton: Locator;
  private readonly filterButton: Locator;
  private readonly controlButton: Locator;
  private readonly okButton: Locator;
  private readonly resetButton: Locator;
  private readonly applyButton: Locator;
  private readonly createButton: Locator;
  private readonly removeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.fleetManagementMenu = page.getByText("Fleet Management");
    this.fleetTrackingMenu = page.getByText("Fleet Tracking");
    this.applicationLogsLink = page.getByRole("link", {
      name: "Application Logs",
    });
    this.geolocationLink = page.getByRole("link", { name: "Geolocation" });
    this.geofencingLink = page.getByRole("link", { name: "Geofencing" });

    this.refreshButton = page.getByRole("button", { name: "Refresh" });
    this.filterButton = page.getByRole("button", { name: "filter" });
    this.controlButton = page.getByRole("button", { name: "control" });
    this.okButton = page.getByRole("button", { name: "OK" });
    this.resetButton = page.getByRole("button", { name: "Reset" });
    this.applyButton = page.getByRole("button", { name: "Apply" });
    this.createButton = page.getByRole("button", { name: "Create" });
    this.removeButton = page.getByRole("button", { name: "Remove" });
  }

  async navigateToApplicationLogs() {
    await this.fleetManagementMenu.click();
    await this.applicationLogsLink.click();
  }

  async navigateToGeolocation() {
    await this.fleetTrackingMenu.click();
    await this.geolocationLink.click();
  }

  async navigateToGeofencing() {
    await this.fleetTrackingMenu.click();
    await this.geofencingLink.click();
  }

  async navigateToConfiguration() {
    await this.page
      .getByRole("menuitem", {
        name: "Configuration",
      })
      .click();
  }

  async navigateToWifiNetworks() {
    await this.page
      .getByRole("link", {
        name: "Wi-Fi Networks",
      })
      .click();
  }

  async navigateToAndroidDeviceList() {
    await this.fleetManagementMenu.click();
    await this.page
      .getByRole("link", {
        name: "Android Device List",
      })
      .click();
  }

  async clickRefresh() {
    await this.refreshButton.click();
  }

  async clickSortColumn(columnName: string, reps: number = 3) {
    const locator = this.page
      .locator("#app")
      .getByText(columnName, { exact: true });
    for (let i = 0; i < reps; i++) {
      await locator.click();
    }
  }

  async applyFilter(filterName: string, action: "check" | "uncheck") {
    await this.filterButton.click();
    const menuItem = this.page
      .getByRole("menuitem", { name: filterName })
      .getByLabel("");

    if (action === "check") {
      await menuItem.check();
    } else {
      await menuItem.uncheck();
    }

    await this.okButton.click();
  }

  async resetFilter(cellName: string) {
    await this.page
      .getByRole("cell", { name: cellName })
      .getByRole("button")
      .click();
    await this.resetButton.click();
    await this.okButton.click();
  }

  async sortApplicationLogsColumns(columns: string[]) {
    for (const column of columns) {
      await this.clickSortColumn(column);
    }
  }

  async applyApplicationLogFilters(
    filters: Array<{ name: string; action: "check" | "uncheck" }>
  ) {
    for (const filter of filters) {
      await this.applyFilter(filter.name, filter.action);
    }
  }

  async selectSmartLabel(labelText: string) {
    await this.page.locator(".ant-select-show-search").click();

    await this.page
      .locator(
        ".ant-select-show-search input.ant-select-selection-search-input"
      )
      .fill(labelText);

    await this.page
      .locator(".ant-select-item")
      .filter({ hasText: labelText })
      .click();
  }

  async searchLocation(locationName: string) {
    const searchBox = this.page.getByRole("textbox", {
      name: "Search location",
    });
    await searchBox.click();
    await searchBox.fill(locationName);
    await searchBox.press("Enter");
  }

  async openSideMenuAndSelectLabel(labelText: string) {
    await this.page.getByRole("button", { name: "menu-unfold" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });

    const combobox = dialog.getByRole("combobox");

    const currentText = await combobox.textContent();
    if (currentText?.includes(labelText)) {
      console.log(`Label "${labelText}" is already selected`);
      return;
    }
    await combobox.click();
    const searchInput = dialog.locator(
      "input[type='search'], input.ant-select-selection-search-input"
    );
    await searchInput.fill(labelText);

    await searchInput.press("Enter");
  }

  async applyColumnFilter(
    cellName: string,
    filterName: string,
    action: "check" | "uncheck"
  ) {
    await this.page
      .getByRole("cell", { name: cellName })
      .getByRole("button")
      .click();
    const menuItem = this.page
      .getByRole("menuitem", { name: filterName })
      .getByLabel("");

    if (action === "check") {
      await menuItem.check();
    } else {
      await menuItem.uncheck();
    }

    await this.okButton.click();
  }

  async applyMultipleColumnFilters(
    cellName: string,
    filters: Array<{ name: string; action: "check" | "uncheck" }>
  ) {
    for (const filter of filters) {
      await this.applyColumnFilter(cellName, filter.name, filter.action);
    }
  }

  async createWiFiNetwork(wifiName: string): Promise<void> {
    await this.navigateToConfiguration();
    await this.navigateToWifiNetworks();
    await this.createButton.click();
    await this.page.locator("#name").fill(wifiName);
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async searchWifiByName(name: string): Promise<void> {
    await this.page
      .locator("#tableWifiNetworksColumns-search-input")
      .fill(name);
    await this.page.keyboard.press("Enter");
  }

  async deleteWiFiNetwork(wifiName: string): Promise<void> {
    await this.navigateToConfiguration();
    await this.navigateToWifiNetworks();
    await this.searchWifiByName(wifiName);
    await this.refreshButton.click();
    await this.page.locator('input[type="checkbox"]').first().check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/wifi-networks/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
  }

  async createLabel(labelName: string, wifiName: string): Promise<void> {
    await this.navigateToAndroidDeviceList();
    await this.page.getByRole("button", { name: "Manage Labels" }).click();
    await this.createButton.click();
    await this.page.locator("#name").fill(labelName);
    await this.page.getByText("Red", { exact: true }).click();
    await this.page.locator("#wifi-network-selector").click();
    await this.page.locator("#wifi-network-selector").fill(wifiName);
    await this.page.getByText(`${wifiName} (${wifiName})`).click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
  }

  async deleteLabel(labelName: string): Promise<void> {
    await this.navigateToAndroidDeviceList();
    await this.page.getByRole("button", { name: "Manage Labels" }).click();
    await this.page.getByRole("button", { name: "Edit/Delete" }).click();
    const dialog = this.page.getByLabel("Manage Labels");
    await dialog.waitFor({ state: "visible" });
    await this.page.locator("#undefined-labels-search-input").fill(labelName);
    await this.page.keyboard.press("Enter");
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels") &&
        resp.status() === 200 &&
        resp.request().method() === "GET"
    );
    await dialog.getByRole("button", { name: "Refresh" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels") &&
        resp.status() === 200 &&
        resp.request().method() === "GET"
    );
    const tableBody = dialog.locator("tbody");
    await tableBody.locator('input[type="checkbox"]').first().check();
    await this.removeButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v2/labels/") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
    await dialog.getByRole("button", { name: "Close" }).last().click();
  }
}
