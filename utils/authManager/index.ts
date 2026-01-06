/**
 * Authentication Manager
 * Handles login, cache restoration, and session management
 */

import { BrowserContext, Page, expect } from "@playwright/test";
import config from "../env";
import {
  saveAuthCache,
  loadAuthCache,
  isAuthCacheValid,
  clearAuthCache,
} from "./cache";
import { AuthCacheData, CookieData, TokenData } from "./types";

/**
 * Perform login and capture auth data
 * Extracts cookies and tokens from network requests/responses
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

  // Extract cookies
  const cookies = await page.context().cookies();
  const authCookies = cookies.filter((c) =>
    ["did", "did_compat", "auth0", "_legacy_auth0"].some((name) =>
      c.name.includes(name)
    )
  );

  // Extract tokens from local storage or session storage
  const tokens = await extractTokensFromStorage(page);

  const cacheData: AuthCacheData = {
    cookies: authCookies as CookieData[],
    tokens: tokens,
    timestamp: Date.now(),
  };

  // Save to cache
  saveAuthCache(cacheData);

  return cacheData;
}

/**
 * Extract JWT tokens from browser storage
 */
async function extractTokensFromStorage(page: Page): Promise<TokenData> {
  try {
    // Try to extract from localStorage
    const tokensFromStorage = await page.evaluate(() => {
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
 */
export async function restoreAuthFromCache(
  context: BrowserContext
): Promise<boolean> {
  console.log("🔄 Attempting to restore auth from cache...");

  const cache = loadAuthCache();

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
      await page.evaluate((tokens) => {
        if (tokens.access_token) {
          window.localStorage.setItem("access_token", tokens.access_token);
        }
        if (tokens.id_token) {
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
    clearAuthCache();
    return false;
  }
}

/**
 * Setup authentication for tests
 * Checks cache first, performs login if needed
 */
export async function setupAuth(
  context: BrowserContext,
  email: string,
  password: string
): Promise<void> {
  // Try to restore from cache first
  const restored = await restoreAuthFromCache(context);

  if (!restored) {
    // Cache invalid/expired, perform fresh login
    const page = await context.newPage();
    try {
      await performLogin(page, email, password);
    } finally {
      await page.close();
    }
  }
}

/**
 * Clear cached authentication
 * Useful for logout or resetting tests
 */
export async function clearAuth(): Promise<void> {
  clearAuthCache();
}

export { loadAuthCache, isAuthCacheValid, saveAuthCache };
