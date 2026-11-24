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
    return this.page.getByRole("button", { name: languageName, exact: true });
  }

  private getLanguageMenuItem(menuItemText: string): Locator {
    return this.page.getByRole("menuitem", { name: menuItemText, exact: true });
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

  /** The language dropdown trigger, found by its icon so it works in any language. */
  getCurrentLanguageButton(): Locator {
    return this.page.locator('button:has([data-icon="language"])');
  }

  /** Switches back to English if another language is active (no hardcoded language list). */
  async resetLanguageToEnglish() {
    const button = this.getCurrentLanguageButton();
    if ((await button.innerText()).trim() === "English") return;
    await button.click();
    await this.getLanguageMenuItem("English").click();
    await expect(button).toHaveText("English");
  }
}

// Export alias for consistency with other POMs
export class LanguageSwitchPage extends LanguageSwitch {}
