import { test, expect } from "@playwright/test";
import config from "../../../utils/env";
import { ApplicationsPage } from "../shared/applications.page";
import { PersonalAppsPage } from "../shared/personalapplications.page";
import { ProfileManagementPage } from "../shared/profilemanagement.page";
import { ProfileData, generateUniqueProfileName } from "../shared/profiledata";

test.describe.configure({ timeout: 60_000 });

test.describe("Profile Application Tests", () => {
  let profileMgmt: ProfileManagementPage;
  let appsPage: ApplicationsPage;
  let personalApps: PersonalAppsPage;
  let profileName: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    profileMgmt = new ProfileManagementPage(page);
    appsPage = new ApplicationsPage(page);
    personalApps = new PersonalAppsPage(page);

    await profileMgmt.navigateToProfileManagement();
  });

  test.afterEach(async ({ page }, testInfo) => {
    try {
      const modal = page.locator(".ant-modal-wrap");
      if (await modal.isVisible()) {
        await page.keyboard.press("Escape");
        await modal.waitFor({ state: "hidden" });
      }

      await profileMgmt.navigateToProfileManagement();

      if (profileName) {
        await profileMgmt.deleteAllProfilesWithName(profileName);
      }

      console.log(`Cleanup completed for: ${testInfo.title}`);
    } catch (error) {
      console.warn(`Cleanup failed for ${testInfo.title}:`, error);
    }
  });

  test("whiteRemove - Add and remove application from whitelist", async () => {
    profileName = generateUniqueProfileName("WhiteRemove");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(ProfileData.applications.slack);
    await appsPage.removeApplicationFromWhitelist(
      ProfileData.applications.slack
    );
    await appsPage.saveChanges();
  });

  test("installTypes - Cycle through install types", async () => {
    profileName = generateUniqueProfileName("InstallTypes");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(
      ProfileData.applications.wizyVision
    );

    const appRow = await appsPage.getAppRow(
      ProfileData.applications.appRowWizyVision
    );
    const results: string[] = [];

    for (let i = 0; i < ProfileData.installTypes.length; i++) {
      const newType = await appsPage.cycleInstallType(
        appRow,
        ProfileData.installTypes
      );
      results.push(newType);
    }

    const [a, b, c] = results;
    const expectedTypes = [
      ProfileData.installTypes[
        (ProfileData.installTypes.indexOf(a) + 1) %
          ProfileData.installTypes.length
      ],
      ProfileData.installTypes[
        (ProfileData.installTypes.indexOf(a) + 2) %
          ProfileData.installTypes.length
      ],
      a,
    ];

    expect([b, c, a]).toEqual(expectedTypes);
    await appsPage.saveChanges();
  });

  test("disableApp - Toggle app disable state", async () => {
    profileName = generateUniqueProfileName("DisableApp");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(
      ProfileData.applications.wizyVision
    );
    await appsPage.toggleAppDisable(ProfileData.applications.appRowWizyVision);
    await appsPage.saveChanges();
  });

  test("playStoreMode - Cycle through Play Store modes", async () => {
    profileName = generateUniqueProfileName("PlayStoreMode");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();

    const a = await appsPage.cyclePlayStoreMode(
      ProfileData.playStoreModes.work
    );
    const b = await appsPage.cyclePlayStoreMode(
      ProfileData.playStoreModes.work
    );
    const c = await appsPage.cyclePlayStoreMode(
      ProfileData.playStoreModes.work
    );

    const expectedModes = [
      ProfileData.playStoreModes.work[
        (ProfileData.playStoreModes.work.indexOf(a) + 1) %
          ProfileData.playStoreModes.work.length
      ],
      ProfileData.playStoreModes.work[
        (ProfileData.playStoreModes.work.indexOf(a) + 2) %
          ProfileData.playStoreModes.work.length
      ],
      a,
    ];
    
    expect([b, c, a]).toEqual(expectedModes);
    await appsPage.saveChanges();
  });

  test("appConfig - Configure app settings", async () => {
    profileName = generateUniqueProfileName("AppConfig");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(
      ProfileData.applications.wizyVision
    );
    await appsPage.openAppConfiguration(
      ProfileData.applications.appRowWizyVision
    );
    await appsPage.toggleConfigurationSwitch();
    await appsPage.submitConfiguration();

    const downloadTriggered = await appsPage.exportConfiguration(
      ProfileData.applications.appRowWizyVision
    );
    expect(downloadTriggered).toBe(true);
  });

  test("appPermissions - Cycle through permission states", async () => {
    profileName = generateUniqueProfileName("AppPermissions");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(
      ProfileData.applications.wizyVision
    );
    await appsPage.openAppPermissions(
      ProfileData.applications.appRowWizyVision
    );
    await appsPage.cyclePermissionState(
      ProfileData.applications.appRowWizyVision,
      ProfileData.permissions.camera,
      ProfileData.permissionStates
    );
  });

test.skip("appTrack - Cycle through app tracks", async () => {
    profileName = generateUniqueProfileName("AppTrack");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.addApplicationToWhitelist(
      ProfileData.applications.wizyVision
    );

    const results: string[] = [];
    // Open tracks once before the loop
    await appsPage.openAppTracks(ProfileData.applications.appRowWizyVision);
    
    for (let i = 0; i < ProfileData.tracks.length; i++) {
      const newTrack = await appsPage.cycleTrack(
        ProfileData.applications.appRowWizyVision,
        ProfileData.tracks
      );
      results.push(newTrack);
    }

    const [a, b, c, d] = results;
    const expectedTracks = [
      ProfileData.tracks[
        (ProfileData.tracks.indexOf(a) + 1) % ProfileData.tracks.length
      ],
      ProfileData.tracks[
        (ProfileData.tracks.indexOf(a) + 2) % ProfileData.tracks.length
      ],
      ProfileData.tracks[
        (ProfileData.tracks.indexOf(a) + 3) % ProfileData.tracks.length
      ],
      a,
    ];

    expect([b, c, d, a]).toEqual(expectedTracks);
  });


  test.skip("personalWhiteRemove - Single kiosk app management", async ({
    page,
  }) => {
    profileName = generateUniqueProfileName("PersonalWhiteRemove");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();

    // Set Play Store Mode to Restricted then Kiosk
    await appsPage.setPlayStoreMode("Restricted Play Store");
    await appsPage.setPlayStoreMode("Single-Application Kiosk");
    
    // Confirm kiosk mode switch
    await page.getByRole("button", { name: "Yes" }).click();
    await page.waitForTimeout(500);

    // Add application in kiosk mode
    await appsPage.addKioskModeApplication(
      ProfileData.applications.wizyVision
    );

    // Dismiss success message
    await page.waitForTimeout(300);

    // Remove the application
    await appsPage.removeKioskModeApplication(
      ProfileData.applications.wizyVision
    );

    // Navigate back to profile management for cleanup
    await profileMgmt.navigateToProfileManagement();
  });

  test.skip("personalPlayStoreMode - COPE personal apps", async () => {
    profileName = generateUniqueProfileName("PersonalPlayStore");

    await profileMgmt.createProfile(
      profileName,
      ProfileData.profileTypes.copeProfile
    );
    await personalApps.navigateToPersonalAppsTab();

    const a = await personalApps.cyclePlayStoreMode(
      ProfileData.playStoreModes.personal
    );
    const b = await personalApps.cyclePlayStoreMode(
      ProfileData.playStoreModes.personal
    );

    const expectedModes = [
      ProfileData.playStoreModes.personal[
        (ProfileData.playStoreModes.personal.indexOf(a) + 1) %
          ProfileData.playStoreModes.personal.length
      ],
      a,
    ];

    expect([b, a]).toEqual(expectedModes);
    await personalApps.saveChanges();
  });

  test("actionsAdvanced - Toggle advanced permissions", async () => {
    profileName = generateUniqueProfileName("ActionsAdvanced");

    await profileMgmt.createProfile(profileName, ProfileData.profiles.type);
    await appsPage.navigateToApplicationsTab();
    await appsPage.openAdvancedSettings();
    await appsPage.toggleMultipleAdvancedPermissions(
      ProfileData.advancedPermissions
    );
    await appsPage.saveAdvancedSettings();
  });
});
