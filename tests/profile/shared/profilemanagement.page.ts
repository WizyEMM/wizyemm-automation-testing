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

  // True for /profiles list only, not /profiles/:id/...
  private isOnProfileListPage(): boolean {
    const path = new URL(this.page.url()).pathname.replace(/\/$/, "") || "/";
    return path === "/profiles";
  }

  async navigateToProfileManagement(): Promise<void> {
    if (await this.leaveButton.isVisible()) {
      await this.leaveButton.click();
    }
    // Already on list: re-click nav often does not refetch — skip waitForResponse (avoids timeout).
    if (this.isOnProfileListPage()) {
      await this.waitForTable();
      return;
    }

    // First visit from elsewhere: capture list GET + nav in parallel
    const [listResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      this.profileManagementLink.click(),
    ]);
    // Validate API response
    expect(listResponse.status()).toBe(200);
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

    // Validate list GET after Refresh (matches search spec pattern)
    const [searchListResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      this.page.getByRole("button", { name: "Refresh" }).click(),
    ]);
    expect(searchListResponse.status()).toBe(200);

    await this.waitForTable();

    // Wait for the profile name to appear in the table body, but don't fail if it doesn't
    const profileRow = this.page.locator(`table tbody`, { hasText: profileName });
    try {
      await profileRow.waitFor({ state: "visible", timeout: 3000 });
    } catch (error) {
      // Profile not found in results - this is fine, let countProfilesWithName return 0
    }
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

      // Sort may be client-side only — no reliable list GET per click
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

    // Filter OK refetches list — capture GET + click in parallel
    const [filterListResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      this.page.getByRole("button", { name: "OK" }).click(),
    ]);
    expect(filterListResponse.status()).toBe(200);
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
    await nameInput.waitFor({ state: "visible" });
    await nameInput.click();
    
    await nameInput.fill(profileName);
    
    const profileTypeSelector = this.page.getByLabel("New Profile").getByText(profileType);
    await profileTypeSelector.click();
    
    // Wait for modal to fully render
    await this.page.waitForTimeout(500);
    
    // Get OK button from the dialog context
    const modal = this.page.locator(".ant-modal-content");
    await modal.waitFor({ state: "visible" });
    const okButton = modal.getByRole("button", { name: "OK" });
    await okButton.waitFor({ state: "visible" });
    
    // Capture API response and click button in parallel
    const apiResponsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles") &&
        (resp.status() === 200 || resp.status() === 201) &&
        (resp.request().method() === "POST" || resp.request().method() === "PUT")
    );
    
    const [apiResponse] = await Promise.all([
      apiResponsePromise,
      okButton.click({ force: true }),
    ]);
    
    // Validate API response
    expect(apiResponse.status()).toBe(201);
    
    // Validate UI success message
    const successMessage = this.page.getByText("A new profile has been created");
    await successMessage.waitFor({ state: "visible" });
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

    // Capture API response and click OK in parallel
    const renameResponsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles") &&
        (resp.status() === 200 || resp.status() === 201) &&
        ["PUT", "PATCH", "POST"].includes(resp.request().method())
    );

    const [renameResponse] = await Promise.all([
      renameResponsePromise,
      this.okButton.click(),
    ]);
    // Validate API response
    expect([200, 201]).toContain(renameResponse.status());

    await expect(this.page.getByText("has been renamed")).toBeVisible();

    await this.page.locator(".ant-modal-wrap").waitFor({ state: "hidden" });

    const searchBox = this.page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.clear();

    // Validate list GET after Refresh
    const [refreshResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      this.page.getByRole("button", { name: "Refresh" }).click(),
    ]);
    expect(refreshResponse.status()).toBe(200);
    await this.waitForTable();
  }

  async duplicateProfile(originalProfileName: string): Promise<string> {
    await this.navigateToProfileManagement();
    await this.searchProfile(originalProfileName);
    await this.selectProfileByIndex(originalProfileName, 0);

    // Wait for duplicate button to be visible and enabled
    await this.duplicateButton.waitFor({ state: "visible" });
    await this.page.waitForTimeout(500); // Small delay to ensure button is fully ready
    await this.duplicateButton.click({ force: true });
    
    // Wait for OK button in duplicate dialog
    await this.okButton.waitFor({ state: "visible", timeout: 5000 });
    await this.page.waitForTimeout(800); // Wait for dialog to fully render
    
    // Make sure button is enabled before clicking
    await this.okButton.isEnabled().then(async (enabled) => {
      if (!enabled) {
        await this.page.waitForTimeout(500);
      }
    });
    
    // Capture API response and click button in parallel
    const apiResponsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/profiles") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
    
    const [apiResponse] = await Promise.all([
      apiResponsePromise,
      this.okButton.click({ force: true }),
    ]);
    
    // Validate API response
    expect(apiResponse.status()).toBe(201);
    console.log(`✓ Duplicate successful - API response: ${apiResponse.status()}`);

    // Extract the duplicated profile name from the API response
    let duplicatedName = `${originalProfileName} - duplicate`;
    try {
      const responseBody = await apiResponse.json();
      if (responseBody.name) {
        duplicatedName = responseBody.name;
      }
    } catch (error) {
      // Silently use default name if API response cannot be parsed
    }

    await this.waitForTable();
    return duplicatedName;
  }

  async deleteProfile(profileName: string): Promise<boolean> {
    await this.navigateToProfileManagement();
    
    // Use searchProfile to ensure proper waiting for profile to appear
    await this.searchProfile(profileName);
    
    // Step 2: Check the checkbox in the row
    const profileRow = this.page.getByRole("row", { name: new RegExp(profileName, "i") }).first();
    const checkbox = profileRow.getByLabel("", { exact: true });
    await checkbox.waitFor({ state: "visible" });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    // Step 3: Click Remove button
    await this.removeButton.click();
    
    // Step 4: Click OK button to confirm deletion
    await this.okButton.click();

    // DELETE: 200/204 on success; 4xx when profile in use (UI still decides outcome below)
    let deleteResponse: Awaited<
      ReturnType<Page["waitForResponse"]>
    > | null = null;
    try {
      deleteResponse = await this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "DELETE",
        { timeout: 20000 }
      );
    } catch {
      deleteResponse = null;
    }

    if (deleteResponse !== null) {
      expect([200, 204, 400, 403, 409, 422]).toContain(
        deleteResponse.status()
      );
    }

    // Step 5: Click body to dismiss any overlays/dropdowns
    await this.page.locator("body").click();

    // Step 6: Wait for success message "Action Summary Success: 1"
    const successMessage = this.page.locator("div").filter({ hasText: "Action Summary Success: 1" });
    const inUseMessage = this.page.locator("div").filter({ hasText: "Profile is used" });

    try {
      await Promise.race([
        successMessage.nth(3).waitFor({ state: "visible" }),
        inUseMessage.waitFor({ state: "visible" }),
      ]);

      const isSuccess = await successMessage.nth(3).isVisible().catch(() => false);
      if (isSuccess) {
        // Validate API response
        expect(deleteResponse).not.toBeNull();
        expect([200, 204]).toContain(deleteResponse!.status());
        await successMessage.nth(3).click();
        return true;
      }

      const isInUse = await inUseMessage.isVisible().catch(() => false);
      if (isInUse) {
        if (deleteResponse !== null) {
          expect(deleteResponse.status()).toBeGreaterThanOrEqual(400);
        }
        return false;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  async deleteAllProfilesWithName(profileName: string): Promise<number> {
    let deletedCount = 0;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await this.navigateToProfileManagement();
      const count = await this.countProfilesWithName(profileName);
      
      if (count === 0) {
        break;
      }

      const success = await this.deleteProfile(profileName);
      if (success) {
        deletedCount++;
      } else {
        break;
      }

      attempts++;
    }

    return deletedCount;
  }

  async openProfile(profileName: string): Promise<void> {
    const row = this.page.getByRole("row", { name: profileName }).first();
    // Capture profile detail GET + link click in parallel
    const [detailResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles/") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      row.locator("a").first().click(),
    ]);
    // Validate API response
    expect(detailResponse.status()).toBe(200);
    await expect(this.page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );
  }

  // Open profile by row has-text (metadata tests) — same GET assert as openProfile
  async openProfileDetailsFromTable(profileName: string): Promise<void> {
    const firstProfileLink = this.page
      .locator(`tr:has-text("${profileName}") a`)
      .first();
    // Capture profile detail GET + link click in parallel
    const [detailResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles/") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      ),
      firstProfileLink.click(),
    ]);
    // Validate API response
    expect(detailResponse.status()).toBe(200);
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
