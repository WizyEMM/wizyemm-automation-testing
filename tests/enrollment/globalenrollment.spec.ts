import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { globalEnrollmentPage } from "../enrollment/globalenrollment.page";
import { globalEnrollmentData } from "../enrollment/globalenrollmentdata";

test.describe.configure({ timeout: 60_000 });

test.describe("Enrollment - Locale and Timezone Configuration", () => {
  let enrollmentPage: globalEnrollmentPage;
  let wifiName1: string;
  let wifiName2: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    enrollmentPage = new globalEnrollmentPage(page);

    wifiName1 = `${globalEnrollmentData.wifi.name}-1.${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    wifiName2 = `${globalEnrollmentData.wifi.name}-2.${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    await enrollmentPage.navigateToConfiguration();
    await enrollmentPage.navigateToWifiNetworks();

    await enrollmentPage.createWifiNetwork(wifiName1);
    await enrollmentPage.configureWifiSecurity(
      globalEnrollmentData.wifi.password,
      globalEnrollmentData.wifi.securityProtocol
    );

    await enrollmentPage.navigateToWifiNetworks();
    await enrollmentPage.createWifiNetwork(wifiName2);
    await enrollmentPage.configureWifiSecurity(
      globalEnrollmentData.wifi.password,
      globalEnrollmentData.wifi.securityProtocol
    );

    await enrollmentPage.navigateToEnrollment();
  });

  test.afterEach(async ({ page }) => {
    await enrollmentPage.navigateToConfiguration();
    await enrollmentPage.navigateToWifiNetworks();

    await enrollmentPage.searchWifiByName(wifiName1);
    await enrollmentPage.deleteWifiNetwork(wifiName1);
    await enrollmentPage.refreshTable();

    await enrollmentPage.searchWifiByName(wifiName2);
    await enrollmentPage.deleteWifiNetwork(wifiName2);
    await enrollmentPage.refreshTable();
  });

  test("should configure locale, timezone, and wifi settings for QR code", async () => {
    await enrollmentPage.navigateToGlobalQRCode();

    await enrollmentPage.toggleSystemApps();
    await enrollmentPage.toggleWifiHidden();
    await enrollmentPage.toggleUseMobileData();

    await enrollmentPage.toggleLanguage(
      globalEnrollmentData.language.option1,
      globalEnrollmentData.language.option2
    );

    await enrollmentPage.toggleTimezone(
      globalEnrollmentData.timezone.option1,
      globalEnrollmentData.timezone.option2
    );

    await enrollmentPage.toggleWifiNetwork(wifiName1, wifiName2);

    await enrollmentPage.toggleWifiSecurity(
      globalEnrollmentData.wifiSecurity.option1,
      globalEnrollmentData.wifiSecurity.option2
    );

    await enrollmentPage.completeQRCodeUpdate();
  });
});
