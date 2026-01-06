import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { ConfigurationPage } from "./profileconfiguration.page";
import { ProfileManagementPage } from "./profilemanagement.page";
import { ProfileData, generateUniqueProfileName } from "./profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile Configuration Tests", () => {
  let configPage: ConfigurationPage;
  let profileMgmt: ProfileManagementPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    configPage = new ConfigurationPage(page);
    profileMgmt = new ProfileManagementPage(page);

    profileName = generateUniqueProfileName("Config");
    await profileMgmt.navigateToProfileManagement();
    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      await profileMgmt.navigateToProfileManagement();
      if (profileName) {
        await profileMgmt.deleteAllProfilesWithName(profileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("configSwitches - Toggle configuration switches", async ({ page }) => {
    await configPage.navigateToConfiguration();

    await configPage.navigateToAdvancedFeatures();
    await configPage.toggleSwitch(
      ProfileData.configuration.switches.advancedDeviceStatus
    );
    await configPage.navigateToAdvancedFeatures();
    await configPage.toggleSwitch(
      ProfileData.configuration.switches.deviceUsage
    );
  });

  test("reportDeviceGeolocation - Toggle geolocation reporting", async ({
    page,
  }) => {
    await configPage.navigateToConfiguration();

    await configPage.ensureSwitchEnabled(
      ProfileData.configuration.switches.deviceGeolocation
    );
    await configPage.toggleSwitch(
      ProfileData.configuration.switches.reportGeolocation
    );
  });

  test("locationMode - Cycle through location modes", async ({ page }) => {
    await configPage.navigateToConfiguration();

    await configPage.ensureSwitchEnabled(
      ProfileData.configuration.switches.deviceGeolocation
    );

    const row = ProfileData.configuration.dropdowns.locationMode.label;
    const modes = ProfileData.configuration.dropdowns.locationMode.options;
    const dropdownConfig = ProfileData.configuration.dropdownSelectors.standard;

    const results: string[] = [];
    for (let i = 0; i < modes.length; i++) {
      const nextMode = await configPage.cycleDropdown(
        row,
        modes,
        dropdownConfig
      );
      results.push(nextMode);
    }

    const [a, b, c, d, e] = results;
    const expectedModes = [
      modes[(modes.indexOf(a) + 1) % modes.length],
      modes[(modes.indexOf(a) + 2) % modes.length],
      modes[(modes.indexOf(a) + 3) % modes.length],
      modes[(modes.indexOf(a) + 4) % modes.length],
      a,
    ];

    expect([b, c, d, e, a]).toEqual(expectedModes);
  });

  test("systemsUpdate - Cycle through system update policies", async ({
    page,
  }) => {
    await configPage.navigateToConfiguration();

    const row = ProfileData.configuration.dropdowns.systemUpdates.label;
    const modes = ProfileData.configuration.dropdowns.systemUpdates.options;
    const dropdownConfig = ProfileData.configuration.dropdownSelectors.standard;

    const results: string[] = [];
    for (let i = 0; i < modes.length; i++) {
      const nextMode = await configPage.cycleDropdown(
        row,
        modes,
        dropdownConfig
      );
      results.push(nextMode);
    }

    const [a, b, c] = results;
    const expectedModes = [
      modes[(modes.indexOf(a) + 1) % modes.length],
      modes[(modes.indexOf(a) + 2) % modes.length],
      a,
    ];

    expect([b, c, a]).toEqual(expectedModes);
  });

  test("passwordConstraints - Cycle through password constraints", async ({
    page,
  }) => {
    await configPage.navigateToConfiguration();
    await configPage.navigateToSecuritySettings();

    const row = ProfileData.configuration.dropdowns.passwordConstraints.label;
    const modes =
      ProfileData.configuration.dropdowns.passwordConstraints.options;
    const dropdownConfig = ProfileData.configuration.dropdownSelectors.standard;

    const currentModeText = await configPage.getCurrentDropdownValue(row);
    if (currentModeText.includes("Unspecified")) {
      await configPage.cycleDropdown(
        row,
        ["Unspecified", "Complex"],
        dropdownConfig
      );
      await configPage.navigateToConfiguration();
      await configPage.navigateToSecuritySettings();
    }

    const results: string[] = [];
    for (let i = 0; i < modes.length; i++) {
      await configPage.incrementPasswordInputs();
      await configPage.togglePasswordQualityRadio();

      const nextMode = await configPage.cycleDropdown(
        row,
        modes,
        dropdownConfig
      );
      results.push(nextMode);
      await configPage.navigateToConfiguration();
      await configPage.navigateToSecuritySettings();
    }

    const [a, b] = results;
    const expectedModes = [modes[(modes.indexOf(a) + 1) % modes.length], a];

    expect([b, a]).toEqual(expectedModes);
  });

  test("keyguardConfig - Setup keyguard configuration", async ({ page }) => {
    await configPage.navigateToConfiguration();
    await configPage.navigateToSecuritySettings();
    await configPage.setupKeyguardConfiguration();
  });

  test("factoryResetProtection - Add factory reset protection email", async ({
    page,
  }) => {
    await configPage.navigateToConfiguration();
    await configPage.navigateToSecuritySettings();

    const uniqueEmail =
      ProfileData.configuration.security.generateFactoryResetEmail();
    await configPage.addFactoryResetProtectionEmail(uniqueEmail);
  });
});
