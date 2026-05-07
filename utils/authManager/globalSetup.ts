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

/** Match npm scripts: `HEADLESS=false` opens a real browser; unset defaults to headless (e.g. CI). */
function launchHeadless(): boolean {
  return (
    process.env.HEADLESS !== "false" && process.env.HEADLESS !== "0"
  );
}

const isJamf = process.env.TEST_ENV === JAMF_AUTH_ENV;
// Resolve path relative to project root (consistent with playwright storageState)
const STORAGE_STATE_FILE = isJamf
  ? path.resolve(__dirname, "../../user/.auth/user-jamf.json")
  : path.resolve(__dirname, "../../user/.auth/user.json");

async function globalSetup(fullConfig: FullConfig) {
  console.log("\n🔐 GLOBAL SETUP: Starting authentication...\n");
  console.log(`📌 TEST_ENV: ${process.env.TEST_ENV || "NOT SET (using default instance)"}`);
  console.log(`📌 JAMF Mode: ${isJamf}`);
  console.log(`📌 Storage State Path: ${STORAGE_STATE_FILE}\n`);

  const browser = await chromium.launch({ headless: launchHeadless() });
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

    // For normal instance: capture storage state from fresh page
    // For JAMF: setupAuth already captured it from login page
    if (!isJamf) {
      // Save Playwright storage state for test contexts to load
      const page = await context.newPage();
      
      // Navigate to baseUrl first to ensure domain sets session cookies
      await page.goto(`${config.baseUrl}`, { waitUntil: "domcontentloaded" });
      console.log(`✓ Navigated to base URL`);
      
      // Then navigate to dashboard to ensure full session establishment
      await page.goto(`${config.baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      console.log(`✓ Navigated to dashboard`);
      
      // Give the app a moment to fully populate localStorage after navigation
      await page.waitForTimeout(2000).catch(() => {});

      const storageDir = path.dirname(STORAGE_STATE_FILE);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      await context.storageState({ path: STORAGE_STATE_FILE });
      await page.close();
    }

    // Log summary of what was saved
    const storageStatePath = isJamf 
      ? path.resolve(__dirname, "../../user/.auth/user-jamf.json")
      : STORAGE_STATE_FILE;
    
    if (fs.existsSync(storageStatePath)) {
      const storageState = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
      console.log(`\n📊 Storage State Summary:`);
      console.log(`  Cookies: ${storageState.cookies?.length || 0}`);
      console.log(`  Origins: ${storageState.origins?.length || 0}`);
      if (storageState.cookies && storageState.cookies.length > 0) {
        const domains = [...new Set(storageState.cookies.map((c: any) => c.domain))];
        console.log(`  Cookie domains: ${domains.join(", ")}`);
        console.log(`  Cookie names: ${storageState.cookies.map((c: any) => c.name).join(", ")}`);
      }
      if (storageState.origins && storageState.origins.length > 0) {
        storageState.origins.forEach((origin: any) => {
          const storageCount = origin.localStorage?.length || 0;
          console.log(`  Origin ${origin.origin}: ${storageCount} localStorage items`);
        });
      }
    }

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
