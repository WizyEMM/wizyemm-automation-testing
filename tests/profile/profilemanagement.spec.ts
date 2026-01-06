import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { ProfileManagementPage } from "./profilemanagement.page";
import { generateUniqueProfileName } from "./profiledata";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  // Navigate to dashboard to trigger auth from storageState
  await page.goto(`${config.baseUrl}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
});

test.describe("Profile Management - Filters and Search", () => {
  test("filterAndSearch - Test sorting and filtering", async ({ page }) => {
    const profilePage = new ProfileManagementPage(page);

    await profilePage.navigateToProfileManagement();

    await profilePage.clickSortColumn("Name");
    await profilePage.clickSortColumn("Mode");
    await profilePage.clickSortColumn("Last Update Time");

    await profilePage.selectFilterOptions(
      "Mode",
      [
        "Fully managed",
        "Company-owned with work profile",
        "Personally owned with work profile",
      ],
      true
    );

    await profilePage.selectFilterOptions(
      "Geolocation",
      ["Enabled", "Disabled"],
      true
    );

    await profilePage.selectFilterOptions(
      "Play Store Mode",
      ["Restricted", "Open"],
      true
    );

    await profilePage.selectFilterOptions(
      "Kiosk",
      ["Enabled", "Disabled"],
      true
    );
  });
});

test.describe("Profile Management - Create Profiles", () => {
  let profileMgmt: ProfileManagementPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    profileMgmt = new ProfileManagementPage(page);
    await profileMgmt.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      if (profileName) {
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(profileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("createFM - Fully Managed Profile", async ({ page }) => {
    profileName = generateUniqueProfileName("FM");
    await profileMgmt.createProfile(profileName, "Fully managed");
  });

  test("createCOPE - Company-Owned Profile", async ({ page }) => {
    profileName = generateUniqueProfileName("COPE");
    await profileMgmt.createProfile(
      profileName,
      "Company-owned with work profile"
    );
  });

  test("createBYOD - Personally-Owned Profile", async ({ page }) => {
    profileName = generateUniqueProfileName("BYOD");
    await profileMgmt.createProfile(
      profileName,
      "Personally owned with work profile"
    );
  });
});

test.describe("Profile Management - Modify Profiles", () => {
  let profileMgmt: ProfileManagementPage;
  let originalProfileName: string;
  let newProfileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    profileMgmt = new ProfileManagementPage(page);
    await profileMgmt.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      if (originalProfileName) {
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(originalProfileName);
      }
      if (newProfileName) {
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(newProfileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("renameProfile - Rename an existing profile", async ({ page }) => {
    originalProfileName = generateUniqueProfileName("Rename-Original");
    newProfileName = generateUniqueProfileName("Rename-Updated");

    await profileMgmt.createProfile(originalProfileName, "Fully managed");

    await profileMgmt.renameProfile(originalProfileName, newProfileName);

    const exists = await profileMgmt.profileExists(newProfileName);
    expect(exists).toBe(true);
  });

  test("duplicateProfile - Duplicate an existing profile", async ({ page }) => {
    originalProfileName = generateUniqueProfileName("Duplicate");

    await profileMgmt.createProfile(originalProfileName, "Fully managed");

    await profileMgmt.duplicateProfile(originalProfileName);

    const count = await profileMgmt.countProfilesWithName(originalProfileName);
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Profile Management - Delete Profiles", () => {
  let profileMgmt: ProfileManagementPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    profileMgmt = new ProfileManagementPage(page);
    await profileMgmt.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      if (profileName) {
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(profileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("deleteLinkedProfile - Should Fail", async ({ page }) => {
    const linkedProfileName = "Playwright Linked";

    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.searchProfile(linkedProfileName);

    const exists = await profileMgmt.profileExists(linkedProfileName);
    if (!exists) {
      test.skip();
    }

    await profileMgmt.selectProfileByIndex(linkedProfileName, 0);

    const success = await profileMgmt.deleteProfile(false);
    expect(success).toBe(false);
  });

  test("deleteUnlinkedProfile - Should Succeed", async ({ page }) => {
    profileName = generateUniqueProfileName("Delete-Unlinked");

    await profileMgmt.createProfile(profileName, "Fully managed");

    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.searchProfile(profileName);
    await profileMgmt.selectProfileByIndex(profileName, 0);

    const success = await profileMgmt.deleteProfile(true);
    expect(success).toBe(true);
  });
});

test.describe("Profile Management - Verification", () => {
  test("lastUpdatedAndUpdatedBy - Verify profile metadata fields", async ({
    page,
  }) => {
    const profileMgmt = new ProfileManagementPage(page);
    await profileMgmt.navigateToProfileManagement();

    const searchBox = page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.fill("Playwright");
    await page.getByRole("button", { name: "Refresh" }).click();

    const firstProfileLink = page
      .locator('tr:has-text("Playwright") a')
      .first();
    await firstProfileLink.click();

    await expect(page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );

    await profileMgmt.verifyLastUpdateFields();
  });
});
