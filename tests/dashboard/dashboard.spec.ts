import { test } from "../_base/jamfTest";
import config from "../../utils/env";
import {
  DashboardPage,
  HeaderNavigationPage,
  DashboardCustomizationPage,
  AlertEventsPage,
} from "../dashboard/dashboard.page";


test.describe("Dashboard Navigation", () => {
  test("should navigate through main menu items and return to dashboard", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.initializeDashboard();
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
    await dashboardPage.initializeDashboard();
    await dashboardPage.verifyDashboardWidgets();
  });
});

test.describe("Header Navigation", () => {
  test("should open help center and settings from header icons", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    const headerNav = new HeaderNavigationPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.initializeDashboard();
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
    const dashboardPage = new DashboardPage(page);
    const alertPage = new AlertEventsPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.initializeDashboard();
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
    await dashboardPage.initializeDashboard();
    await customizePage.openCustomizeDashboard();
    await customizePage.dragCardToPosition(
      "Last Seen Breakdown",
      "Battery Level Breakdown"
    );
    await customizePage.saveChanges();
    await customizePage.verifySuccessNotification();
    
  });

  test("should reset dashboard to default layout", async ({ page }) => {
    const customizePage = new DashboardCustomizationPage(page);
    const dashboardPage = new DashboardPage(page);

    // Auth is handled by globalSetup
    await dashboardPage.initializeDashboard();
    await customizePage.openCustomizeDashboard();
    await customizePage.resetDashboard();

    // Check if reset worked and save button is visible, otherwise cancel
    await customizePage.verifyResetOrCancel();
  });
});
