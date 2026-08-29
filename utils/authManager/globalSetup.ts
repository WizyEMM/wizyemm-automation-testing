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
  clearAuth,
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
  const context = await browser.newContext(
    isJamf ? { locale: "en-US" } : {}
  );

  // team-a hangs on the loading screen without this key set before app load.
  if (config.lscacheKey && config.lscacheValue) {
    await context.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [config.lscacheKey, config.lscacheValue]
    );
  }

  const authEnv = isJamf ? JAMF_AUTH_ENV : undefined;

  let didFreshLogin = false;
  try {
    const cache = loadAuthCache(authEnv);
    const isCacheValid = isAuthCacheValid(cache);

    if (isCacheValid) {
      if (isJamf && !fs.existsSync(STORAGE_STATE_FILE)) {
        // Auth0 cookies are valid but user-jamf.json is missing.
        // Clear auth cache so setupAuth skips restoreAuthFromCache and does a full fresh login,
        // which is the only path that saves user-jamf.json with the complete OAuth session.
        console.log("↻ user-jamf.json not found, clearing cache to force fresh login...");
        await clearAuth(JAMF_AUTH_ENV);
        await setupAuth(context, config.email, config.password, authEnv);
        didFreshLogin = true;
      } else {
        console.log("✓ Using cached auth");
        await restoreAuthFromCache(context, authEnv);
        // For Jamf: user-jamf.json already has the full session from the last fresh login
        // (including the app-domain is.authenticated cookies set during the OAuth callback).
        // Do NOT overwrite it here — restoreAuthFromCache only restores the 4 Auth0 cookies.
      }
    } else {
      console.log("↻ Performing login...");
      await setupAuth(context, config.email, config.password, authEnv);
      didFreshLogin = true;
    }

    if (isJamf && didFreshLogin) {
      const warmupPage = await context.newPage();
      try {
        console.log("⏳ Warming up Jamf session (navigating to dashboard)...");
        await warmupPage.goto(`${config.baseUrl}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await warmupPage.waitForTimeout(3000); // let Auth0 SDK finish any silent token refresh
        const storageDir = path.dirname(STORAGE_STATE_FILE);
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        await context.storageState({ path: STORAGE_STATE_FILE });
        console.log("✓ user-jamf.json updated after Auth0 SDK warmup");
      } catch (e) {
        console.log(`ℹ Dashboard warmup skipped: ${e}`);
      } finally {
        await warmupPage.close();
      }
    }

    // For normal instance: capture storage state from fresh page
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
