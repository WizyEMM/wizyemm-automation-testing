import { test, expect } from "@playwright/test";
import config from "../../../utils/env";
import { KioskPage } from "../shared/profilekiosk.page";
import { ProfileManagementPage } from "../shared/profilemanagement.page";
import { ProfileData, generateUniqueProfileName } from "../shared/profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile Kiosk Tests", () => {
  let kioskPage: KioskPage;
  let profileManagementPage: ProfileManagementPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    kioskPage = new KioskPage(page);
    profileManagementPage = new ProfileManagementPage(page);
    profileName = generateUniqueProfileName("Kiosk");
    await profileManagementPage.navigateToProfileManagement();
    await profileManagementPage.createProfile(
      profileName,
      ProfileData.profiles.type
    );
    await kioskPage.selectMultiApplicationKiosk();
    await kioskPage.navigateToKioskTab();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      await profileManagementPage.navigateToProfileManagement();
      if (profileName) {
        await profileManagementPage.deleteAllProfilesWithName(profileName);
      }
      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("kioskTracks - cycles through all track modes", async ({ page }) => {
    const cycleModes = ProfileData.kiosk.tracks;

    const results = await kioskPage.performMultipleCycles(
      () => kioskPage.cycleTracks(cycleModes),
      4
    );
    const [a, b, c, d] = results;

    const expectedModes = [
      cycleModes[(cycleModes.indexOf(a) + 1) % cycleModes.length],
      cycleModes[(cycleModes.indexOf(a) + 2) % cycleModes.length],
      cycleModes[(cycleModes.indexOf(a) + 3) % cycleModes.length],
      a,
    ];
    expect([b, c, d, a]).toEqual(expectedModes);
  });

  test("kioskNavigationButtons - cycles through navigation button modes", async ({
    page,
  }) => {
    const modes = ProfileData.kiosk.navigationButtons;

    const results = await kioskPage.performMultipleCycles(
      () => kioskPage.cycleNavigationButtons(modes),
      modes.length
    );
    const [a, b, c] = results;

    const expectedModes = [
      modes[(modes.indexOf(a) + 1) % modes.length],
      modes[(modes.indexOf(a) + 2) % modes.length],
      a,
    ];
    expect([b, c, a]).toEqual(expectedModes);
  });

  test("kioskPowerButton - toggles power button availability", async ({
    page,
  }) => {
    const modes = ProfileData.kiosk.powerButton;

    const results = await kioskPage.performMultipleCycles(
      () => kioskPage.cyclePowerButton(modes),
      modes.length
    );
    const [a, b] = results;

    const expectedModes = [modes[(modes.indexOf(a) + 1) % modes.length], a];
    expect([b, a]).toEqual(expectedModes);
  });

  test("kioskDisplayError - toggles display error messages", async ({
    page,
  }) => {
    const modes = ProfileData.kiosk.displayError;

    const results = await kioskPage.performMultipleCycles(
      () => kioskPage.cycleDisplayError(modes),
      modes.length
    );
    const [a, b] = results;

    const expectedModes = [modes[(modes.indexOf(a) + 1) % modes.length], a];
    expect([b, a]).toEqual(expectedModes);
  });

  test("kioskStatusBarInfo - cycles through status bar information modes", async ({
    page,
  }) => {
    const modes = ProfileData.kiosk.statusBarInfo;

    const results = await kioskPage.performMultipleCycles(
      () => kioskPage.cycleStatusBarInfo(modes),
      modes.length
    );
    const [a, b, c] = results;

    const expectedModes = [
      modes[(modes.indexOf(a) + 1) % modes.length],
      modes[(modes.indexOf(a) + 2) % modes.length],
      a,
    ];
    expect([b, c, a]).toEqual(expectedModes);
  });

  test("kioskDisplay - configures display settings with random values", async ({
    page,
  }) => {
    const randomColor = ProfileData.kiosk.generateRandomColor();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    await kioskPage.configureDisplay({
      increaseValue: true,
      gridBorders: true,
      bottomBanner: true,
      bannerText: timestamp,
      bannerColor: randomColor,
    });
  });
});
