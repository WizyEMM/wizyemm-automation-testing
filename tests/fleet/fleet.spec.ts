import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { fleetManagementPage } from "./fleet.page";
import {
  applicationLogsData,
  geolocationData,
  geofencingData,
} from "./fleetdata";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  // Navigate to dashboard to trigger auth from storageState
  await page.goto(`${config.baseUrl}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
});

test.describe("Fleet Management", () => {
  test("refreshAndSort - Application Logs sorting and filtering", async ({
    page,
  }) => {
    const fleetPage = new fleetManagementPage(page);

    await fleetPage.navigateToApplicationLogs();

    await page.getByRole("button", { name: "Refresh" }).click();
    await fleetPage.sortApplicationLogsColumns(applicationLogsData.sortColumns);

    await fleetPage.applyApplicationLogFilters(
      applicationLogsData.filterSequence
    );
  });

  test("geolocation - Search and label selection", async ({ page }) => {
    const fleetPage = new fleetManagementPage(page);
    const wifiName = `${geolocationData.wifiPrefix}.${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const labelName = `${geolocationData.labelPrefix}.${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    await fleetPage.createWiFiNetwork(wifiName);
    await fleetPage.createLabel(labelName, wifiName);

    await fleetPage.navigateToGeolocation();
    await fleetPage.selectSmartLabel(labelName);
    await fleetPage.searchLocation(geolocationData.searchLocation);
    await fleetPage.openSideMenuAndSelectLabel(labelName);

    await fleetPage.deleteLabel(labelName);
    await fleetPage.deleteWiFiNetwork(wifiName);
  });

  test("geofencing - Sorting and filtering zones", async ({ page }) => {
    const fleetPage = new fleetManagementPage(page);

    await fleetPage.navigateToGeofencing();

    await fleetPage.clickSortColumn(geofencingData.sortColumns[0]);

    await fleetPage.applyMultipleColumnFilters(
      geofencingData.filters.lockDevice.cellName,
      geofencingData.lockDeviceSequence
    );

    await fleetPage.resetFilter(geofencingData.filters.lockDevice.cellName);

    await fleetPage.applyMultipleColumnFilters(
      geofencingData.filters.alertAdmin.cellName,
      geofencingData.alertAdminSequence
    );

    await fleetPage.resetFilter(geofencingData.filters.alertAdmin.cellName);

    await fleetPage.clickRefresh();
  });
});
