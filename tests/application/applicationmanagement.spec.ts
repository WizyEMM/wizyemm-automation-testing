import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { ApplicationManagementPage } from "./applicationmanagement.page";
import { applicationManagementData } from "./applicationmanagementdata";
import { generateAppPackageName } from "./application.helpers";

const { managedApp, publicApp, webApp, systemApp } = applicationManagementData;

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    
    const appMgmtPage = new ApplicationManagementPage(page);
    await appMgmtPage.navigateToApplicationManagement();
});

test('addManagedApp', async ({ page }) => {
    const appMgmtPage = new ApplicationManagementPage(page);
    const appPackageName = generateAppPackageName();

    await appMgmtPage.navigateToManagedApplications();
    await appMgmtPage.addManagedApplication(managedApp.name, appPackageName);
    await appMgmtPage.removeManagedApplication(managedApp.rowName);
});

test('publicApps', async ({ page }) => {
    const appMgmtPage = new ApplicationManagementPage(page);

    await appMgmtPage.navigateToPublicApplications();
    await appMgmtPage.searchPublicApp(publicApp.searchTerm);
    await appMgmtPage.clickPublicApp(publicApp.appName);
    await appMgmtPage.verifyPublicAppText(publicApp.expectedText);
});

test('webApps', async ({ page }) => {
    const appMgmtPage = new ApplicationManagementPage(page);

    await appMgmtPage.navigateToWebApplications();
    const webAppName = `WebApp-${Math.random().toString(36).substring(2, 7)}`;
    await appMgmtPage.createWebApp(webAppName, webApp.url);
    await appMgmtPage.verifyWebAppText(webApp.expectedText);
    await appMgmtPage.deleteWebApp(webAppName);
    await appMgmtPage.verifyWebAppDeleted(webApp.title);
});

test('systemApps', async ({ page }) => {
    const appMgmtPage = new ApplicationManagementPage(page);

    await appMgmtPage.navigateToSystemApplications();
    
    await appMgmtPage.sortSystemAppsColumn(systemApp.sortColumns.name);
    await appMgmtPage.sortSystemAppsColumn(systemApp.sortColumns.packageName);
    await appMgmtPage.sortSystemAppsColumn(systemApp.sortColumns.brand);
    await appMgmtPage.sortSystemAppsColumn(systemApp.sortColumns.model);
    
    await appMgmtPage.selectDevice();
});