import { defineConfig, devices } from '@playwright/test';
import config from './utils/env';

/**
 * Config for JAMF login tests (standalone login testing)
 * This does NOT use globalSetup - each test handles its own login
 * Mirrors playwright.login.config.ts pattern for Normal instance
 */

export default defineConfig({
  testDir: './tests/login',
  testMatch: ['**/login.jamf.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Global timeout for all tests */
  timeout: 60000, // 60 seconds per test
  /* Global timeout for expect assertions */
  expect: {
    timeout: 10000, // 10 seconds for expect
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html'],
    ['allure-playwright']
  ],
  /* Shared settings - NO globalSetup, NO storageState */
  use: {
    video: "on",
    screenshot: "on",
    trace: 'on-first-retry',
    baseURL: config.baseUrl,
    // NO storageState - tests will login manually
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: `jamf-login-test`,
      use: { 
        viewport: { width: 1280, height: 720 },
        launchOptions:{
          slowMo: 50,
        },
      },
    },
  ],
});
