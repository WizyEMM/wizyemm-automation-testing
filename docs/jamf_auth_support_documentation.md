# **Jamf Authentication Support**

## **Description**

This feature adds support for logging into the **Jamf staging Manager for Android** environment in our Playwright tests.

When `TEST_ENV=jamf`, the test suite switches to a Jamf-specific login flow (Auth0 + **"Log in using Jamf ID"**) without affecting the existing **WizyEMM** authentication setup.

* Jamf runs use their **own login flow, cache, and storage state**
* Non-Jamf environments continue working exactly as before

## **How It Works**

When running with `TEST_ENV=jamf`:

* A **Jamf-specific auth cache** is used  
  `Cookies/auth-cache-jamf.json`
* A **separate Playwright storage state** is generated  
  `user/.auth/user-jamf.json`
* The login flow uses a new function: `performLoginJamf`, which:

  1. Enters email
  2. Clicks **"Log in using Jamf ID"**
  3. Enters password
  4. Clicks the Jamf ID button again
  5. Waits for the dashboard
* Tests automatically load the Jamf session from `user-jamf.json`

For all other environments:

* The existing flow (`performLogin`) is used
* Cache and storage remain unchanged (`auth-cache.json`, `user.json`)

## **Changes Made**

### **Files Modified**

* `utils/authManager/cache.ts`
* `utils/authManager/index.ts`
* `utils/authManager/globalSetup.ts`
* `playwright.config.ts`
* `package.json`

### **Files Added**

* `.env.jamf`

### **Unchanged**

* `utils/env.ts`  
  Still loads environment configs using `.env.${TEST_ENV}`  
  Jamf simply uses `.env.jamf` with the same structure.

## **Key Updates by File**

### **`utils/authManager/cache.ts`**

Introduced environment-based caching so Jamf doesn't overwrite existing sessions.

**What changed:**

* Added `JAMF_AUTH_ENV = "jamf"`
* Added `resolveAuthEnv()` to determine which environment is active
* Created `getCacheFilePath()` to dynamically choose the correct cache file
* Updated:
  * `saveAuthCache`
  * `loadAuthCache`
  * `clearAuthCache`  
    → all now accept an optional `env` parameter

### **`utils/authManager/index.ts`**

**What changed:**

* Added helpers for Jamf login:
  * `jamfIdSubmitLocator`
  * `clickJamfIdSubmit`
* Extracted `buildAuthCacheData(page)` to reuse cache creation logic
* Added a new login flow:
  * `performLoginJamf` (Jamf-specific Auth0 flow)
* Updated existing functions to support environments:
  * `restoreAuthFromCache(context, authEnv?)`
  * `setupAuth(..., authEnv?)`
  * `clearAuth(authEnv?)`
* `setupAuth` now decides:
  * Jamf → `performLoginJamf`
  * Others → `performLogin`

### **`globalSetup.ts`**

This ensures the correct setup runs before tests.

**What changed:**

Detects Jamf using:

```ts
const isJamf = process.env.TEST_ENV === JAMF_AUTH_ENV;
```

* Uses environment-specific storage:
  * Jamf → `user/.auth/user-jamf.json`
  * Default → `user/.auth/user.json`
* Passes `authEnv` to:
  * `loadAuthCache`
  * `restoreAuthFromCache`
  * `setupAuth`

**Result:**

* Jamf runs are fully isolated from other environments

### **`playwright.config.ts`**

Controls how Playwright runs tests.

**What changed:**

* Dynamically sets `storageState`:
  * Jamf → `user-jamf.json`
  * Default → `user.json`
* Limits projects when running Jamf:
  * Jamf → Chromium only
  * Default → full browser matrix

### **`package.json`**

Added a shortcut script:

```json
"test:jamf": "cross-env TEST_ENV=jamf HEADLESS=false npx playwright test --project=chromium"
```

## **Environment Variables**

### **Required for Jamf**

| Variable | Description |
| -------- | ----------- |
| `TEST_ENV` | Must be set to `jamf` |
| `NAMESPACE` | Jamf subdomain (e.g. `qa-test-001`) |
| `REGION` | e.g. `stage` |
| `DOMAIN` | e.g. `manager-for-android.jamflabs.com` |
| `EMAIL` | Login email |
| `PASSWORD` | Login password |

### **Optional**

* `AUTH0_CLIENT_ID`
* `AUTH0_AUDIENCE`

## **Local Setup**

Create a `.env.jamf` file in the root:

```text
NAMESPACE=qa-test-001
REGION=stage
DOMAIN=manager-for-android.jamflabs.com
EMAIL=your_email
PASSWORD=your_password
```

## **Running Tests**

```bash
npm run test:jamf
```

or

```bash
npx cross-env TEST_ENV=jamf npx playwright test
```

## **Runtime Artifacts**

These files are generated after login:

| File | Purpose |
| ---- | ------- |
| `Cookies/auth-cache-jamf.json` | Stores Jamf session cache |
| `user/.auth/user-jamf.json` | Playwright storage state |

Existing environments still use:

* `auth-cache.json`
* `user.json`
