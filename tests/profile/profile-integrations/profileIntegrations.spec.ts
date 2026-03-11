import { test, expect } from "@playwright/test";
import config from "../../../utils/env";
import { IntegrationPage } from "../shared/profileintegrations.page";
import { ProfileManagementPage } from "../shared/profilemanagement.page";
import {
  IntegrationTestData,
  generateUniqueProfileName,
  ProfileData,
} from "../shared/profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile OEM Integrations", () => {
  let integrationPage: IntegrationPage;
  let profileManagementPage: ProfileManagementPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    integrationPage = new IntegrationPage(page);
    profileManagementPage = new ProfileManagementPage(page);

    await integrationPage.toggleAllOEMIntegrations(true);

    profileName = generateUniqueProfileName("Integrations");
    await profileManagementPage.createProfile(
      profileName,
      ProfileData.profiles.type
    );
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      const modal = page.locator(".ant-modal-wrap");
      if (await modal.isVisible()) {
        await page.keyboard.press("Escape");
        await modal.waitFor({ state: "hidden" });
      }

      await profileManagementPage.navigateToProfileManagement();

      if (profileName) {
        await profileManagementPage.navigateToProfileManagement();
        await profileManagementPage.deleteAllProfilesWithName(profileName);
      }

      await integrationPage.toggleAllOEMIntegrations(false);

      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("zebraIntegration - Configure and test Bluetooth settings", async ({
    page,
  }) => {
    await integrationPage.navigateToTab("Zebra");
    await integrationPage.resetConfiguration();
    await integrationPage.saveConfiguration();
    await integrationPage.waitForUpdateSuccess();

    await integrationPage.openZebraStep();
    await integrationPage.searchForSetting(
      IntegrationTestData.searchTerms.bluetooth
    );

    await integrationPage.verifyZebraSettingVisible(
      IntegrationTestData.zebraSettings.bluetoothConfiguration
    );

    await integrationPage.submitZebraConfiguration();
  });

  test("datalogicIntegration - Toggle Bluetooth radio", async ({ page }) => {
    await integrationPage.navigateToTab("Datalogic");
    await integrationPage.resetConfiguration();
    await integrationPage.saveConfiguration();
    await integrationPage.waitForUpdateSuccess();

    await integrationPage.searchForSetting(
      IntegrationTestData.searchTerms.bluetooth
    );
    await integrationPage.toggleDatalogicBluetoothRadio();
    await integrationPage.searchForSetting(
      IntegrationTestData.searchTerms.bluetooth
    );
    await integrationPage.resetDatalogicBluetooth();
    await integrationPage.clearSearch();
    await integrationPage.saveConfiguration();
    await integrationPage.waitForUpdateSuccess();
  });

  test("honeywellIntegration - Configure Bluetooth restrictions", async ({
    page,
  }) => {
    await integrationPage.navigateToTab("Honeywell");
    await integrationPage.resetConfiguration();
    await integrationPage.saveConfiguration();
    await integrationPage.waitForUpdateSuccess();

    await integrationPage.searchForSetting(
      IntegrationTestData.searchTerms.bluetooth
    );
    await integrationPage.setHoneywellBluetoothToEnable();

    await integrationPage.saveDatalogicSetting();
    await integrationPage.waitForUpdateSuccess();

    await integrationPage.searchForSetting(
      IntegrationTestData.searchTerms.bluetooth
    );
    await integrationPage.resetHoneywellRestrictions();
    await integrationPage.saveDatalogicSetting();
    await integrationPage.waitForUpdateSuccess();
  });
});
