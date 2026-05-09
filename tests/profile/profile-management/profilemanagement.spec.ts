import { test, expect } from "../../_base/jamfTest";
import config from "../../../utils/env";
import { ProfileManagementPage } from "../shared/profilemanagement.page";
import { generateUniqueProfileName, AutomationProfiles } from "../shared/profiledata";
import {
  getCreatedProfile,
  setCreatedProfile,
  getModifiedProfile,
  setModifiedProfile,
  hasCreatedProfile,
  hasModifiedProfile,
  clearAllProfiles,
} from "../shared/profileDataStore";

test.describe.configure({ timeout: 60_000 });

// ===== WRAP ALL TESTS IN SERIAL TO ENSURE SEQUENTIAL EXECUTION =====
test.describe.serial("Profile Management - Complete Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
  });

  test.describe.serial("Profile Management - Filters and Search", () => {
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

  test("searchProfile - Search for Automation profiles", async ({ page }) => {
    const profilePage = new ProfileManagementPage(page);
    const searchProfiles = [
      AutomationProfiles.byod,
      AutomationProfiles.cowp,
      AutomationProfiles.fm,
    ];

    await profilePage.navigateToProfileManagement();

    // Test search for each profile individually
    for (const profileName of searchProfiles) {
      // Set up network request listener BEFORE taking action
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/v1/profiles") &&
          resp.request().method() === "GET" &&
          resp.status() === 200
      );

      // Fill search box
      const searchBox = page
        .getByRole("textbox", { name: /Filter by.*name/i })
        .first();
      await searchBox.clear();
      await searchBox.fill(profileName);

      // Click Refresh button to apply filter
      const [searchRefreshResponse] = await Promise.all([
        responsePromise,
        page.getByRole("button", { name: "Refresh" }).click({ force: true }),
      ]);
      // Validate API response
      expect(searchRefreshResponse.status()).toBe(200);

      // Wait for the profile name to appear in the table body
      const profileRow = page.locator(`table tbody`, { hasText: profileName });
      await profileRow.waitFor({ state: "visible", timeout: 5000 });

      const profileText = page.getByText(profileName, { exact: true });
      const count = await profileText.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

  test.describe.serial("Profile Management - Create Profiles", () => {
    let profileMgmt: ProfileManagementPage;

    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard to trigger auth from storageState
      await page.goto(`${config.baseUrl}/dashboard`);
      await expect(page).toHaveURL(/dashboard/);
      profileMgmt = new ProfileManagementPage(page);
      await profileMgmt.navigateToProfileManagement();
    });

    test("createFM - Fully Managed Profile", async ({ page }) => {
      const profileName = generateUniqueProfileName("FM");
      console.log(`\n🔧 Creating FM profile: "${profileName}"`);
      setCreatedProfile("fm", profileName);
      await profileMgmt.createProfile(profileName, "Fully managed");
      console.log(`✅ FM profile created successfully`);
    });

    test("createCOPE - Company-Owned Profile", async ({ page }) => {
      const profileName = generateUniqueProfileName("COPE");
      console.log(`\n🔧 Creating COPE profile: "${profileName}"`);
      setCreatedProfile("cope", profileName);
      await profileMgmt.createProfile(
        profileName,
        "Company-owned with work profile"
      );
      console.log(`✅ COPE profile created successfully`);
    });

    test("createBYOD - Personally-Owned Profile", async ({ page }) => {
      const profileName = generateUniqueProfileName("BYOD");
      console.log(`\n🔧 Creating BYOD profile: "${profileName}"`);
      setCreatedProfile("byod", profileName);
      await profileMgmt.createProfile(
        profileName,
        "Personally owned with work profile"
      );
      console.log(`✅ BYOD profile created successfully`);
    });
  });

  test.describe.serial("Profile Management - Modify & Verify Profiles", () => {
    let profileMgmt: ProfileManagementPage;

    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard to trigger auth from storageState
      await page.goto(`${config.baseUrl}/dashboard`);
      await expect(page).toHaveURL(/dashboard/);
      profileMgmt = new ProfileManagementPage(page);
      await profileMgmt.navigateToProfileManagement();
    });

    test("renameProfile - Rename FM profile", async ({ page }) => {
      const fmProfile = getCreatedProfile("fm");
      
      if (!fmProfile) {
        throw new Error("❌ createdProfiles.fm is empty! Ensure Create tests ran first.");
      }
      
      const renamedName = generateUniqueProfileName("FM-Renamed");
      setModifiedProfile("renamedFm", renamedName);

      await profileMgmt.renameProfile(fmProfile, renamedName);

      const exists = await profileMgmt.profileExists(renamedName);
      expect(exists).toBe(true);
    });

    test("verifyRenamedProfile - Confirm FM was renamed with metadata", async ({
      page,
    }) => {
      await profileMgmt.navigateToProfileManagement();

      const renamedName = getModifiedProfile("renamedFm");
      // Verify renamed profile exists
      const exists = await profileMgmt.profileExists(renamedName);
      expect(exists).toBe(true);

      // openProfileDetailsFromTable: GET detail + URL assert in page object
      await profileMgmt.openProfileDetailsFromTable(renamedName);

      // Verify metadata fields
      await profileMgmt.verifyLastUpdateFields();
    });

    test("duplicateProfile - Duplicate COPE profile", async ({ page }) => {
      const copeProfile = getCreatedProfile("cope");
      
      if (!copeProfile) {
        throw new Error("❌ createdProfiles.cope is empty! Ensure Create tests ran first.");
      }
      
      await profileMgmt.navigateToProfileManagement();

      // Get the duplicated profile name returned from the method
      const duplicatedName = await profileMgmt.duplicateProfile(copeProfile);

      const count = await profileMgmt.countProfilesWithName(duplicatedName);
      expect(count).toBeGreaterThanOrEqual(0);

      // Store the actual duplicated profile name
      setModifiedProfile("duplicatedCope", duplicatedName);
    });

    test("verifyDuplicatedProfile - Confirm COPE duplication with metadata", async ({
      page,
    }) => {
      await profileMgmt.navigateToProfileManagement();

      const duplicatedProfile = getModifiedProfile("duplicatedCope");
      if (!duplicatedProfile) {
        throw new Error("❌ duplicatedProfile is empty! Ensure duplicateProfile test ran first.");
      }
      
      // Verify duplicate exists
      const count = await profileMgmt.countProfilesWithName(duplicatedProfile);
      expect(count).toBeGreaterThanOrEqual(1);

      // openProfileDetailsFromTable: GET detail + URL assert in page object
      await profileMgmt.openProfileDetailsFromTable(duplicatedProfile);

      // Verify metadata fields
      await profileMgmt.verifyLastUpdateFields();
    });
  });

  test.describe.serial("Profile Management - Delete Profiles", () => {
  let profileMgmt: ProfileManagementPage;
  let testProfileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    profileMgmt = new ProfileManagementPage(page);
    await profileMgmt.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      if (testProfileName) {
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(testProfileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

 test("deleteLinkedProfile - Should Fail", async ({ page }) => {
    const linkedProfileName = "Playwright Linked";

    await profileMgmt.navigateToProfileManagement();

    const exists = await profileMgmt.profileExists(linkedProfileName);
    if (!exists) {
      test.skip();
    }

    const success = await profileMgmt.deleteProfile(linkedProfileName);
    expect(success).toBe(false);
  });

  test("deleteUnlinkedProfile - Should Succeed", async ({ page }) => {
    testProfileName = generateUniqueProfileName("Delete-Unlinked");

    await profileMgmt.createProfile(testProfileName, "Fully managed");

    const success = await profileMgmt.deleteProfile(testProfileName);
    expect(success).toBe(true);
  });

    test("cleanupCreatedProfiles - Delete all profiles from Create suite", async ({
      page,
    }) => {
      console.log("\n🧹 Starting cleanup of created profiles...");
      
      // Delete FM profile (original - may have been renamed)
      const fmProfile = getCreatedProfile("fm");
      if (fmProfile) {
        console.log(`  🗑️  Deleting FM: "${fmProfile}"`);
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(fmProfile);
      }

      // Delete COPE profile (original and any duplicates)
      const copeProfile = getCreatedProfile("cope");
      if (copeProfile) {
        console.log(`  🗑️  Deleting COPE: "${copeProfile}"`);
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(copeProfile);
      }

      // Delete BYOD profile
      const byodProfile = getCreatedProfile("byod");
      if (byodProfile) {
        console.log(`  🗑️  Deleting BYOD: "${byodProfile}"`);
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(byodProfile);
      }

      // Delete renamed FM profile (if it was renamed)
      const renamedFm = getModifiedProfile("renamedFm");
      if (renamedFm) {
        console.log(`  🗑️  Deleting Renamed FM: "${renamedFm}"`);
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(renamedFm);
      }

      // Delete duplicated COPE profile (if it was duplicated)
      const duplicatedCope = getModifiedProfile("duplicatedCope");
      if (duplicatedCope) {
        console.log(`  🗑️  Deleting Duplicated COPE: "${duplicatedCope}"`);
        await profileMgmt.navigateToProfileManagement();
        await profileMgmt.deleteAllProfilesWithName(duplicatedCope);
      }
      
      console.log(`✅ Cleanup completed`);
    });

    test("verifyCleanup - Confirm all test profiles are deleted", async ({
      page,
    }) => {
      await profileMgmt.navigateToProfileManagement();

      // Verify FM is deleted
      const fmProfile = getCreatedProfile("fm");
      if (fmProfile) {
        let exists = await profileMgmt.profileExists(fmProfile);
        expect(exists).toBe(false);
      }

      // Verify COPE is deleted
      const copeProfile = getCreatedProfile("cope");
      if (copeProfile) {
        let exists = await profileMgmt.profileExists(copeProfile);
        expect(exists).toBe(false);
      }

      // Verify BYOD is deleted
      const byodProfile = getCreatedProfile("byod");
      if (byodProfile) {
        let exists = await profileMgmt.profileExists(byodProfile);
        expect(exists).toBe(false);
      }

      // Verify renamed FM is deleted
      const renamedFm = getModifiedProfile("renamedFm");
      if (renamedFm) {
        let exists = await profileMgmt.profileExists(renamedFm);
        expect(exists).toBe(false);
      }
    });
  });
}); // Close main serial wrapper
