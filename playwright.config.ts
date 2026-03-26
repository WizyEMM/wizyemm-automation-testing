import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import config from './utils/env';

const isJamfEnv = process.env.TEST_ENV === 'jamf';

/** Match globalSetup: Jamf uses user-jamf.json so local runs do not clobber default storage. */
const storageStatePath = path.resolve(
  __dirname,
  isJamfEnv ? 'user/.auth/user-jamf.json' : 'user/.auth/user.json'
);

const chromeUse = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 100 },
};

const defaultProjects = [
  {
    name: `tests-${config.namespace}-${config.region || 'no region'}-${config.domain}`,
    use: {
      viewport: { width: 1280, height: 720 },
      launchOptions: { slowMo: 100 },
    },
  },
  { name: 'chromium', use: chromeUse },
  {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      viewport: { width: 1280, height: 720 },
      launchOptions: { slowMo: 50 },
    },
  },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: './utils/authManager/globalSetup.ts',
  testDir: './tests',
  // Explicitly set output directories to prevent generating outside project
  outputDir: './test-results',
  snapshotDir: './snapshots',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined, // allow full parallelism locally
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
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    video: 'on',
    screenshot: 'on',
    trace: 'on-first-retry',
    baseURL: config.baseUrl,
    storageState: storageStatePath,
    //headless: process.env.HEADLESS !== "false",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
  },

  projects: isJamfEnv
    ? [{ name: 'chromium', use: chromeUse }]
    : defaultProjects,

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
