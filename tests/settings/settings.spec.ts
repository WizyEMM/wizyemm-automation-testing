import { test, expect } from "../_base/jamfTest";
import config from "../../utils/env";
import { SettingsPage } from "./settings.page";
import { languageCycle, generateUniqueGDPRData } from "./settingsdata";

test.describe.configure({ timeout: 60_000 });

test.describe("Personal Settings Tests", () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    settingsPage = new SettingsPage(page);
    await settingsPage.navigateToSettings();
  });

  test("should cycle through all available languages", async ({ page }) => {
    await settingsPage.cycleLanguages(languageCycle);
  });

  test("should update GDPR settings with DPO and EU Representative information", async ({
    page,
  }) => {
    const testData = generateUniqueGDPRData();
    let originalData: any;

    await settingsPage.navigateToGDPRSettings();
    originalData = await settingsPage.getGDPRInformation();

    await settingsPage.fillAndUpdateGDPR(
      testData.dpoName,
      testData.dpoEmail,
      testData.euRepName,
      testData.euRepEmail
    );

    const updatedData = await settingsPage.getGDPRInformation();
    expect(updatedData.dpoName).toBe(testData.dpoName);
    expect(updatedData.dpoEmail).toBe(testData.dpoEmail);
    expect(updatedData.euRepName).toBe(testData.euRepName);
    expect(updatedData.euRepEmail).toBe(testData.euRepEmail);

    await settingsPage.fillAndUpdateGDPR(
      originalData.dpoName,
      originalData.dpoEmail,
      originalData.euRepName,
      originalData.euRepEmail
    );
  });
});
