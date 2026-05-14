/**
 * Shared test base — saves storageState back to user-jamf.json after each
 * Jamf test so the next test inherits the rotated refresh token.
 *
 * Why: Auth0 rotates the refresh token on every use; without re-saving,
 * every test loads the same stale snapshot from globalSetup and gets logged
 * out once Auth0's brief replay leeway expires. With workers=1, sequential
 * tests can hand off the post-rotation token via this file.
 *
 * For non-Jamf TEST_ENV values this is a no-op and behaves identically to
 * `@playwright/test`.
 */
import { test as base, expect } from "@playwright/test";
import * as path from "path";
import config from "../../utils/env";

const JAMF_STORAGE_STATE = path.resolve(
  __dirname,
  "../../user/.auth/user-jamf.json"
);

const FIREBASE_TOKEN_TIMEOUT_MS = 15_000;

function isAppUrl(currentUrl: string): boolean {
  try {
    return new URL(currentUrl).origin === new URL(config.baseUrl).origin;
  } catch {
    return false;
  }
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await use(context);
    if (process.env.TEST_ENV !== "jamf") return;
    try {
      const state = await context.storageState();
      const stillAuthenticated = state.cookies.some(
        (c) => c.name.includes("is.authenticated") && c.value === "true"
      );
      if (stillAuthenticated) {
        const fs = require("fs") as typeof import("fs");
        fs.writeFileSync(JAMF_STORAGE_STATE, JSON.stringify(state, null, 2));
      }
    } catch {
    }
  },


  page: async ({ page }, use) => {
    if (process.env.TEST_ENV === "jamf") {
      const originalGoto = page.goto.bind(page);
      page.goto = async (url, opts) => {
        const response = await originalGoto(url, opts);
        if (isAppUrl(page.url())) {
          await page
            .waitForFunction(
              () => (window as any).FIREBASE_TOKEN !== undefined,
              { timeout: FIREBASE_TOKEN_TIMEOUT_MS }
            )
            .catch(() => {
            });
        }
        return response;
      };
    }
    await use(page);
  },
});

export { expect };
