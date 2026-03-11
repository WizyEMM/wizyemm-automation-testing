import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { UserConfigurationPage } from "./userconfiguration.page";
import { userConfigurationData } from "./userconfigurationdata";

test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  // Navigate to dashboard to trigger auth from storageState
  await page.goto(`${config.baseUrl}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
});

test("userSort", async ({ page }) => {
  const userConfigPage = new UserConfigurationPage(page);

  await userConfigPage.navigateToConfiguration();
  await userConfigPage.navigateToUsers();
  await userConfigPage.sortUserColumns();

  await userConfigPage.filterByUserType(
    userConfigurationData.userTypes.regular
  );

  await userConfigPage.uncheckFilterByUserType(
    userConfigurationData.userTypes.regular
  );
  await userConfigPage.filterByUserType(
    userConfigurationData.userTypes.staging
  );

  await userConfigPage.uncheckFilterByUserType(
    userConfigurationData.userTypes.staging
  );

  await userConfigPage.toggleTableColumnVisibility();
  await userConfigPage.toggleAnotherTableColumn();
});

test.describe("User CRUD Operations", () => {
  let userConfigPage: UserConfigurationPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    userConfigPage = new UserConfigurationPage(page);
    await userConfigPage.navigateToConfiguration();
    await userConfigPage.navigateToUsers();
  });

  test("should create a new user", async ({ page }) => {
    const { user } = userConfigurationData;
    const uniqueUsername = `${user.username}.${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const [localPart, domain] = user.email.split("@");
    const uniqueEmail = `${localPart}.${Math.random()
      .toString(36)
      .substring(2, 9)}@${domain}`;

    await userConfigPage.createUser({
      username: uniqueUsername,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      email: uniqueEmail,
    });

    await userConfigPage.searchUserByEmail(uniqueEmail);
    await expect(page.getByText(uniqueUsername)).toBeVisible();
  });

  test("should update an existing user", async ({ page }) => {
    const { user } = userConfigurationData;
    const uniqueUsername = `${user.username}.${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const [localPart, domain] = user.email.split("@");
    const uniqueEmail = `${localPart}.${Math.random()
      .toString(36)
      .substring(2, 9)}@${domain}`;
    await userConfigPage.createUser({
      username: uniqueUsername,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      email: uniqueEmail,
    });

    await userConfigPage.searchUserByEmail(uniqueEmail);
    await userConfigPage.updateUser(
      uniqueUsername,
      user.firstNameEdit,
      user.lastNameEdit
    );
  });

  test("should delete a user", async ({ page }) => {
    const { user } = userConfigurationData;
    const uniqueUsername = `${user.username}.${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const [localPart, domain] = user.email.split("@");
    const uniqueEmail = `${localPart}.${Math.random()
      .toString(36)
      .substring(2, 9)}@${domain}`;
    await userConfigPage.createUser({
      username: uniqueUsername,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      email: uniqueEmail,
    });

    await userConfigPage.searchUserByEmail(uniqueEmail);
    await userConfigPage.deleteUser(uniqueUsername);
    await userConfigPage.refreshTable();
  });
});

test("wifi", async ({ page }) => {
  const userConfigPage = new UserConfigurationPage(page);
  const { wifi, navigation } = userConfigurationData;

  await userConfigPage.navigateToConfiguration();
  const wifiName = `${wifi.name}.${Math.random().toString(36).substring(2, 9)}`;
  const newWifiName = `${wifi.name}.${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  await userConfigPage.navigateToWifiNetworks();

  await userConfigPage.clickSortColumn("Name");
  await userConfigPage.clickSortColumn("SSID");

  await userConfigPage.createWifiNetwork(wifiName);

  await userConfigPage.configureWifiSecurity(
    wifi.password,
    wifi.securityProtocol
  );

  await userConfigPage.navigateToWifiNetworks();
  await userConfigPage.searchWifiByName(wifiName);

  await userConfigPage.updateWifiNetwork(wifiName, newWifiName, newWifiName);

  await userConfigPage.navigateToWifiNetworks();
  await userConfigPage.searchWifiByName(newWifiName);
  await userConfigPage.deleteWifiNetwork(newWifiName);
  await userConfigPage.refreshTable();
});

test("bundledActions", async ({ page }) => {
  const userConfigPage = new UserConfigurationPage(page);
  const { bundledActions } = userConfigurationData;

  await userConfigPage.navigateToConfiguration();
  const bundleName = `${bundledActions.name}.${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  await userConfigPage.navigateToBundledActions();
  await userConfigPage.clickSortColumn("Name");

  await userConfigPage.createBundledAction(bundleName);

  await userConfigPage.addActionToBundledAction(bundledActions.actionType);
});

test("advancedSettings", async ({ page }) => {
  const userConfigPage = new UserConfigurationPage(page);
  const { manufacturers } = userConfigurationData;

  await userConfigPage.navigateToConfiguration();
  await userConfigPage.navigateToAdvanced();

  for (const manufacturer of manufacturers) {
    await userConfigPage.toggleManufacturerVisibility(manufacturer);
    await userConfigPage.toggleManufacturerVisibility(manufacturer);
  }
});
