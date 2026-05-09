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

const JAMF_STORAGE_STATE = path.resolve(
  __dirname,
  "../../user/.auth/user-jamf.json"
);

export const test = base.extend({
  context: async ({ context }, use) => {
    await use(context);
    if (process.env.TEST_ENV === "jamf") {
      try {
        await context.storageState({ path: JAMF_STORAGE_STATE });
      } catch {
        // Context already closed (e.g. test crashed) — nothing to persist.
      }
    }
  },
});

export { expect };
