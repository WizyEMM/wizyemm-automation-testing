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

/**
 * Persist the context's storageState to user-jamf.json, but only if the
 * session is still alive — detected via the app-domain Auth0
 * `is.authenticated` cookies. If the context ended on the login page (auth
 * lost, logout flow) we skip the write so the next test inherits the last
 * good session instead of a poisoned snapshot. Fails open: any error
 * (context already closed, etc.) is swallowed.
 */
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
    // Context already closed or storageState unavailable — nothing to persist.
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.TEST_ENV === "jamf") {
      const originalGoto = page.goto.bind(page);
      page.goto = async (url, opts) => {
        const response = await originalGoto(url, opts);
        if (isAppUrl(page.url())) {
          // 1. Firebase auth ready — API calls will carry a token.
          await page
            .waitForFunction(
              () => (window as any).FIREBASE_TOKEN !== undefined,
              { timeout: FIREBASE_TOKEN_TIMEOUT_MS }
            )
            .catch(() => {
              // Token never appeared — proceed; the test fails on its own.
            });
          // 2. Network settled — proxy for "React finished hydrating and
          //    initial data loaded". FIREBASE_TOKEN is set during early
          //    bootstrap, before the nav menu's click handlers attach, so
          //    on the slower CI runner a test that clicks a menu item right
          //    after goto gets a no-op click. Waiting for networkidle closes
          //    that race.
          await page
            .waitForLoadState("networkidle", {
              timeout: NETWORK_IDLE_TIMEOUT_MS,
            })
            .catch(() => {
              // Network never went idle (polling/websocket) — proceed; the
              // 12s elapsed is enough for hydration on a slow runner anyway.
            });
          // 3. Bank the post-refresh token NOW. The Auth0 SDK rotated the
          //    refresh token during this navigation; persist it before the
          //    test body can time out and lose it.
          await saveStorageStateIfAuthenticated(page.context());
        }
        return response;
      };
    }
    await use(page);
  },

  context: async ({ context }, use) => {
    await use(context);
    if (process.env.TEST_ENV !== "jamf") return;
    // Backstop: capture any rotation that happened after the last goto
    // (e.g. a click-triggered navigation, or an SDK refresh mid-test).
    await saveStorageStateIfAuthenticated(context);
  },
});

export { expect };
