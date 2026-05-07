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

// Re-export Jamf env constant for callers that branch on auth mode
export { JAMF_AUTH_ENV };

/**
 * Build auth payload from the current page (cookies + storage). Shared by standard and Jamf login.
 * Change: extracted from performLogin to avoid duplicating capture logic for Jamf flow.
 */
async function buildAuthCacheData(page: Page): Promise<AuthCacheData> {
  const cookies = await page.context().cookies();
  const authCookies = cookies.filter((c) =>
    ["did", "did_compat", "auth0", "_legacy_auth0"].some((name) =>
      c.name.includes(name)
    )
  );
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
    await page.getByRole("button", { name: "Login" }).click();
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

  const cacheData = await buildAuthCacheData(page);
  // Pin to jamf cache file even if TEST_ENV were wrong in a subprocess
  saveAuthCache(cacheData, JAMF_AUTH_ENV);
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

      // Look for common token storage keys
      const tokenData: any = {};

      keys.forEach((key) => {
        if (
          key.includes("access") ||
          key.includes("token") ||
          key.includes("auth")
        ) {
          tokenData[key] = storage.getItem(key);
        }
      });

      return tokenData;
    });

    console.log("ℹ Tokens found in localStorage:", Object.keys(tokensFromStorage));

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
    }

    // Set tokens in local storage if they exist
    const page = await context.newPage();
    await page.goto(config.baseUrl, { waitUntil: "domcontentloaded" });

    if (cache && cache.tokens && cache.tokens.access_token) {
      // @ts-ignore - window is available in page.evaluate() browser context
      await page.evaluate((tokens) => {
        if (tokens.access_token) {
          // @ts-ignore
          window.localStorage.setItem("access_token", tokens.access_token);
        }
        if (tokens.id_token) {
          // @ts-ignore
          window.localStorage.setItem("id_token", tokens.id_token);
        }
      }, cache.tokens);

      console.log("✓ Restored tokens to localStorage");
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
      if (authEnv === JAMF_AUTH_ENV) {
        await performLoginJamf(page, email, password);
      } else {
        await performLogin(page, email, password);
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
