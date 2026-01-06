import { test } from "@playwright/test";
import config from "../../utils/env";
import {
  DashboardPage,
  HeaderNavigationPage,
  DashboardCustomizationPage,
  AlertEventsPage,
} from "../dashboard/dashboard.page";

test.describe.configure({ timeout: 60_000 });

test.describe("Dashboard Navigation", () => {
  test("should navigate through main menu items and return to dashboard", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.navigateToProfiles();
    await dashboardPage.verifyURL(`${config.baseUrl}/profiles`);
    await dashboardPage.clickLogo();

    await dashboardPage.navigateToUsers();
    await dashboardPage.verifyURL(`${config.baseUrl}/config/users`);
    await dashboardPage.clickLogo();

    await dashboardPage.navigateToRegisteredDevices();
    await dashboardPage.verifyURL(`${config.baseUrl}/devices/manage/list`);
    await dashboardPage.clickLogo();

    await dashboardPage.navigateToEnrolledDevices();
    await dashboardPage.verifyURL(`${config.baseUrl}/devices/manage/list`);
    await dashboardPage.clickLogo();

    await dashboardPage.verifyURL(`${config.baseUrl}/dashboard`);
  });

  test("should display all dashboard widgets", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.verifyDashboardWidgets();
  });
});

test.describe("Header Navigation", () => {
  test("should open help center and settings from header icons", async ({
    page,
  }) => {
    const headerNav = new HeaderNavigationPage(page);

    // Auth is handled by globalSetup
    const helpCenterPage1 = await headerNav.waitForPopup(
      async () => await headerNav.clickHelpCenterIcon()
    );
    await headerNav.verifyHelpCenterURL(helpCenterPage1);

    await headerNav.clickSettingsIcon();
    await headerNav.verifyPersonalSettings();

    const helpCenterPage2 = await headerNav.waitForPopup(
      async () => await headerNav.clickHelpCenterLink()
    );
    await headerNav.verifyHelpCenterURL(helpCenterPage2);
  });

  test("should open alerts and notifications dropdowns", async ({ page }) => {
    const alertPage = new AlertEventsPage(page);

    // Auth is handled by globalSetup
    await alertPage.openAlerts();
    await alertPage.openNotifications();
  });
});

test.describe("Dashboard Customization", () => {
  test("should drag and drop widgets to reorder dashboard", async ({
    page,
  }) => {
    const customizePage = new DashboardCustomizationPage(page);
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.navigateToDashboard();
    await customizePage.openCustomizeDashboard();
    await customizePage.dragCardToPosition(
      "Last Seen Breakdown",
      "Battery Level Breakdown"
    );
    await customizePage.saveChanges();
  });

  test("should reset dashboard to default layout", async ({ page }) => {
    const customizePage = new DashboardCustomizationPage(page);
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.navigateToDashboard();
    await customizePage.openCustomizeDashboard();
    await customizePage.resetDashboard();

    await customizePage.verifyResetButtonDisabled();
    await customizePage.verifySaveButtonEnabled();

    await customizePage.saveChanges();
  });
});
