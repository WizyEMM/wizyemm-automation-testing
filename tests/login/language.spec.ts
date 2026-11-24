import { test } from "@playwright/test";
import config from "../../utils/env";
import { LanguageSwitchPage } from "./language.page";
import { languageTestData } from "./languagedata";

const isJamf = process.env.TEST_ENV === "jamf";

test.describe.configure({ timeout: 60_000 });

// STANDALONE TEST - Language switching on LOGIN PAGE (no login required)
test.describe("Language Switching", () => {
  test.beforeEach(async ({ page }) => {
    // team-a hangs on load without this key set (see utils/env.ts)
    if (config.lscacheKey && config.lscacheValue) {
      await page.addInitScript(
        ([key, value]) => {
          window.localStorage.setItem(key, value);
        },
        [config.lscacheKey, config.lscacheValue]
      );
    }
    // Navigate to login page - language button is here before login
    const baseUrl = config.baseUrl;
    await page.goto(baseUrl);
  });

  for (const languageSwitch of languageTestData.languageSwitches) {
    test(`languageSwitch - should switch language to ${languageSwitch.expectedLanguage}`, { tag: `@regression` }, async ({
      page,
    }) => {
      const languagePage = new LanguageSwitchPage(page);
      const expectedButtonLabel =
        (isJamf && languageSwitch.jamfExpectedLanguage) || languageSwitch.expectedLanguage;
      await languagePage.switchLanguageAndVerify(
        languageSwitch.fromLanguage,
        languageSwitch.toLanguageMenuItem,
        expectedButtonLabel
      );
    });
  }

  // No afterEach reset: this config has no storageState, so every test starts
  // in a fresh browser context with the default (English) language.
});

