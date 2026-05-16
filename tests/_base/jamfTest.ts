/**
 * Shared test base — keeps user-jamf.json in sync with the rotating Auth0
 * refresh token so sequential Jamf tests can hand off a live session.
 *
 * Why this is needed (and only for Jamf): the Jamf Auth0 API issues 5-minute
 * access tokens. During a run the Auth0 SPA SDK silently refreshes them, and
 * each refresh ROTATES the refresh token (old one invalidated). The normal
 * instance uses 1-hour tokens, so a whole run finishes before any refresh
 * happens — its static storageState never goes stale. On Jamf the rotation
 * happens constantly, so every rotation must be persisted or the next test
 * loads a dead token and lands on the login page.
 *
 * The rotation happens during page load (goto). We snapshot storageState
 * IMMEDIATELY after each app navigation — not at test teardown — because a
 * test that times out is torn down before teardown can run, which would lose
 * the rotation. Saving right after goto banks it within the first few seconds
 * of the test, before the body can time out. Teardown still saves as a
 * backstop for any late rotation.
 *
 * For non-Jamf TEST_ENV values this is a no-op and behaves identically to
 * `@playwright/test`.
 */
import { test as base, expect, type BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import config from "../../utils/env";

const JAMF_STORAGE_STATE = path.resolve(
  __dirname,
  "../../user/.auth/user-jamf.json"
);

const FIREBASE_TOKEN_TIMEOUT_MS = 15_000;
const NETWORK_IDLE_TIMEOUT_MS = 12_000;

function isAppUrl(currentUrl: string): boolean {
  try {
    return new URL(currentUrl).origin === new URL(config.baseUrl).origin;
  } catch {
    return false;
  }
}

async function saveStorageStateIfAuthenticated(
  context: BrowserContext
): Promise<void> {
  try {
    const state = await context.storageState();
    const stillAuthenticated = state.cookies.some(
      (c) => c.name.includes("is.authenticated") && c.value === "true"
    );
    if (stillAuthenticated) {
      fs.writeFileSync(JAMF_STORAGE_STATE, JSON.stringify(state, null, 2));
    }
  } catch {
  }
}

export const test = base.extend({
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
          await page
            .waitForLoadState("networkidle", {
              timeout: NETWORK_IDLE_TIMEOUT_MS,
            })
            .catch(() => {
            });
          await saveStorageStateIfAuthenticated(page.context());
        }
        return response;
      };

      page.on("framenavigated", (frame) => {
        if (frame !== page.mainFrame()) return;
        if (!isAppUrl(frame.url())) return;
        void saveStorageStateIfAuthenticated(page.context());
      });
    }
    await use(page);
  },

  context: async ({ context }, use) => {
    await use(context);
    if (process.env.TEST_ENV !== "jamf") return;
    await saveStorageStateIfAuthenticated(context);
  },
});

export { expect };
