import { test, expect } from "../../_base/jamfTest";
import config from "../../../utils/env";
import { ProfileEnrollmentPage } from "../shared/profileenrollment.page";
import { ProfileManagementPage } from "../shared/profilemanagement.page";
import { ProfileData, generateUniqueProfileName } from "../shared/profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile Enrollment Settings", () => {
  let enrollmentPage: ProfileEnrollmentPage;
  let profileManagementPage: ProfileManagementPage;
  let profileName: string;
  let wifiNetworkName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    enrollmentPage = new ProfileEnrollmentPage(page);
    profileManagementPage = new ProfileManagementPage(page);

    profileName = generateUniqueProfileName("Enrollment");
    wifiNetworkName = `Enrollment-Wifi-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    await enrollmentPage.createWiFiNetwork(wifiNetworkName);
    await profileManagementPage.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      if (profileName) {
        await profileManagementPage.navigateToProfileManagement();
        await profileManagementPage.deleteAllProfilesWithName(profileName);
      }

      if (wifiNetworkName) {
        await enrollmentPage.deleteWiFiNetwork(wifiNetworkName);
      }

      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("should configure enrollment settings and regenerate token", async ({
    page,
  }) => {
    await profileManagementPage.createProfile(
      profileName,
      ProfileData.profiles.type
    );

    await enrollmentPage.configureEnrollmentSettings({
      locale: ProfileData.enrollmentSettings.locales.afrikaans,
      timezone: ProfileData.enrollmentSettings.timezones.africaAbidjan,
      wifiNetwork: wifiNetworkName,
      enableSystemApps: true,
      useMobileData: true,
      wifiHidden: true,
    });

    await enrollmentPage.verifyEnrollmentTokenVisible();

    await enrollmentPage.regenerateEnrollmentToken();
  });

  test("should configure enrollment with default settings", async ({
    page,
  }) => {
    await profileManagementPage.createProfile(
      profileName,
      ProfileData.profiles.type
    );

    await enrollmentPage.configureEnrollmentSettings({
      locale: ProfileData.enrollmentSettings.locales.english,
      timezone: ProfileData.enrollmentSettings.timezones.utc,
      wifiNetwork: wifiNetworkName,
    });

    await enrollmentPage.verifyEnrollmentTokenVisible();
  });
});
