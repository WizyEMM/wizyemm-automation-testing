import { test, expect } from "../_base/jamfTest";
import config from "../../utils/env";
import { globalEnrollmentPage } from "../enrollment/globalenrollment.page";
import { globalEnrollmentData } from "../enrollment/globalenrollmentdata";


test.describe("Enrollment - Locale and Timezone Configuration", () => {
  let enrollmentPage: globalEnrollmentPage;
  // Pre-made WiFi networks (fixed test data)
  const wifiName1 = "Automation - WIFI 1";
  const wifiName2 = "Automation - WIFI 2";

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    enrollmentPage = new globalEnrollmentPage(page);
  });

  test("should configure locale, timezone, and wifi settings for QR code", async () => {
    await enrollmentPage.navigateToEnrollment();
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
