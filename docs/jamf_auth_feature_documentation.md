# Documentation Template — Jamf Authentication Support

## Feature Name

Jamf instance authentication for Playwright (`TEST_ENV=jamf`)

## Jira Issue / Ticket (optional)

[Link to Jira or issue tracker]

## Description

This feature lets the automation suite authenticate against the **Jamf staging Manager for Android** host (Auth0 + **Log in using Jamf ID** flow) while keeping **WizyEMM** authentication unchanged. When `TEST_ENV=jamf`, global setup uses a **Jamf-specific auth cache** and **Playwright storage state** file, runs **`performLoginJamf`** (email → Jamf ID button → password → Jamf ID button → dashboard), and tests load **`user-jamf.json`**. Non-Jamf envs continue to use **`performLogin`**, **`auth-cache.json`**, and **`user.json`**.

## Changes Made

### Files Modified

- `utils/authManager/cache.ts`
- `utils/authManager/index.ts`
- `utils/authManager/globalSetup.ts`
- `playwright.config.ts`
- `package.json`

### Files Added (supporting)

- `.env.jamf` (local; typically gitignored via `.env*`)

### Files Unchanged

- `utils/env.ts` — still loads `.env.${TEST_ENV}`; Jamf uses `.env.jamf` with the same `NAMESPACE` / `REGION` / `DOMAIN` pattern.

---

## File Changes

> **Exact changes only** — each block is `git diff <base-commit> -- <file>` (lines removed `-`, lines added `+`). Set `<base-commit>` to the parent of the Jamf auth commit, or use `git diff <old>..<new> -- <file>`.
### File: `utils/authManager/cache.ts`

Jamf vs default cache paths; optional `env` on save/load/clear.

```diff
diff --git a/utils/authManager/cache.ts b/utils/authManager/cache.ts
index 93339a1..1ab8135 100644
--- a/utils/authManager/cache.ts
+++ b/utils/authManager/cache.ts
@@ -8,7 +8,29 @@ import path from "path";
 import { AuthCacheData, JWTPayload } from "./types";
 
 const CACHE_DIR = path.resolve(__dirname, "../../Cookies");
-const CACHE_FILE = path.join(CACHE_DIR, "auth-cache.json");
+
+/** TEST_ENV value that routes auth to the Jamf instance flow and jamf-specific cache file */
+export const JAMF_AUTH_ENV = "jamf";
+
+/**
+ * Resolve which auth cache bucket to use. Explicit `env` wins; else TEST_ENV=jamf uses Jamf cache.
+ * Change: Jamf support — separate file so WizyEMM and Jamf sessions do not overwrite each other.
+ */
+function resolveAuthEnv(env?: string): string | undefined {
+  if (env !== undefined) return env;
+  return process.env.TEST_ENV === JAMF_AUTH_ENV ? JAMF_AUTH_ENV : undefined;
+}
+
+/**
+ * Return the filesystem path for the auth cache JSON file.
+ * Change: Jamf uses `auth-cache-jamf.json`; all other envs use `auth-cache.json`.
+ */
+export function getCacheFilePath(env?: string): string {
+  const resolved = resolveAuthEnv(env);
+  const fileName =
+    resolved === JAMF_AUTH_ENV ? "auth-cache-jamf.json" : "auth-cache.json";
+  return path.join(CACHE_DIR, fileName);
+}
 
 /**
  * Ensure cache directory exists
@@ -55,24 +77,28 @@ export function isTokenExpired(token: string): boolean {
 
 /**
  * Save authentication data to cache file
+ * Change: optional `env` selects jamf vs default cache path (via getCacheFilePath).
  */
-export function saveAuthCache(data: AuthCacheData): void {
+export function saveAuthCache(data: AuthCacheData, env?: string): void {
   ensureCacheDir();
-  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
+  const filePath = getCacheFilePath(env);
+  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
   console.log("✓ Auth cache saved successfully");
 }
 
 /**
  * Load authentication data from cache file
+ * Change: optional `env` — same resolution as saveAuthCache.
  */
-export function loadAuthCache(): AuthCacheData | null {
+export function loadAuthCache(env?: string): AuthCacheData | null {
+  const filePath = getCacheFilePath(env);
   try {
-    if (!fs.existsSync(CACHE_FILE)) {
+    if (!fs.existsSync(filePath)) {
       console.log("ℹ Auth cache file not found");
       return null;
     }
 
-    const data = fs.readFileSync(CACHE_FILE, "utf-8");
+    const data = fs.readFileSync(filePath, "utf-8");
     const cache = JSON.parse(data) as AuthCacheData;
     return cache;
   } catch (error) {
@@ -105,21 +131,16 @@ export function isAuthCacheValid(cache: AuthCacheData | null): boolean {
 
 /**
  * Clear the auth cache file
+ * Change: optional `env` clears the matching cache file only.
  */
-export function clearAuthCache(): void {
+export function clearAuthCache(env?: string): void {
+  const filePath = getCacheFilePath(env);
   try {
-    if (fs.existsSync(CACHE_FILE)) {
-      fs.unlinkSync(CACHE_FILE);
+    if (fs.existsSync(filePath)) {
+      fs.unlinkSync(filePath);
       console.log("✓ Auth cache cleared");
     }
   } catch (error) {
     console.error("Failed to clear auth cache:", error);
   }
 }
-
-/**
- * Get cache file path (useful for debugging)
- */
-export function getCacheFilePath(): string {
-  return CACHE_FILE;
-}
```


---

### File: `utils/authManager/index.ts`

`performLoginJamf`, Jamf button helpers, `buildAuthCacheData`, `authEnv` on restore/setup/clear.

```diff
diff --git a/utils/authManager/index.ts b/utils/authManager/index.ts
index 85abc51..e909c9b 100644
--- a/utils/authManager/index.ts
+++ b/utils/authManager/index.ts
@@ -3,19 +3,102 @@
  * Handles login, cache restoration, and session management
  */
 
-import { BrowserContext, Page, expect } from "@playwright/test";
+import { BrowserContext, Page, expect, Frame } from "@playwright/test";
 import config from "../env";
 import {
   saveAuthCache,
   loadAuthCache,
   isAuthCacheValid,
   clearAuthCache,
+  getCacheFilePath,
+  JAMF_AUTH_ENV,
 } from "./cache";
 import { AuthCacheData, CookieData, TokenData } from "./types";
 
+// Re-export Jamf env constant for callers that branch on auth mode
+export { JAMF_AUTH_ENV };
+
+/**
+ * Locator for Auth0 "Log in using Jamf ID" primary action. Role name can differ by locale/a11y tree;
+ * fall back to stable class from Auth0/Jamf hosted page (`_button-login-id`).
+ */
+function jamfIdSubmitLocator(root: Page | Frame) {
+  return root
+    .getByRole("button", { name: /Log in using Jamf ID/i })
+    .or(root.getByRole("button", { name: /Jamf ID/i }))
+    .or(root.locator("button._button-login-id"))
+    .or(
+      root.locator(
+        'button[type="submit"][name="action"][value="default"]'
+      )
+    )
+    .or(root.locator("button").filter({ hasText: /Jamf ID/i }));
+}
+
+/**
+ * Click Jamf ID submit on main page or inside an Auth0 iframe if present.
+ */
+async function clickJamfIdSubmit(
+  page: Page,
+  after: "email" | "password"
+): Promise<void> {
+  const timeout = 45_000;
+  const btnMain = jamfIdSubmitLocator(page).first();
+
+  try {
+    await expect(btnMain).toBeVisible({ timeout });
+    await expect(btnMain).toBeEnabled({ timeout: 20_000 });
+    await btnMain.scrollIntoViewIfNeeded();
+    await btnMain.click();
+    console.log(`✓ Clicked Jamf ID submit (after ${after})`);
+    return;
+  } catch {
+    // Auth0 sometimes renders the form inside an iframe — try non-main frames
+    for (const frame of page.frames()) {
+      if (frame === page.mainFrame()) continue;
+      const btn = jamfIdSubmitLocator(frame).first();
+      try {
+        await expect(btn).toBeVisible({ timeout: 10_000 });
+        await expect(btn).toBeEnabled({ timeout: 15_000 });
+        await btn.scrollIntoViewIfNeeded();
+        await btn.click();
+        console.log(
+          `✓ Clicked Jamf ID submit (after ${after}, in frame ${frame.url().slice(0, 80)}…)`
+        );
+        return;
+      } catch {
+        continue;
+      }
+    }
+    throw new Error(
+      `Jamf ID submit button not found or not clickable after ${after} step`
+    );
+  }
+}
+
+/**
+ * Build auth payload from the current page (cookies + storage). Shared by standard and Jamf login.
+ * Change: extracted from performLogin to avoid duplicating capture logic for Jamf flow.
+ */
+async function buildAuthCacheData(page: Page): Promise<AuthCacheData> {
+  const cookies = await page.context().cookies();
+  const authCookies = cookies.filter((c) =>
+    ["did", "did_compat", "auth0", "_legacy_auth0"].some((name) =>
+      c.name.includes(name)
+    )
+  );
+  const tokens = await extractTokensFromStorage(page);
+  return {
+    cookies: authCookies as CookieData[],
+    tokens,
+    timestamp: Date.now(),
+  };
+}
+
 /**
  * Perform login and capture auth data
  * Extracts cookies and tokens from network requests/responses
+ * Change: uses buildAuthCacheData; saveAuthCache uses TEST_ENV (or pass-through via optional env in future)
  */
 export async function performLogin(
   page: Page,
@@ -56,26 +139,66 @@ export async function performLogin(
   await page.waitForURL(/dashboard/);
   console.log("✓ Login successful - redirected to dashboard");
 
-  // Extract cookies
-  const cookies = await page.context().cookies();
-  const authCookies = cookies.filter((c) =>
-    ["did", "did_compat", "auth0", "_legacy_auth0"].some((name) =>
-      c.name.includes(name)
+  const cacheData = await buildAuthCacheData(page);
+  saveAuthCache(cacheData);
+  return cacheData;
+}
+
+/**
+ * Jamf instance login (Auth0 + Jamf ID UI).
+ * Flow differs from WizyEMM: after app "Login", only email is shown; "Log in using Jamf ID" reveals password;
+ * same button is clicked again to submit after password.
+ * Change: new entry point for TEST_ENV=jamf / Jamf staging Manager for Android.
+ */
+export async function performLoginJamf(
+  page: Page,
+  email: string,
+  password: string
+): Promise<AuthCacheData> {
+  console.log("🔐 Starting Jamf login process...");
+
+  await page.goto(config.baseUrl);
+  console.log(`✓ Navigated to ${config.baseUrl}`);
+
+  try {
+    await page.getByRole("button", { name: "Login" }).click();
+    console.log("✓ Clicked Login button");
+  } catch (error) {
+    console.log("ℹ Login button not found, continuing...");
+  }
+
+  // Wait for IdP / Auth0 shell before interacting (avoids racing the hosted login UI)
+  await page
+    .waitForURL(/auth0|account-|identifier|\/u\/login/i, { timeout: 60_000 })
+    .catch(() => {
+      console.log("ℹ IdP URL wait skipped (already on target flow)");
+    });
+  await page.waitForLoadState("domcontentloaded").catch(() => {});
+
+  // Identifier-first step: email (main page or iframe)
+  const emailInput = page
+    .locator(
+      'input[type="email"], input[name="username"], input[name="email"], #username'
     )
-  );
+    .first();
+  await emailInput.waitFor({ state: "visible", timeout: 60_000 });
+  await emailInput.fill(email);
+  console.log(`✓ Filled email: ${email}`);
 
-  // Extract tokens from local storage or session storage
-  const tokens = await extractTokensFromStorage(page);
+  await clickJamfIdSubmit(page, "email");
 
-  const cacheData: AuthCacheData = {
-    cookies: authCookies as CookieData[],
-    tokens: tokens,
-    timestamp: Date.now(),
-  };
+  await page.waitForSelector("#password", { state: "visible", timeout: 60_000 });
+  await page.fill("#password", password);
+  console.log("✓ Filled password");
 
-  // Save to cache
-  saveAuthCache(cacheData);
+  await clickJamfIdSubmit(page, "password");
 
+  await page.waitForURL(/dashboard/);
+  console.log("✓ Jamf login successful - redirected to dashboard");
+
+  const cacheData = await buildAuthCacheData(page);
+  // Pin to jamf cache file even if TEST_ENV were wrong in a subprocess
+  saveAuthCache(cacheData, JAMF_AUTH_ENV);
   return cacheData;
 }
 
@@ -128,13 +251,15 @@ async function extractTokensFromStorage(page: Page): Promise<TokenData> {
 /**
  * Restore authentication from cache
  * Injects cached cookies and tokens into browser context
+ * Change: optional authEnv loads the matching cache file (jamf vs default)
  */
 export async function restoreAuthFromCache(
-  context: BrowserContext
+  context: BrowserContext,
+  authEnv?: string
 ): Promise<boolean> {
   console.log("🔄 Attempting to restore auth from cache...");
 
-  const cache = loadAuthCache();
+  const cache = loadAuthCache(authEnv);
 
   if (!isAuthCacheValid(cache)) {
     console.log("⚠ Cache invalid or expired, fresh login required");
@@ -171,7 +296,7 @@ export async function restoreAuthFromCache(
     return true;
   } catch (error) {
     console.error("Failed to restore auth from cache:", error);
-    clearAuthCache();
+    clearAuthCache(authEnv);
     return false;
   }
 }
@@ -179,20 +304,24 @@ export async function restoreAuthFromCache(
 /**
  * Setup authentication for tests
  * Checks cache first, performs login if needed
+ * Change: authEnv === jamf runs performLoginJamf and jamf cache; otherwise existing performLogin
  */
 export async function setupAuth(
   context: BrowserContext,
   email: string,
-  password: string
+  password: string,
+  authEnv?: string
 ): Promise<void> {
-  // Try to restore from cache first
-  const restored = await restoreAuthFromCache(context);
+  const restored = await restoreAuthFromCache(context, authEnv);
 
   if (!restored) {
-    // Cache invalid/expired, perform fresh login
     const page = await context.newPage();
     try {
-      await performLogin(page, email, password);
+      if (authEnv === JAMF_AUTH_ENV) {
+        await performLoginJamf(page, email, password);
+      } else {
+        await performLogin(page, email, password);
+      }
     } finally {
       await page.close();
     }
@@ -202,9 +331,10 @@ export async function setupAuth(
 /**
  * Clear cached authentication
  * Useful for logout or resetting tests
+ * Change: optional authEnv clears the cache file for that bucket
  */
-export async function clearAuth(): Promise<void> {
-  clearAuthCache();
+export async function clearAuth(authEnv?: string): Promise<void> {
+  clearAuthCache(authEnv);
 }
 
-export { loadAuthCache, isAuthCacheValid, saveAuthCache };
+export { loadAuthCache, isAuthCacheValid, saveAuthCache, getCacheFilePath };
```


---

### File: `utils/authManager/globalSetup.ts`

Jamf branch; `user-jamf.json`; `authEnv` passed through.

```diff
diff --git a/utils/authManager/globalSetup.ts b/utils/authManager/globalSetup.ts
index 2ed1269..8a25cfb 100644
--- a/utils/authManager/globalSetup.ts
+++ b/utils/authManager/globalSetup.ts
@@ -2,15 +2,25 @@
  * Global Setup
  * Runs before all tests to handle authentication setup
  * Saves auth state to storage file for all tests to use
+ * Change: TEST_ENV=jamf uses Jamf auth + auth-cache-jamf.json + user-jamf.json storage state
  */
 
 import { chromium, FullConfig } from "@playwright/test";
 import config from "../env";
-import { setupAuth, loadAuthCache, isAuthCacheValid, restoreAuthFromCache } from "./index";
+import {
+  setupAuth,
+  loadAuthCache,
+  isAuthCacheValid,
+  restoreAuthFromCache,
+  JAMF_AUTH_ENV,
+} from "./index";
 import * as fs from "fs";
 import * as path from "path";
 
-const STORAGE_STATE_FILE = "user/.auth/user.json";
+const isJamf = process.env.TEST_ENV === JAMF_AUTH_ENV;
+const STORAGE_STATE_FILE = isJamf
+  ? "user/.auth/user-jamf.json"
+  : "user/.auth/user.json";
 
 async function globalSetup(fullConfig: FullConfig) {
   console.log("\n🔐 GLOBAL SETUP: Starting authentication...\n");
@@ -18,22 +28,24 @@ async function globalSetup(fullConfig: FullConfig) {
   const browser = await chromium.launch();
   const context = await browser.newContext();
 
+  const authEnv = isJamf ? JAMF_AUTH_ENV : undefined;
+
   try {
-    const cache = loadAuthCache();
+    const cache = loadAuthCache(authEnv);
     const isCacheValid = isAuthCacheValid(cache);
 
     if (isCacheValid) {
       console.log("✓ Using cached auth");
-      await restoreAuthFromCache(context);
+      await restoreAuthFromCache(context, authEnv);
     } else {
       console.log("↻ Performing login...");
-      await setupAuth(context, config.email, config.password);
+      await setupAuth(context, config.email, config.password, authEnv);
     }
 
     // Save Playwright storage state for test contexts to load
     const page = await context.newPage();
     await page.goto(`${config.baseUrl}/dashboard`);
-    
+
     const storageDir = path.dirname(STORAGE_STATE_FILE);
     if (!fs.existsSync(storageDir)) {
       fs.mkdirSync(storageDir, { recursive: true });
@@ -41,7 +53,7 @@ async function globalSetup(fullConfig: FullConfig) {
 
     await context.storageState({ path: STORAGE_STATE_FILE });
     await page.close();
-    
+
     console.log("✓ Auth ready\n");
   } catch (error) {
     console.error("❌ Auth failed:", error);
```


---

### File: `playwright.config.ts`

`storageStatePath`; Jamf single `chromium` project; `defaultProjects` refactor.

```diff
diff --git a/playwright.config.ts b/playwright.config.ts
index fc62c17..e104437 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -1,6 +1,43 @@
 import { defineConfig, devices } from '@playwright/test';
 import config from './utils/env';
 
+const isJamfEnv = process.env.TEST_ENV === 'jamf';
+
+const storageStatePath = isJamfEnv
+  ? 'user/.auth/user-jamf.json'
+  : 'user/.auth/user.json';
+
+const chromeUse = {
+  ...devices['Desktop Chrome'],
+  viewport: { width: 1280, height: 720 },
+  launchOptions: { slowMo: 50 },
+};
+
+/**
+ * Default config lists 4 projects — every test runs 4× (Chrome ×2 + Firefox + WebKit).
+ * For Jamf we only enable Chromium: one run per test + faster auth smoke. Use WizyEMM envs for full matrix.
+ * Change: Jamf — avoid accidental 4× project fan-out on `npx playwright test`.
+ */
+const defaultProjects = [
+  {
+    name: `tests-${config.namespace}-${config.region || 'no region'}-${config.domain}`,
+    use: {
+      viewport: { width: 1280, height: 720 },
+      launchOptions: { slowMo: 50 },
+    },
+  },
+  { name: 'chromium', use: chromeUse },
+  {
+    name: 'firefox',
+    use: {
+      ...devices['Desktop Firefox'],
+      viewport: { width: 1280, height: 720 },
+      launchOptions: { slowMo: 50 },
+    },
+  },
+  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
+];
+
 /**
  * Read environment variables from file.
  * https://github.com/motdotla/dotenv
@@ -41,68 +78,15 @@ export default defineConfig({
     screenshot: "on",
     trace: 'on-first-retry',
     baseURL: config.baseUrl,
-    storageState: 'user/.auth/user.json', // Load auth state from global setup
+    // Change: match globalSetup — jamf uses user-jamf.json so envs do not clobber each other
+    storageState: storageStatePath,
     //headless: process.env.HEADLESS !== "false",
     /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
   },
 
-  /* Configure projects for major browsers */
-  projects: [
-    {
-      name: `tests-${config.namespace}-${config.region || 'no region'}-${config.domain}`,
-      use: { 
-        viewport: { width: 1280, height: 720 }, 
-        launchOptions:{
-          slowMo:50,
-        },
-      },
-    },
-    {
-      name: 'chromium',
-      use: { ...devices['Desktop Chrome'],
-        viewport: { width: 1280, height: 720 }, 
-        launchOptions:{
-          slowMo:50,
-        },
-      },
-    },
-
-    {
-      name: 'firefox',
-      use: { ...devices['Desktop Firefox'],
-        viewport: { width: 1280, height: 720 }, 
-        launchOptions:{
-          slowMo:50,
-        }, 
-        
-      },
-    },
-
-    {
-      name: 'webkit',
-      use: { ...devices['Desktop Safari'] },
-    },
-
-    /* Test against mobile viewports. */
-    // {
-    //   name: 'Mobile Chrome',
-    //   use: { ...devices['Pixel 5'] },
-    // },
-    // {
-    //   name: 'Mobile Safari',
-    //   use: { ...devices['iPhone 12'] },
-    // },
-
-    /* Test against branded browsers. */
-    // {
-    //   name: 'Microsoft Edge',
-    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
-    // },
-    // {
-    //   name: 'Google Chrome',
-    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
-    // },
-  ],
+  projects: isJamfEnv
+    ? [{ name: 'chromium', use: chromeUse }]
+    : defaultProjects,
 
   /* Run your local dev server before starting the tests */
   // webServer: {
```


---

### File: `package.json`

`test:jamf` script.

```diff
diff --git a/package.json b/package.json
index cd233f6..f4c03f4 100644
--- a/package.json
+++ b/package.json
@@ -8,6 +8,7 @@
     "test:staging": "cross-env TEST_ENV=staging HEADLESS=false npx playwright test --project=chromium",
     "test:prod": "cross-env TEST_ENV=production HEADLESS=false npx playwright test --project=chromium",
     "test:dev": "cross-env TEST_ENV=development HEADLESS=false npx playwright test --project=chromium",
+    "test:jamf": "cross-env TEST_ENV=jamf HEADLESS=false npx playwright test --project=chromium",
     "allure:history": "node scripts/prepare-allure-history.js",
     "allure:report": "npm run allure:history && allure generate --clean && allure open"
   },
```


---

## Environment Variables Required

| Variable | Required when | Description |
|----------|----------------|-------------|
| **`TEST_ENV`** | Jamf runs | Set to **`jamf`** so `.env.jamf` is loaded and Jamf auth/storage paths are used. |
| **`NAMESPACE`** | Always (via `.env.jamf`) | Jamf host subdomain (e.g. `qa-test-001`). |
| **`REGION`** | Always | e.g. `stage`. |
| **`DOMAIN`** | Always | e.g. `manager-for-android.jamflabs.com`. |
| **`EMAIL`** | Always | Jamf / Auth0 login email. |
| **`PASSWORD`** | Always | Jamf / Auth0 password. |

**Optional (unchanged; used if present):**

- **`AUTH0_CLIENT_ID`**
- **`AUTH0_AUDIENCE`**

**Local setup:**

- Create **`.env.jamf`** at repo root. Example shape:

```env
NAMESPACE=qa-test-001
REGION=stage
DOMAIN=manager-for-android.jamflabs.com
EMAIL=<your_email>
PASSWORD=<your_password>
```

**Run example:**

```bash
npx cross-env TEST_ENV=jamf npx playwright test
# or
npm run test:jamf
```

---

## Artifacts Created at Runtime

| Path | When |
|------|------|
| `Cookies/auth-cache-jamf.json` | After successful Jamf login or cache save for Jamf |
| `user/.auth/user-jamf.json` | After global setup for `TEST_ENV=jamf` |

WizyEMM continues using **`Cookies/auth-cache.json`** and **`user/.auth/user.json`**.
