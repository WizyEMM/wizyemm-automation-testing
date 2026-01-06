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
    this.languageDropdown = page
      .locator("div")
      .filter({
        hasText:
          /^(English|Français|日本語|Español|Deutsch|中文)$/,
      })
      .nth(2);
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

  async selectLanguage(language: string) {
    await this.languageDropdown.click();
    await this.page.getByText(language).click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/administrators/me") &&
        resp.status() === 200 &&
        resp.request().method() === "PATCH"
    );
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
