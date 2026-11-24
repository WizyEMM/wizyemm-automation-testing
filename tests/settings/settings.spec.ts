import { test, expect } from "../_base/jamfTest";
import config from "../../utils/env";
import { SettingsPage } from "./settings.page";
import { AdminApiSession, captureAdminApiSession, setAdminLanguage } from "../../utils/adminLanguage";
import { languageCycle, generateUniqueGDPRData } from "./settingsdata";

test.describe.configure({ timeout: 60_000 });

test.describe("Personal Settings Tests", () => {
  let settingsPage: SettingsPage;
  let adminApi: AdminApiSession | undefined;

  test.beforeEach(async ({ page }) => {
    adminApi = undefined;
    const session = captureAdminApiSession(page);
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    adminApi = await session;
    await expect(page).toHaveURL(/dashboard/);

    settingsPage = new SettingsPage(page);
    await settingsPage.navigateToSettings();
  });

  test.afterEach(async ({ page }) => {
    // The language is saved on the shared admin account. Always put it back to English
    // (via the API, so it works even if the UI broke mid-test), or later tests fail.
    if (adminApi) await setAdminLanguage(page, adminApi, "en");
  });

  test("settingsLanguageSwitching - should cycle through all available languages", {tag: [`@smoke`, `@regression`]}, async ({ page }) => {
    await settingsPage.cycleLanguages(languageCycle);
  });

  test("updateGDPRSettings - should update GDPR settings with DPO and EU Representative information", {tag: [`@smoke`, `@regression`]}, async ({
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
