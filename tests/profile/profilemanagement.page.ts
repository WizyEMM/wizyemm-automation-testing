import { Page, expect, Locator } from "@playwright/test";

export class ProfileManagementPage {
  readonly page: Page;

  private readonly profileManagementLink: Locator;
  private readonly createButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly removeButton: Locator;
  private readonly renameButton: Locator;
  private readonly duplicateButton: Locator;
  private readonly leaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileManagementLink = page.getByRole("link", {
      name: "Profile Management",
    });
    this.createButton = page.getByRole("button", { name: "plus Create" });
    this.saveButton = page.getByRole("button", { name: "Save" });
    this.okButton = page.getByRole("button", { name: "OK" });
    this.removeButton = page.getByRole("button", { name: "Remove" });
    this.renameButton = page.getByRole("button", { name: "Rename" });
    this.duplicateButton = page.getByRole("button", { name: "Duplicate" });
    this.leaveButton = page.getByRole("button", { name: "Leave" });
  }

  async navigateToProfileManagement(): Promise<void> {
    if (await this.leaveButton.isVisible()) {
      await this.leaveButton.click();
    }
    await this.profileManagementLink.click();
    await this.waitForTable();
  }

  async waitForTable(): Promise<void> {
    await this.page.locator("table").waitFor({ state: "visible" });
    await this.page
      .locator('img[alt="loading"]')
      .waitFor({ state: "hidden" })
      .catch(() => {});
  }

  async searchProfile(profileName: string): Promise<void> {
    const searchBox = this.page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.clear();
    await searchBox.click();
    await searchBox.fill(profileName);

    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes("/profiles") && resp.status() === 200
      ),
      this.page.getByRole("button", { name: "Refresh" }).click(),
    ]);

    await this.waitForTable();
  }

  async clickSortColumn(columnName: string, reps: number = 3): Promise<void> {
    const locator = this.page
      .locator("#app")
      .getByText(columnName, { exact: true });
    for (let i = 0; i < reps; i++) {
      await this.page
        .locator(".ant-spin-spinning")
        .waitFor({ state: "detached" })
        .catch(() => {});

      await locator.click();
      await this.waitForTable();
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async selectFilterOptions(
    filterName: string,
    options: string[],
    clearFirst: boolean = true
  ): Promise<void> {
    const filterButton = this.page
      .locator("th")
      .filter({ hasText: new RegExp(`^${this.escapeRegex(filterName)}\\s`) })
      .getByRole("button", { name: "filter" });
    await filterButton.click();

    if (clearFirst) {
      const clearButton = this.page.getByRole("button", { name: "Clear" });
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }
    }

    for (const option of options) {
      await this.page.getByRole("menuitem", { name: option }).click();
    }

    await this.page.getByRole("button", { name: "OK" }).click();
    await this.waitForTable();
  }
  async countProfilesWithName(profileName: string): Promise<number> {
    await this.searchProfile(profileName);
    const rows = this.page.getByRole("row", {
      name: new RegExp(profileName, "i"),
    });
    return await rows.count();
  }

  async selectProfileByIndex(
    profileName: string,
    index: number = 0
  ): Promise<void> {
    const rows = this.page.getByRole("row", {
      name: new RegExp(profileName, "i"),
    });
    const count = await rows.count();

    if (count === 0) {
      throw new Error(`No profiles found with name: ${profileName}`);
    }
    if (index >= count) {
      throw new Error(
        `Index ${index} out of bounds. Found ${count} profile(s)`
      );
    }

    const targetRow = rows.nth(index);
    const profileCheckbox = targetRow.locator('input[type="checkbox"]');
    await profileCheckbox.waitFor({ state: "visible" });
    await profileCheckbox.click();
    await expect(profileCheckbox).toBeChecked();
  }

  async selectAllProfilesWithName(profileName: string): Promise<number> {
    await this.searchProfile(profileName);
    const rows = this.page.getByRole("row", {
      name: new RegExp(profileName, "i"),
    });
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const checkbox = rows.nth(i).locator('input[type="checkbox"]');
      await checkbox.waitFor({ state: "visible" });
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
        await expect(checkbox).toBeChecked();
      }
    }
    return count;
  }

  async createProfile(profileName: string, profileType: string): Promise<void> {
    await this.navigateToProfileManagement();
    await this.createButton.click();

    const nameInput = this.page.getByRole("textbox", { name: /\* Name/i });
    await nameInput.fill(profileName);

    await this.page.getByRole("radio", { name: profileType }).check();
    await this.okButton.click();
  }

  async renameProfile(
    originalProfileName: string,
    newName: string
  ): Promise<void> {
    await this.navigateToProfileManagement();
    await this.searchProfile(originalProfileName);
    await this.selectProfileByIndex(originalProfileName, 0);

    await this.renameButton.click();

    const nameInput = this.page.getByRole("textbox", { name: "* Name :" });
    await nameInput.fill(newName);
    await expect(nameInput).toHaveValue(newName);

    await this.okButton.click();

    await expect(this.page.getByText("has been renamed")).toBeVisible();

    await this.page.locator(".ant-modal-wrap").waitFor({ state: "hidden" });

    const searchBox = this.page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.clear();

    await this.page.waitForResponse(
      (resp) => resp.url().includes("/profiles") && resp.status() === 200
    ),
      this.page.getByRole("button", { name: "Refresh" }).click(),
      await this.waitForTable();
  }

  async duplicateProfile(originalProfileName: string): Promise<void> {
    await this.navigateToProfileManagement();
    await this.searchProfile(originalProfileName);
    await this.selectProfileByIndex(originalProfileName, 0);

    await this.duplicateButton.click();
    await this.okButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );

    await this.waitForTable();
  }

  async deleteProfile(expectSuccess: boolean = true): Promise<boolean> {
    await this.removeButton.click();
    await this.okButton.click();

    if (expectSuccess) {
      const successMessage = this.page.getByText("Action Summary");
      const inUseMessage = this.page.getByText("Profile is used");

      await Promise.race([
        successMessage.waitFor({ state: "visible" }),
        inUseMessage.waitFor({ state: "visible" }),
      ]);

      const isSuccess = await successMessage.isVisible().catch(() => false);
      const isInUse = await inUseMessage.isVisible().catch(() => false);

      if (isInUse) {
        return false;
      }

      await expect(successMessage).toBeVisible();
      return true;
    } else {
      await expect(this.page.getByText("Profile is used")).toBeVisible();
      return false;
    }
  }

  async deleteAllProfilesWithName(profileName: string): Promise<number> {
    let deletedCount = 0;
    let totalCount = await this.countProfilesWithName(profileName);

    while (totalCount > 0) {
      await this.navigateToProfileManagement();
      await this.searchProfile(profileName);

      const selectedCount = await this.selectAllProfilesWithName(profileName);
      if (selectedCount === 0) break;

      const success = await this.deleteProfile(true);
      if (success) {
        deletedCount += selectedCount;
      } else {
        break;
      }

      await this.navigateToProfileManagement();
      totalCount = await this.countProfilesWithName(profileName);
    }

    return deletedCount;
  }

  async openProfile(profileName: string): Promise<void> {
    const row = this.page.getByRole("row", { name: profileName }).first();
    await row.locator("a").first().click();
    await expect(this.page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );
  }

  async verifyProfilePage(profileName: string): Promise<void> {
    await expect(this.page.getByRole("heading")).toContainText(profileName);
  }

  async verifyLastUpdateFields(): Promise<void> {
    await expect(this.page.getByText("Last Update Time")).toBeVisible();
    await expect(this.page.getByText("Last Updated By")).toBeVisible();
  }

  async profileExists(profileName: string): Promise<boolean> {
    await this.searchProfile(profileName);
    const count = await this.countProfilesWithName(profileName);
    return count > 0;
  }

  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  async ensureCleanProfile(profileName: string): Promise<void> {
    await this.navigateToProfileManagement();
    const count = await this.countProfilesWithName(profileName);

    if (count > 0) {
      console.log(
        `Found ${count} existing profile(s) with name: ${profileName}. Cleaning up...`
      );
      await this.deleteAllProfilesWithName(profileName);
      await this.navigateToProfileManagement();
    } else {
      console.log(`No existing profiles found with name: ${profileName}`);
    }
  }
}
