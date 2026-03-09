import { Page, Locator, expect } from "@playwright/test";

export class KioskPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getKioskTab(): Locator {
    return this.page.getByRole("tab", { name: "Kiosk" });
  }

  kioskModeDropdown(): Locator {
    return this.page
      .locator(".ant-select-selector")
      .filter({ hasText: "Restricted Play Store" });
  }

  async selectMultiApplicationKiosk(): Promise<void> {
    await this.page.getByRole("tab", { name: "Applications" }).click();

    await this.kioskModeDropdown().click();
    const multiAppOption = this.page
      .getByText("Multi-Application Kiosk")
      .last();

    await multiAppOption.click();
    await this.page.getByRole("button", { name: "Yes" }).click();
  }

  getTracksButton(): Locator {
    return this.page.getByRole("button", { name: "Tracks" });
  }

  getBottomBannerColorTextbox(): Locator {
    return this.page
      .getByRole("listitem")
      .filter({ hasText: "Bottom Banner Color" })
      .getByRole("textbox");
  }

  getGridBordersSwitch(): Locator {
    return this.page
      .getByRole("listitem")
      .filter({ hasText: "Grid Borders" })
      .getByRole("switch");
  }

  getBottomBannerSwitch(): Locator {
    return this.page
      .getByRole("listitem")
      .filter({ hasText: "Show Bottom Banner" })
      .getByRole("switch");
  }

  getBottomBannerTextInput(): Locator {
    return this.page.locator("#string-bottom-banner-text");
  }

  getIncreaseValueButton(): Locator {
    return this.page.getByRole("button", { name: "Increase Value" }).first();
  }

  getSaveButton(): Locator {
    return this.page.getByRole("button", { name: "Save" });
  }

  async navigateToKioskTab(): Promise<void> {
    await this.getKioskTab().click();
  }

  async clickTracksButton(): Promise<void> {
    await this.getTracksButton().click();
  }

  async selectTrack(trackName: string): Promise<void> {
    const radio = this.page.getByRole("radio", { name: trackName });
    await radio.check();
  }

  async clickOK(): Promise<void> {
    await this.page.getByRole("button", { name: "OK" }).click();
  }

  async clickSave(): Promise<void> {
    await this.getSaveButton().click();
  }

  async waitForUpdate(): Promise<void> {
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }

  async configureDisplay(config: {
    increaseValue?: boolean;
    gridBorders?: boolean;
    bottomBanner?: boolean;
    bannerText?: string;
    bannerColor?: string;
  }): Promise<void> {
    if (config.increaseValue) {
      await this.getIncreaseValueButton().click();
    }

    if (config.gridBorders !== undefined) {
      await this.getGridBordersSwitch().click();
    }

    if (config.bottomBanner !== undefined) {
      await this.getBottomBannerSwitch().click();
    }

    if (config.bannerText) {
      await this.getBottomBannerTextInput().fill(config.bannerText);
    }

    if (config.bannerColor) {
      const colorTextbox = this.getBottomBannerColorTextbox();
      await colorTextbox.click();
      await colorTextbox.fill(config.bannerColor);
      await colorTextbox.press("Escape");
    }

    await this.clickSave();
    await this.waitForUpdate();
  }

  async cycleTracks(trackOptions: string[]): Promise<string> {
    await this.clickTracksButton();

    let currentTrack: string | undefined = undefined;
    for (const track of trackOptions) {
      const locator = this.page.getByRole("radio", { name: track });

      if (await locator.isChecked()) {
        currentTrack = track;
        console.log(`Detected current track: "${track}"`);
        break;
      }
    }

    if (!currentTrack) {
      throw new Error(
        `Could not detect any of the tracks: ${trackOptions.join(", ")}`
      );
    }

    const currentIndex = trackOptions.indexOf(currentTrack);
    const nextTrack = trackOptions[(currentIndex + 1) % trackOptions.length];

    await this.selectTrack(nextTrack);
    console.log(`Cycling from "${currentTrack}" to "${nextTrack}"`);

    await this.clickOK();
    await this.clickSave();
    await this.waitForUpdate();

    return nextTrack;
  }

  async cycleNavigationButtons(modes: string[]): Promise<string> {
    return await this.cycleDropdownSetting("Navigation buttons", modes);
  }

  async cyclePowerButton(modes: string[]): Promise<string> {
    return await this.cycleDropdownSetting("Power button", modes);
  }

  async cycleDisplayError(modes: string[]): Promise<string> {
    return await this.cycleDropdownSetting("Display Error Messages", modes);
  }

  async cycleStatusBarInfo(modes: string[]): Promise<string> {
    return await this.cycleDropdownSetting(
      "Status bar information to display",
      modes
    );
  }

  private async cycleDropdownSetting(
    rowText: string,
    modes: string[]
  ): Promise<string> {
    const settingRow = this.page
      .locator("li.ant-list-item")
      .filter({ hasText: rowText });

    const currentValueElement = settingRow.locator(
      ".ant-select-selection-item"
    );
    await currentValueElement.waitFor({ state: "visible" });

    const currentText = (await currentValueElement.textContent())?.trim() ?? "";
    const currentMode = currentText.replace(/\s*\(deprecated\)$/i, "").trim();

    const currentIndex = modes.indexOf(currentMode);
    if (currentIndex === -1) {
      throw new Error(
        `Current mode "${currentMode}" not found in modes: ${modes.join(", ")}`
      );
    }

    const nextMode = modes[(currentIndex + 1) % modes.length];
    console.log(`Cycling "${rowText}" from "${currentMode}" to "${nextMode}"`);

    await currentValueElement.click();

    const dropdown = this.page.locator(".ant-select-dropdown:visible");
    await dropdown.waitFor({ state: "visible" });

    const nextOption = dropdown.locator(
      `.ant-select-item-option[title="${nextMode}"]`
    );
    await nextOption.waitFor({ state: "visible" });
    await nextOption.click();

    await this.clickSave();
    await this.waitForUpdate();

    return nextMode;
  }

  async performMultipleCycles<T extends string>(
    cycleMethod: () => Promise<T>,
    count: number
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < count; i++) {
      const result = await cycleMethod();
      results.push(result);
    }
    return results;
  }
}
