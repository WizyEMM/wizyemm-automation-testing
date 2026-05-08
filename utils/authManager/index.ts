/**
 * Authentication Manager
 * Handles login, cache restoration, and session management
 */

import { BrowserContext, Page } from "@playwright/test";
import config from "../env";
import {
  saveAuthCache,
  loadAuthCache,
  isAuthCacheValid,
  clearAuthCache,
  getCacheFilePath,
  JAMF_AUTH_ENV,
} from "./cache";
import { AuthCacheData, CookieData, TokenData } from "./types";
import {
  clickJamfIdSubmit,
  waitForJamfAppAfterIdp,
} from "./jamfUi";
import * as path from "path";
import * as fs from "fs";

// Re-export Jamf env constant for callers that branch on auth mode
export { JAMF_AUTH_ENV };

/**
 * Build auth payload from the current page (cookies + storage). Shared by standard and Jamf login.
 * Change: extracted from performLogin to avoid duplicating capture logic for Jamf flow.
 * JAMF Change: Capture ALL cookies, not just Auth0 ones - JAMF session might use different cookies
 */
async function buildAuthCacheData(page: Page): Promise<AuthCacheData> {
  const cookies = await page.context().cookies();
  
  // For JAMF: capture ALL cookies since we don't know which ones are needed for session
  // Filter out common non-essential cookies (tracking, analytics, etc.)
  const authCookies = cookies.filter((c) => {
    const name = c.name.toLowerCase();
    // Exclude tracking and analytics cookies
    const excludedPatterns = ["_ga", "_gid", "gtm", "segment", "amplitude"];
    const isExcluded = excludedPatterns.some(p => name.includes(p));
    return !isExcluded;
  });

  console.log(`📍 Total cookies: ${cookies.length}, keeping: ${authCookies.length}`);
  console.log(`📍 Cookie names: ${authCookies.map(c => c.name).join(", ")}`);

  const tokens = await extractTokensFromStorage(page);
  return {
    cookies: authCookies as CookieData[],
    tokens,
    timestamp: Date.now(),
  };
}

/**
 * Perform login and capture auth data
 * Extracts cookies and tokens from network requests/responses
 * Change: uses buildAuthCacheData; saveAuthCache uses TEST_ENV (or pass-through via optional env in future)
 */
export async function performLogin(
  page: Page,
  email: string,
  password: string
): Promise<AuthCacheData> {
  console.log("🔐 Starting login process...");

  // Navigate to login page with full baseURL
  await page.goto(config.baseUrl);
  console.log(`✓ Navigated to ${config.baseUrl}`);

  // Click Login button to go to login form
  try {
    await page.getByRole("button", { name: "Log in" }).click();
    console.log("✓ Clicked Login button");
  } catch (error) {
    console.log("ℹ Login button not found, continuing...");
  }

  // Wait for login form
  await page.waitForSelector("#login-form");
  console.log("✓ Login form found");

  // Fill email
  await page.fill("#email", email);
  console.log(`✓ Filled email: ${email}`);

  // Fill password
  await page.fill("#password", password);
  console.log("✓ Filled password");

  // Submit login form
  await page.click("#btn-login");
  console.log("✓ Clicked login button");

  // Wait for login to complete (redirect to dashboard)
  await page.waitForURL(/dashboard/);
  console.log("✓ Login successful - redirected to dashboard");

  const cacheData = await buildAuthCacheData(page);
  saveAuthCache(cacheData);
  return cacheData;
}

/**
 * Jamf instance login (Auth0 + Jamf ID UI).
 * Flow differs from WizyEMM: after app "Login", only email is shown; "Log in using Jamf ID" reveals password;
 * same button is clicked again to submit after password.
 * Change: new entry point for TEST_ENV=jamf / Jamf staging Manager for Android.
 */
export async function performLoginJamf(
  page: Page,
  email: string,
  password: string
): Promise<AuthCacheData> {
  console.log("🔐 Starting Jamf login process...");

  await page.goto(config.baseUrl);
  console.log(`✓ Navigated to ${config.baseUrl}`);

  try {
    await page.getByRole("button", { name: "Log in" }).click();
    console.log("✓ Clicked Login button");
  } catch (error) {
    console.log("ℹ Login button not found, continuing...");
  }

  // Wait for IdP / Auth0 shell before interacting (avoids racing the hosted login UI)
  await page
    .waitForURL(/auth0|account-|identifier|\/u\/login/i, { timeout: 60_000 })
    .catch(() => {
      console.log("ℹ IdP URL wait skipped (already on target flow)");
    });
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  // Identifier-first step: email (main page or iframe)
  const emailInput = page
    .locator(
      'input[type="email"], input[name="username"], input[name="email"], #username'
    )
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 60_000 });
  await emailInput.fill(email);
  console.log(`✓ Filled email: ${email}`);

  await clickJamfIdSubmit(page, "email");

  await page.waitForSelector("#password", { state: "visible", timeout: 60_000 });
  await page.fill("#password", password);
  console.log("✓ Filled password");

  await clickJamfIdSubmit(page, "password");

  // IdP may return to /, /callback, or /#/... — not always a path containing "dashboard".
  await waitForJamfAppAfterIdp(page, config.baseUrl);
  console.log("✓ Jamf login successful - back on Manager (post IdP)");

  // DON'T navigate explicitly here - let setupAuth/globalSetup handle it
  // This ensures localStorage has time to populate before we capture it
  
  const cacheData = await buildAuthCacheData(page);

  return cacheData;
}

/**
 * Extract JWT tokens from browser storage
 */
async function extractTokensFromStorage(page: Page): Promise<TokenData> {
  try {
    // Try to extract from localStorage
    const tokensFromStorage = await page.evaluate(() => {
      // @ts-ignore - window is available in page.evaluate() browser context
      const storage = window.localStorage;
      const keys = Object.keys(storage);

      console.log("📍 localStorage keys found:", keys);

      // Look for common token storage keys AND capture ALL items
      const tokenData: any = {};

      keys.forEach((key) => {
        const value = storage.getItem(key);
        // Log first 100 chars of each item for debugging
        console.log(`  📍 ${key}: ${value ? value.substring(0, 100) : 'null'}`);
        
        if (
          key.includes("access") ||
          key.includes("token") ||
          key.includes("auth") ||
          key.includes("jwt") ||
          key.includes("session")
        ) {
          tokenData[key] = value;
        }
      });

      // If no explicit token keys found, store ALL localStorage as a fallback
      if (Object.keys(tokenData).length === 0 && keys.length > 0) {
        console.log("⚠️  No token keys found, storing all localStorage items as fallback");
        keys.forEach((key) => {
          tokenData[key] = storage.getItem(key);
        });
      }

      return tokenData;
    });

    console.log("ℹ Tokens extracted from localStorage:", Object.keys(tokensFromStorage));

    // Return tokens or empty structure (will be populated during login interception)
    return {
      access_token: tokensFromStorage.access_token || "",
      id_token: tokensFromStorage.id_token || "",
      client_id: process.env.AUTH0_CLIENT_ID || "",
      audience: process.env.AUTH0_AUDIENCE || "https://wizyemm.eu/api",
    };
  } catch (error) {
    console.error("Failed to extract tokens from storage:", error);
    return {
      access_token: "",
      id_token: "",
      client_id: "",
      audience: "https://wizyemm.eu/api",
    };
  }
}

/**
 * Restore authentication from cache
 * Injects cached cookies and tokens into browser context
 * Change: optional authEnv loads the matching cache file (jamf vs default)
 * Change: Restore ALL captured localStorage items, not just known token keys
 */
export async function restoreAuthFromCache(
  context: BrowserContext,
  authEnv?: string
): Promise<boolean> {
  console.log("🔄 Attempting to restore auth from cache...");

  const cache = loadAuthCache(authEnv);

  if (!isAuthCacheValid(cache)) {
    console.log("⚠ Cache invalid or expired, fresh login required");
    return false;
  }

  try {
    // Add cookies to context
    if (cache && cache.cookies && cache.cookies.length > 0) {
      await context.addCookies(cache.cookies);
      console.log(`✓ Restored ${cache.cookies.length} cookies from cache`);
      console.log(`  Domains: ${[...new Set(cache.cookies.map(c => c.domain))].join(", ")}`);
      console.log(`  Names: ${cache.cookies.map(c => c.name).join(", ")}`);
    }

    // Set tokens/storage items in local storage if they exist
    const page = await context.newPage();
    await page.goto(config.baseUrl, { waitUntil: "domcontentloaded" });

    if (cache && cache.tokens && Object.keys(cache.tokens).length > 0) {
      // @ts-ignore - window is available in page.evaluate() browser context
      await page.evaluate((tokens) => {
        console.log("Setting tokens to localStorage:", Object.keys(tokens));
        Object.entries(tokens).forEach(([key, value]) => {
          if (value) {
            // @ts-ignore
            window.localStorage.setItem(key, value);
          }
        });
      }, cache.tokens);

      console.log(`✓ Restored ${Object.keys(cache.tokens).length} items to localStorage`);
      console.log(`  Keys: ${Object.keys(cache.tokens).join(", ")}`);
    }

    await page.close();
    console.log("✓ Auth cache restored successfully");

    return true;
  } catch (error) {
    console.error("Failed to restore auth from cache:", error);
    clearAuthCache(authEnv);
    return false;
  }
}

/**
 * Setup authentication for tests
 * Checks cache first, performs login if needed
 * Change: authEnv === jamf runs performLoginJamf and jamf cache; otherwise existing performLogin
 */
export async function setupAuth(
  context: BrowserContext,
  email: string,
  password: string,
  authEnv?: string
): Promise<void> {
  const restored = await restoreAuthFromCache(context, authEnv);

  if (!restored) {
    const page = await context.newPage();
    try {
      let cacheData: AuthCacheData | undefined;
      
      if (authEnv === JAMF_AUTH_ENV) {
        cacheData = await performLoginJamf(page, email, password);
        // Save auth cache for JAMF (so next globalSetup can reuse it)
        if (cacheData) {
          saveAuthCache(cacheData, JAMF_AUTH_ENV);
        }
      } else {
        await performLogin(page, email, password);
      }
      
      // For JAMF: capture storage state FROM THIS PAGE before closing
      // This ensures we get all localStorage that was set during login
      if (authEnv === JAMF_AUTH_ENV) {
        const storageDir = path.resolve(__dirname, "../../user/.auth");
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        
        // Wait for localStorage to be populated by Auth0 SDK
        console.log(`⏳ Waiting for localStorage to populate...`);
        let localStoragePopulated = false;
        for (let i = 0; i < 10; i++) {
          // @ts-ignore - window is available in page.evaluate() browser context
          const hasStorage = await page.evaluate(() => {
            const keys = Object.keys(window.localStorage);
            return keys.length > 0;
          });
          if (hasStorage) {
            localStoragePopulated = true;
            break;
          }
          await page.waitForTimeout(500);
        }
        
        if (!localStoragePopulated) {
          console.log(`⚠️  localStorage never populated (Auth0 tokens may be in cookies only)`);
        } else {
          console.log(`✓ localStorage populated`);
        }
        
        const storageStateFile = path.resolve(storageDir, "user-jamf.json");
        console.log(`↻ Capturing storage state from login page for JAMF...`);
        
        // Extract and manually add localStorage to storage state
        // @ts-ignore - window is available in page.evaluate() browser context
        const localStorageData = await page.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
              data[key] = window.localStorage.getItem(key) || "";
            }
          }
          return data;
        });
        
        // Get the context storage state (cookies + what Playwright captures)
        const storageState = await context.storageState();
        
        // Manually add localStorage to the origin if we found any
        if (localStorageData && Object.keys(localStorageData).length > 0) {
          const origin = new URL(config.baseUrl).origin;
          
          if (!storageState.origins) {
            storageState.origins = [];
          }
          
          // Find or create origin entry
          let originEntry = storageState.origins.find(o => o.origin === origin);
          if (!originEntry) {
            originEntry = { origin, localStorage: [] };
            storageState.origins.push(originEntry);
          }
          
          // Add localStorage items
          originEntry.localStorage = Object.entries(localStorageData).map(([name, value]) => ({
            name,
            value,
          }));
          
          console.log(`✓ Added ${Object.keys(localStorageData).length} localStorage items to origin`);
        }
        
        // Write manually to ensure all data is saved
        fs.writeFileSync(storageStateFile, JSON.stringify(storageState, null, 2));
        console.log(`✓ Storage state saved to ${storageStateFile}`);
      }
    } finally {
      await page.close();
    }
  }
}

/**
 * Clear cached authentication
 * Useful for logout or resetting tests
 * Change: optional authEnv clears the cache file for that bucket
 */
export async function clearAuth(authEnv?: string): Promise<void> {
  clearAuthCache(authEnv);
}

export { loadAuthCache, isAuthCacheValid, saveAuthCache, getCacheFilePath };
