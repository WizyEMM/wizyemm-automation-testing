import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { LanguageSwitchPage } from "./language.page";
import { languageTestData } from "./languagedata";

test.describe.configure({ timeout: 60_000 });

// STANDALONE TEST - Language switching on LOGIN PAGE (no login required)
test.describe("Language Switching", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page - language button is here before login
    const baseUrl = config.baseUrl;
    await page.goto(baseUrl);
  });

  for (const languageSwitch of languageTestData.languageSwitches) {
    test(`should switch language to ${languageSwitch.expectedLanguage}`, async ({
      page,
    }) => {
      const languagePage = new LanguageSwitchPage(page);
      
      await languagePage.switchLanguageAndVerify(
        languageSwitch.fromLanguage,
        languageSwitch.toLanguageMenuItem,
        languageSwitch.expectedLanguage
      );
    });

    test.afterEach(async ({ page }) => {
      // Reset language back to English after each test
      const languagePage = new LanguageSwitchPage(page);
      await languagePage.resetLanguageToEnglish();
    });
  }
});

