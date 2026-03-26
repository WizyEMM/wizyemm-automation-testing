/**
 * Global Setup
 * Runs before all tests to handle authentication setup
 * Saves auth state to storage file for all tests to use
 * Change: TEST_ENV=jamf uses Jamf auth + auth-cache-jamf.json + user-jamf.json storage state
 */

import { chromium, FullConfig } from "@playwright/test";
import config from "../env";
import {
  setupAuth,
  loadAuthCache,
  isAuthCacheValid,
  restoreAuthFromCache,
  JAMF_AUTH_ENV,
} from "./index";
import * as fs from "fs";
import * as path from "path";

const isJamf = process.env.TEST_ENV === JAMF_AUTH_ENV;
// Resolve path relative to project root (consistent with playwright storageState)
const STORAGE_STATE_FILE = isJamf
  ? path.resolve(__dirname, "../../user/.auth/user-jamf.json")
  : path.resolve(__dirname, "../../user/.auth/user.json");

async function globalSetup(fullConfig: FullConfig) {
  console.log("\n🔐 GLOBAL SETUP: Starting authentication...\n");

  const browser = await chromium.launch();
  const context = await browser.newContext();

  const authEnv = isJamf ? JAMF_AUTH_ENV : undefined;

  try {
    const cache = loadAuthCache(authEnv);
    const isCacheValid = isAuthCacheValid(cache);

    if (isCacheValid) {
      console.log("✓ Using cached auth");
      await restoreAuthFromCache(context, authEnv);
    } else {
      console.log("↻ Performing login...");
      await setupAuth(context, config.email, config.password, authEnv);
    }

    // Save Playwright storage state for test contexts to load
    const page = await context.newPage();
    await page.goto(`${config.baseUrl}/dashboard`);

    const storageDir = path.dirname(STORAGE_STATE_FILE);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    await context.storageState({ path: STORAGE_STATE_FILE });
    await page.close();

    console.log("✓ Auth ready\n");
  } catch (error) {
    console.error("❌ Auth failed:", error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
