import { Page, Locator, expect } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;

  private readonly personalSettingsHeader: Locator;
  private readonly languageDropdown: Locator;
  private readonly gdprSettingsTab: Locator;
  private readonly dataProtectionOfficerSection: Locator;
  private readonly euRepresentativeSection: Locator;
  private readonly dpoNameInput: Locator;
  private readonly dpoEmailInput: Locator;
  private readonly euRepNameInput: Locator;
  private readonly euRepEmailInput: Locator;
  private readonly updateButton: Locator;
  private readonly settingsIcon: Locator;

  constructor(page: Page) {
    this.page = page;

    this.personalSettingsHeader = page.getByText("Personal Settings");
    // Language is the first select in the Personal settings panel. Located by
    // position in the panel, not by text: the heading and labels are translated.
    this.languageDropdown = page.getByRole("tabpanel").locator(".ant-select").first();
    this.gdprSettingsTab = page.getByText("GDPR Settings");
    this.dataProtectionOfficerSection = page.getByText(
      "Data Protection Officer"
    );
    this.euRepresentativeSection = page.getByText("EU Representative");
    this.dpoNameInput = page.locator("#dataProtectionOfficerName");
    this.dpoEmailInput = page.locator("#dataProtectionOfficerEmail");
    this.euRepNameInput = page.locator("#euRepresentativeName");
    this.euRepEmailInput = page.locator("#euRepresentativeEmail");
    this.updateButton = page.getByRole("button", { name: "Update" });
    this.settingsIcon = page.getByRole("link").filter({ hasText: /^$/ }).nth(2);
  }

  async navigateToSettings() {
    await this.settingsIcon.click();
  }

  /**
   * Selects a language by its native name (e.g. "Français", "繁體中文").
   * Option labels change with the current UI language ("Français - French" in English,
   * "Français" in French), but always start with the native name.
   */
  async selectLanguage(nativeName: string) {
    await this.languageDropdown.click();
    const option = this.page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: new RegExp(`^${escapeRegExp(nativeName)}(\\s|$)`) });

    // Listen before clicking so a fast response isn't missed.
    const saved = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/administrators/me") &&
        resp.request().method() === "PATCH"
    );
    await option.click();
    expect((await saved).status()).toBe(200);
    await expect(this.languageDropdown).toHaveText(nativeName);
  }

  async cycleLanguages(languages: string[]) {
    for (const language of languages) {
      await this.selectLanguage(language);
    }
  }

  async navigateToGDPRSettings() {
    await this.gdprSettingsTab.click();
  }

  async fillDPOInformation(name: string, email: string) {
    await this.dpoNameInput.fill(name);
    await this.dpoEmailInput.fill(email);
  }

  async fillEURepresentativeInformation(name: string, email: string) {
    await this.euRepNameInput.fill(name);
    await this.euRepEmailInput.fill(email);
  }

  async updateGDPRSettings() {
    await this.updateButton.click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/customers/") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
  }

  async fillAndUpdateGDPR(
    dpoName: string,
    dpoEmail: string,
    euRepName: string,
    euRepEmail: string
  ) {
    await this.fillDPOInformation(dpoName, dpoEmail);
    await this.fillEURepresentativeInformation(euRepName, euRepEmail);
    await this.updateGDPRSettings();
  }

  async clearGDPRInformation() {
    await this.dpoNameInput.clear();
    await this.dpoEmailInput.clear();
    await this.euRepNameInput.clear();
    await this.euRepEmailInput.clear();
    await this.updateGDPRSettings();
  }

  async getGDPRInformation() {
    return {
      dpoName: await this.dpoNameInput.inputValue(),
      dpoEmail: await this.dpoEmailInput.inputValue(),
      euRepName: await this.euRepNameInput.inputValue(),
      euRepEmail: await this.euRepEmailInput.inputValue(),
    };
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
