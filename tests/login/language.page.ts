import { Page, Locator, expect } from "@playwright/test";

export class LanguageSwitch {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(baseUrl: string) {
    await this.page.goto(baseUrl);
  }

  getLanguageButton(languageName: string): Locator {
    return this.page.getByRole("button", { name: languageName });
 }

  private getLanguageMenuItem(menuItemText: string): Locator {
    return this.page.getByRole("menuitem", { name: menuItemText });
  }

  async isLanguageAvailable(languageMenuItem: string): Promise<boolean> {
    try {
      const menuItem = this.getLanguageMenuItem(languageMenuItem);
      return await menuItem.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  async switchLanguage(
    currentLanguage: string,
    targetLanguageMenuItem: string
  ) {
    await this.getLanguageButton(currentLanguage).click();
    await this.getLanguageMenuItem(targetLanguageMenuItem).click();
  }

  async switchLanguageAndVerify(
    currentLanguage: string,
    targetLanguageMenuItem: string,
    expectedLanguage: string
  ) {
    await this.getLanguageButton(currentLanguage).click();
    await this.getLanguageMenuItem(targetLanguageMenuItem).click();
    await expect(this.getLanguageButton(expectedLanguage)).toBeVisible();
  }

  async verifyCurrentLanguage(languageName: string) {
    await expect(this.getLanguageButton(languageName)).toBeVisible();
  }

  async resetLanguageToEnglish() {
    try {
      // Get current language from button text content
      const currentLangButton = this.page.locator('button').filter({ hasText: /^(English|Français|Bahasa Indonesia|日本語|Español|ไทย|Deutsch|中文)$/ }).first();
      const currentLang = await currentLangButton.textContent();
      
      if (currentLang && currentLang !== "English") {
        await this.switchLanguageAndVerify(
          currentLang,
          "English",
          "English"
        );
      }
    } catch (error) {
      console.warn(`Failed to reset language to English: ${error}`);
    }
  }
}

// Export alias for consistency with other POMs
export class LanguageSwitchPage extends LanguageSwitch {}
