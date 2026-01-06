import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { AdminAccountsPage } from "./adminaccounts.page";
import { adminAccountsData } from "./adminaccountsdata";


test.describe("Admin Accounts Management", () => {
  let adminAccountsPage: AdminAccountsPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    adminAccountsPage = new AdminAccountsPage(page);
    await adminAccountsPage.navigateToAdminAccounts();
  });

  test("should sort admin accounts by name and email columns", async () => {
    
    const { name, email } = adminAccountsData.sortColumns;
    await adminAccountsPage.sortByColumn(name);
    await adminAccountsPage.sortByColumn(email);
  });

  test("should filter admin accounts by all available roles", async () => {
    const { roleFilters } = adminAccountsData;
    await adminAccountsPage.applyRoleFilters(roleFilters);
  });

  test("should create super admin account", async () => {
    const { superAdmin } = adminAccountsData.users;

    const uniqueEmail = adminAccountsPage.generateUniqueEmail(
      superAdmin.emailPrefix,
      superAdmin.emailDomain
    );

    const newUser = {
      ...superAdmin,
      email: uniqueEmail,
    };

    await adminAccountsPage.createSuperAdmin(newUser);

    await adminAccountsPage.searchUser(uniqueEmail);
    await adminAccountsPage.verifyUserExists(uniqueEmail);
  });

  test("should delete super admin account", async () => {
    const { superAdmin } = adminAccountsData.users;

    const uniqueEmail = adminAccountsPage.generateUniqueEmail(
      superAdmin.emailPrefix,
      superAdmin.emailDomain
    );

    const newUser = {
      ...superAdmin,
      email: uniqueEmail,
    };

    await adminAccountsPage.createSuperAdmin(newUser);
    await adminAccountsPage.searchUser(uniqueEmail);

    await adminAccountsPage.selectUserByName(
      superAdmin.firstName,
      superAdmin.lastName
    );
    await adminAccountsPage.deleteSelectedUser();

    await adminAccountsPage.refreshTable();
    await adminAccountsPage.verifyUserNotExists(uniqueEmail);
  });

  test("should create regional administrator with profile and label", async () => {
    await adminAccountsPage.createProfile();
    await adminAccountsPage.createWiFiNetwork();
    await adminAccountsPage.createLabel();
    await adminAccountsPage.navigateToAdminAccounts();
    const { regionalAdmin } = adminAccountsData.users;

    const uniqueEmail = adminAccountsPage.generateUniqueEmail(
      regionalAdmin.emailPrefix,
      regionalAdmin.emailDomain
    );

    const newUser = {
      ...regionalAdmin,
      email: uniqueEmail,
    };

    await adminAccountsPage.createRegionalAdmin(newUser);

    await adminAccountsPage.searchUser(uniqueEmail);
    await adminAccountsPage.verifyUserExists(uniqueEmail);
    await adminAccountsPage.selectUserByName(
      regionalAdmin.firstName,
      regionalAdmin.lastName
    );
    await adminAccountsPage.deleteSelectedUser();
    await adminAccountsPage.cleanupTest();
    await adminAccountsPage.deleteProfile();
    await adminAccountsPage.deleteLabel();
    await adminAccountsPage.deleteWiFiNetwork();
  });

  test("should perform complete workflow: sort, filter, create, and delete", async () => {
    const { sortColumns, roleFilters, users } = adminAccountsData;

    await adminAccountsPage.sortByColumn(sortColumns.name);
    await adminAccountsPage.sortByColumn(sortColumns.email);

    await adminAccountsPage.applyRoleFilters(roleFilters.slice(0, 3));
    await adminAccountsPage.resetFilters("filter");

    const uniqueEmail = adminAccountsPage.generateUniqueEmail(
      users.superAdmin.emailPrefix,
      users.superAdmin.emailDomain
    );
    const newUser = { ...users.superAdmin, email: uniqueEmail };

    await adminAccountsPage.createSuperAdmin(newUser);
    await adminAccountsPage.searchUser(uniqueEmail);
    await adminAccountsPage.verifyUserExists(uniqueEmail);

    await adminAccountsPage.selectUserByEmail(uniqueEmail);
    await adminAccountsPage.deleteSelectedUser();
    await adminAccountsPage.refreshTable();
    await adminAccountsPage.verifyUserNotExists(uniqueEmail);
  });
});
