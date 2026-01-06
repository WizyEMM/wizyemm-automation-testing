import { Page, Locator, expect } from "@playwright/test";

export class ApplicationsPage {
  readonly page: Page;
  private readonly applicationsTab: Locator;
  private readonly chooseApplicationsButton: Locator;
  private readonly removeApplicationsButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly yesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.applicationsTab = page.getByRole("tab", { name: "Applications" });
    this.chooseApplicationsButton = page.getByRole("button", {
      name: "Choose Application",
    });
    this.removeApplicationsButton = page.getByRole("button", {
      name: "Remove Applications",
    });
    this.saveButton = page.getByRole("button", { name: "Save" });
    this.okButton = page.getByRole("button", { name: "OK" });
    this.yesButton = page.getByRole("button", { name: "Yes" });
  }

  async navigateToApplicationsTab(): Promise<void> {
    await this.applicationsTab.click();
  }

  async selectApplicationInModal(appName: string): Promise<void> {
    const modal = this.page.getByRole("dialog", {
      name: "Choose Applications",
    });

    const row = modal
      .locator("tr")
      .filter({ hasText: new RegExp(appName, "i") })
      .first();
    await expect(row).toBeVisible();
    const appCheckbox = row.locator('input[type="checkbox"]');
    await appCheckbox.click();
    await expect(appCheckbox).toBeChecked();
  }

  async selectApplication(appName: string): Promise<void> {
    const row = this.page
      .locator("tr")
      .filter({ hasText: new RegExp(appName, "i") });

    const appCheckbox = row.locator('input[type="checkbox"]').first();

    await appCheckbox.waitFor({ state: "visible" });
    await appCheckbox.click();
    await expect(appCheckbox).toBeChecked();
  }

  async searchApplication(searchTerm: string): Promise<void> {
    const searchBox = this.page.locator(
      "#tableChooseManagedApplicationsColumns-search-input"
    );
    await searchBox.click();
    await searchBox.fill(searchTerm);
    await this.page.getByRole("button", { name: "Refresh" }).click();
  }

  async selectApplicationById(appId: string): Promise<void> {
    const escapedId = appId.replace(/\./g, "\\.");
    const appCheckbox = this.page.locator(`#${escapedId}`);
    await appCheckbox.click();
    await expect(appCheckbox).toBeChecked();
  }

  async openChooseApplicationsModal(
    position: "first" | number = "first"
  ): Promise<void> {
    const buttons = this.page.getByRole("button", {
      name: "Choose Application",
    });
    if (position === "first") {
      await buttons.first().click();
    } else {
      await buttons.nth(position).click();
    }
  }

  async confirmApplicationSelection(): Promise<void> {
    await this.okButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.saveButton.waitFor({ state: "visible" });
    await expect(this.saveButton).toBeEnabled();

    const unsavedModal = this.page.getByText("You have unsaved changes");
    if (await unsavedModal.isVisible().catch(() => false)) {
      const leaveButton = this.page.getByRole("button", { name: "Leave" });
      await leaveButton.click();
      await unsavedModal.waitFor({ state: "hidden" });
      return;
    }

    await this.saveButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }

  async removeSelectedApplications(): Promise<void> {
    await this.removeApplicationsButton.click();
    await this.yesButton.click();
  }

  async addApplicationToWhitelist(
    appId: string,
    position: "first" | number = "first"
  ): Promise<void> {
    await this.openChooseApplicationsModal(position);
    await this.searchApplication(appId);
    await this.selectApplicationInModal(appId);
    await this.confirmApplicationSelection();
    await this.saveChanges();
  }

  async removeApplicationFromWhitelist(appId: string): Promise<void> {
    await this.selectApplication(appId);
    await this.removeSelectedApplications();
    await this.saveChanges();
  }

  async getAppRow(packageName: string): Promise<Locator> {
    return this.page.locator(`tr[data-row-key="${packageName}"]`);
  }

  async cycleInstallType(appRow: Locator, modes: string[]): Promise<string> {
    const currentTypeCell = appRow.locator(".ant-select-selection-item span");
    await expect(currentTypeCell).toBeVisible();

    const currentType = (await currentTypeCell.textContent())?.trim() ?? "";
    const currentIndex = modes.indexOf(currentType);

    if (currentIndex === -1) {
      throw new Error(
        `Current install type "${currentType}" not found in modes list`
      );
    }

    const nextType = modes[(currentIndex + 1) % modes.length];
    await currentTypeCell.click();

    const dropdown = this.page.locator(".ant-select-dropdown:visible");
    await dropdown.waitFor({ state: "visible" });

    const option = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: new RegExp(`^${nextType}$`) });
    await option.click();

    await this.saveChanges();

    const updatedTypeCell = appRow.locator(".ant-select-selection-item span");
    await expect(updatedTypeCell).toHaveText(nextType);

    return nextType;
  }

  async toggleAppDisable(packageName: string): Promise<void> {
    const escapedPackageName = await this.page.evaluate(
      (pkg) => CSS.escape(pkg),
      packageName
    );
    const checkbox = this.page.locator(`#disable-${escapedPackageName}`);
    await checkbox.click();
  }

  async cyclePlayStoreMode(modes: string[]): Promise<string> {
    const modeRegex = new RegExp(`^(${modes.join("|")})$`);
    const currentModeLocator = this.page
      .locator("div")
      .filter({ hasText: modeRegex })
      .nth(2);

    await expect(currentModeLocator).toBeVisible();
    const currentMode = (await currentModeLocator.textContent())?.trim() ?? "";

    const currentIndex = modes.indexOf(currentMode);
    if (currentIndex === -1) {
      throw new Error(`Current mode "${currentMode}" not found in mode list`);
    }

    const nextMode = modes[(currentIndex + 1) % modes.length];

    await currentModeLocator.click();
    await this.page.getByTitle(nextMode).click();
    await this.yesButton.click();
    await this.saveChanges();

    return nextMode;
  }

  async setPlayStoreMode(mode: string): Promise<void> {
    const modeText = this.page.getByText(mode, { exact: true });
    await modeText.click();
  }

  async selectSingleKioskApplication(appId: string): Promise<void> {
    await this.page
      .getByRole("button", { name: "plus Choose Application", exact: true })
      .click();
    await this.selectApplicationById(appId);
    await this.confirmApplicationSelection();
  }

  async openAppConfiguration(packageName: string): Promise<void> {
    const row = await this.getAppRow(packageName);
    await row.getByRole("link", { name: "Configuration" }).click();
  }

  async toggleConfigurationSwitch(): Promise<void> {
    await this.page
      .getByRole("button", { name: "right Enabled Offline Mode" })
      .click();
    await this.page.getByRole("switch").click();
  }

  async submitConfiguration(): Promise<void> {
    await this.page.getByRole("button", { name: "Submit" }).click();
    await this.saveButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204)
    );
  }

  async exportConfiguration(packageName: string): Promise<boolean> {
    const row = await this.getAppRow(packageName);
    await row.getByRole("link", { name: "Configuration" }).click();

    let downloadTriggered = false;
    this.page.once("download", () => {
      downloadTriggered = true;
    });

    await this.page.getByText("export").click();
    await this.page.waitForTimeout(1000);

    return downloadTriggered;
  }

  async openAppPermissions(packageName: string): Promise<void> {
    const row = await this.getAppRow(packageName);
    await row.getByRole("link", { name: "Permissions" }).click();
  }

  async cyclePermissionState(
    permissionName: string,
    states: string[]
  ): Promise<void> {
    const stateRegex = new RegExp(`^(${states.join("|")})$`);

    for (const state of states) {
      await this.page
        .getByRole("button", { name: `${permissionName}` })
        .click();
      await this.page
        .locator("div")
        .filter({ hasText: stateRegex })
        .nth(2)
        .click();
      await this.okButton.click();
      await this.saveChanges();
    }
  }

  async openAppTracks(packageName: string): Promise<void> {
    const row = await this.getAppRow(packageName);
    await row.getByRole("link", { name: "Tracks" }).click();
  }

  async cycleTrack(tracks: string[]): Promise<string> {
    let currentTrack: string | undefined;

    for (const track of tracks) {
      const radioButton = this.page.getByRole("radio", { name: track });
      if (await radioButton.isChecked()) {
        currentTrack = track;
        break;
      }
    }

    if (!currentTrack) {
      throw new Error(
        `Could not detect current track from: ${tracks.join(", ")}`
      );
    }

    const currentIndex = tracks.indexOf(currentTrack);
    const nextTrack = tracks[(currentIndex + 1) % tracks.length];

    await this.page.getByRole("radio", { name: nextTrack }).check();
    await this.okButton.click();
    await this.saveChanges();

    return nextTrack;
  }
  async openAdvancedSettings(): Promise<void> {
    await this.page.getByRole("link", { name: "Advanced" }).first().click();
  }

  async toggleAdvancedPermission(permissionText: string): Promise<void> {
    const checkbox = this.page
      .getByRole("listitem")
      .filter({ hasText: permissionText })
      .getByLabel("");

    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      await checkbox.uncheck();
    } else {
      await checkbox.check();
    }
  }

  async toggleMultipleAdvancedPermissions(
    permissions: string[]
  ): Promise<void> {
    for (const permission of permissions) {
      await this.toggleAdvancedPermission(permission);
    }
  }

  async saveAdvancedSettings(): Promise<void> {
    await this.page.getByRole("button", { name: "OK" }).click();
    await this.page.getByRole("button", { name: "save Save" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }
}
