import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { JAMF_AUTH_ENV } from "../../utils/authManager/cache";
import {
  loginJamf,
  loginJamfWithInvalidCredentials,
  forgotPasswordJamf,
} from "./login.jamf";

test.describe.configure({ timeout: 120_000 });

const isJamf = process.env.TEST_ENV === JAMF_AUTH_ENV;

test.describe("Jamf login", () => {
  /** Spec-level login uses globalSetup cached storage (same as normal instance). */
  // Removed: test.use({ storageState: { cookies: [], origins: [] } });
  // Now tests reuse cached auth from globalSetup → user-jamf.json

  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!isJamf, "Set TEST_ENV=jamf (e.g. npm run test:jamf)");
  });

  test("jamfLogin", async ({ page }) => {
    await loginJamf({ page });

    const url = new URL(page.url());
    expect(url.origin).toBe(new URL(config.baseUrl).origin);
    const onDashboardPath =
      /dashboard/i.test(url.pathname) ||
      /dashboard/i.test(url.hash) ||
      url.pathname === "/" ||
      url.pathname === "";
    expect(onDashboardPath).toBeTruthy();
  });

  test("jamfLoginWithInvalidCredentials", async ({ page }) => {
    await loginJamfWithInvalidCredentials({ page });
  });

  test("forgotPasswordJamf", async ({ page }) => {
    await forgotPasswordJamf({ page });
  });
});
