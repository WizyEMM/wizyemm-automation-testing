import { test, expect } from "../_base/jamfTest";
import config from "../../utils/env";
import { AdminAccountsPage } from "./adminaccounts.page";
import { adminAccountsData } from "./adminaccountsdata";


test.describe("Admin Accounts Management", () => {
  let adminAccountsPage: AdminAccountsPage;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.TEST_ENV === "jamf" && testInfo.tags.includes("@noJamf"),
      "Feature is not available on Jamf"
    );

    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);
    adminAccountsPage = new AdminAccountsPage(page);
    await adminAccountsPage.navigateToAdminAccounts();
  });

  test("sortAdmins - should sort admin accounts by name and email columns", {tag: [`@smoke`, `@regression`]}, async () => {
    
    const { name, email } = adminAccountsData.sortColumns;
    await adminAccountsPage.sortByColumn(name);
    await adminAccountsPage.sortByColumn(email);
  });

  test("filterAdmins - should filter admin accounts by all available roles", {tag: [`@smoke`, `@regression`]}, async () => {
    const { roleFilters } = adminAccountsData;
    await adminAccountsPage.applyRoleFilters(roleFilters);
  });

  test("tablePagination - should display correct number of items per page", {tag: [`@smoke`, `@regression`]}, async () => {
    const { defaultPageSize, pageSizeOptions } = adminAccountsData.pagination;
    const { pagination } = adminAccountsPage;

    await pagination.selectPageSize(defaultPageSize);
    const total = await pagination.getTotalCount();

    if (total <= defaultPageSize) {
      await pagination.verifySinglePage(total, pageSizeOptions);
    } else {
      await pagination.verifyMultiPage(total, pageSizeOptions);
    }
  });

  test("contactUsAccessibility - User should be redirected to the support page to send a request / message", {tag: [`@smoke`, `@regression`, `@noJamf`]}, async () => {
    await adminAccountsPage.verifyMfaBannerVisible();
    const supportPage = await adminAccountsPage.openContactUs();
    await adminAccountsPage.verifySupportPage(supportPage);
    await supportPage.close();
  });

  test("createSuperAdmin - should create super admin account", {tag: [`@smoke`, `@regression`]}, async () => {
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
    await adminAccountsPage.selectUserByEmail(uniqueEmail);
    await adminAccountsPage.deleteSelectedUser();

    await adminAccountsPage.refreshTable();
    await adminAccountsPage.verifyUserNotExists(uniqueEmail);
  });

  test("updateSuperAdmin - should update super admin account", {tag: [`@smoke`, `@regression`]}, async () => {
    const { superAdmin } = adminAccountsData.users;

    const uniqueEmail = adminAccountsPage.generateUniqueEmail(
      superAdmin.emailPrefix,
      superAdmin.emailDomain
    );

    const newUser = {
      ...superAdmin,
      email: uniqueEmail,
    };

    const { updatedName } = superAdmin;

    await adminAccountsPage.createSuperAdmin(newUser);

    try {
      await adminAccountsPage.searchUser(uniqueEmail);
      await adminAccountsPage.openAdminDetails(uniqueEmail);
      await adminAccountsPage.updateAdminName(
        updatedName.firstName,
        updatedName.lastName
      );
      await adminAccountsPage.searchUser(uniqueEmail);
      await adminAccountsPage.verifyUserName(
        uniqueEmail,
        updatedName.firstName,
        updatedName.lastName
      );
    } finally {
      // Always remove the account, even if the update steps fail.
      await adminAccountsPage.navigateToAdminAccounts();
      await adminAccountsPage.searchUser(uniqueEmail);
      await adminAccountsPage.selectUserByEmail(uniqueEmail);
      await adminAccountsPage.deleteSelectedUser();
    }

    await adminAccountsPage.refreshTable();
    await adminAccountsPage.verifyUserNotExists(uniqueEmail);
  });

  test("deleteSuperAdmin - should delete super admin account", {tag: [`@smoke`, `@regression`]}, async () => {
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

  test("createRegionalAdmin - should create regional administrator with profile and label", {tag: [`@regression`]}, async () => {
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

  test("completeWorkflowAdmins - should perform complete workflow: sort, filter, create, and delete", {tag: [`@smoke`, `@regression`]}, async () => {
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
