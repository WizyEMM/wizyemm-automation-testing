/**
 * Test data for "Please" text removal verification
 * These are the key pages and workflows where "Please" text was removed
 */

export const translationTestData = {
  pagesToCheck: [
    {
      name: "Login Page",
      url: "/login",
      description: "Check login/password reset messages",
    },
    {
      name: "Admin Accounts",
      url: "/admin/accounts",
      description: "Check admin table and filters",
    },
    {
      name: "Profile Management",
      url: "/profile",
      description: "Check profile-related modals and messages",
    },
    {
      name: "Application Management",
      url: "/application",
      description: "Check application management modals",
    },
    {
      name: "Dashboard",
      url: "/dashboard",
      description: "Check dashboard messages and notifications",
    },
    {
      name: "Settings",
      url: "/settings",
      description: "Check settings page messages",
    },
  ],

  /**
   * Components/modals that should be checked for "Please" text
   * These map to the translation keys that had "Please" removed
   */
  componentsWithRemovedText: [
    "ConfirmPassword",
    "ModalCreateAdministrator",
    "ModalCreateUser",
    "ModalCreateProfile",
    "ModalDuplicateProfile",
    "ModalUpdateAdministrator",
    "ModalUpdateUser",
    "TabDeviceRemoteControl",
    "TableAdministrators",
    "SettingCurrentAdministrator",
    "ModalInstallApk",
    "ModalInstallCertificate",
    "ModalPushFiles",
    "ModalRetrieveFiles",
    "TabProfileKiosk",
    "ModalZebraCreateDeployment",
  ],

  /**
   * Text to NOT appear on pages
   * These are variations of the removed "Please" text
   */
  textToNotAppear: [
    "Please", // Main keyword
  ],
};
