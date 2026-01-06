import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { ProfileManagementPage } from "./profilemanagement.page";
import { ProfilePoliciesPage } from "./profilepolicies.page";
import { ProfileData, generateUniqueProfileName } from "./profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile Policies Tests", () => {
  let profileMgmt: ProfileManagementPage;
  let profilePolicies: ProfilePoliciesPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    profileMgmt = new ProfileManagementPage(page);
    profilePolicies = new ProfilePoliciesPage(page);
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

  test("modifyFM - Fully Managed profile policies", async ({ page }) => {
    profileName = generateUniqueProfileName("PolicyFM");

    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);

    await profilePolicies.modifyPolicy(
      profileName,
      "Bluetooth",
      ProfileData.policies.bluetoothPolicy
    );
  });

  test("modifyCOPE - COPE profile policies", async ({ page }) => {
    profileName = generateUniqueProfileName("PolicyCOPE");

    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.createProfile(
      profileName,
      ProfileData.profileTypes.copeProfile
    );

    await profilePolicies.modifyWorkProfilePolicy(
      profileName,
      "Bluetooth",
      ProfileData.policies.bluetoothPolicy
    );

    await profilePolicies.modifyPersonalProfilePolicy(
      ProfileData.policies.cameraDisabled
    );
  });

  test("modifyBYOD - BYOD profile policies", async ({ page }) => {
    profileName = generateUniqueProfileName("PolicyBYOD");

    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.createProfile(
      profileName,
      "Personally owned with work profile"
    );

    await profilePolicies.modifyPolicy(
      profileName,
      "Bluetooth",
      ProfileData.policies.bluetoothPolicy
    );
  });
});
