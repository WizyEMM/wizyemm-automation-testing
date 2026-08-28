# WizyEMM Automation Testing

End-to-end UI automation for the WizyEMM console, built with [Playwright](https://playwright.dev/) and TypeScript. It runs real browser tests against live environments to catch regressions before customers do.

**Stack:** Playwright (`@playwright/test`) · TypeScript · Node.js 18 · Allure reporting · GitHub Actions CI/CD

---

## Prerequisites

Before you start, make sure you have:

| Tool | Version | Verify |
|---|---|---|
| Node.js (LTS) | 18 or higher | `node -v` |
| npm | 9 or higher | `npm -v` |
| Git | any recent | `git --version` |
| VS Code (recommended) | latest | — |

You also need an **admin account** whose email has access to the namespace you intend to test. Reach out to the repo owner / QA lead if you don't have one.

---

## Setup — Step by Step

### 1. Clone the repository

```bash
git clone https://github.com/WizyEMM/wizyemm-automation-testing.git
cd wizyemm-automation-testing
```

### 2. Install dependencies

```bash
npm install
```

(Use `npm ci` instead if you want a clean, lockfile-exact install.)

### 3. Install the Playwright browsers

Downloads the browser binaries Playwright drives. Run once per machine.

```bash
npx playwright install
```

### 4. Create your environment (`.env`) files

**This is the part people miss.** The framework does **not** read a single `.env`. `utils/env.ts` loads a **different file per environment**, chosen by the `TEST_ENV` variable that each npm script sets for you:

```ts
// utils/env.ts
const envFileName = process.env.TEST_ENV ? `.env.${process.env.TEST_ENV}` : ".env";
```

So the npm script you run decides which file is loaded:

| Command | Sets `TEST_ENV` | Loads file |
|---|---|---|
| `npm run test:staging` | `staging` | `.env.staging` |
| `npm run test:prod` | `production` | `.env.production` |
| `npm run test:dev` | `development` | `.env.development` |
| `npm run test:jamf` | `jamf` | `.env.jamf` |
| `npm test` | *(unset)* | `.env` (fallback) |

Create the file(s) for the environment(s) you actually test against, in the **project root**. Each file has exactly these five keys:

```dotenv
NAMESPACE=<namespace of the instance>
REGION=<region of the instance>
DOMAIN=<domain of the instance>
EMAIL=<admin email used as credentials>
PASSWORD=<password for that email>
```

`env.ts` composes the base URL the tests hit as:

```
https://{NAMESPACE}.{REGION}.{DOMAIN}
```

**Example — `.env.staging`:**

```dotenv
NAMESPACE=teama-automation
REGION=staging-us
DOMAIN=wizyemm.app
EMAIL=automation@example.com
PASSWORD=your-password
```

...produces `https://teama-automation.staging-us.wizyemm.app`.

**Example — `.env.jamf`** (note the JAMF domain differs):

```dotenv
NAMESPACE=qa-test-jamf-automation
REGION=stage
DOMAIN=manager-for-android.jamflabs.com
EMAIL=<jamf admin email>
PASSWORD=<jamf admin password>
```

> ⚠️ **Never commit `.env` files.** They hold real credentials and are already excluded via `.gitignore` (`.env*`). If you accidentally stage one, unstage it before committing. The admin account must have access to the target namespace or the tests will fail at login.

---

## Running Tests

Tests run **headed** (browser visible) by default via the npm scripts, on **Chromium** locally.

```bash
npm run test:staging      # run the full suite against staging
npm run test:prod         # against production
npm run test:dev          # against development
npm run test:jamf         # against the JAMF instance
```

### Run a specific file or folder

Append `--` then the path (the `--` passes the argument through to Playwright):

```bash
npm run test:staging -- tests/login/login.spec.ts
npm run test:staging -- tests/fleet
```

### Login & language tests (standalone config)

Login and language tests use their own config that does **not** use the cached auth session — each test logs in fresh:

```bash
# Normal instance
npx playwright test --config=playwright.login.config.ts

# JAMF instance
npx cross-env TEST_ENV=jamf npx playwright test --config=playwright.login.jamf.config.ts
```

### Headless mode

The npm scripts set `HEADLESS=false`. To run without a visible browser (e.g. faster, or CI-like):

```bash
npx playwright test --project=chromium
```

---

## Authentication (how login is handled)

You do **not** log in manually in feature tests. A global setup (`utils/authManager/globalSetup.ts`) runs before the suite:

1. Checks `Cookies/` for a valid cached session.
2. If valid → restores it (no browser login).
3. If missing/expired → performs a real browser login using your `.env` credentials and caches it.
4. Saves the browser storage state to `user/.auth/` so every test starts already authenticated.

The cache and storage-state files (`Cookies/auth-cache*.json`, `user/.auth/user*.json`) are **gitignored** and managed automatically — don't edit them by hand. Delete them if you need to force a fresh login.

---

## Reports

### Playwright HTML report

```bash
npx playwright show-report
```

### Allure report (richer, with history/trends)

```bash
npm run allure:report     # builds history + generates + opens the report
npm run clean:allure      # clears allure-results before a fresh run (Windows)
```

Generated report folders (`allure-results/`, `allure-report/`, `playwright-report/`, `test-results/`) are gitignored — never commit them.

---

## Cloud Reports (Google Cloud Storage)

CI uploads every Allure report to GCS so results outlive the GitHub Actions artifact window and can be linked from Slack. Authentication uses a GCP service account stored in GitHub Secrets — nothing to configure locally.

Reports land in the `emm-test-artifacts` bucket, namespaced by instance so parallel matrix runs never overwrite each other:

```
gs://emm-test-artifacts/allure-reports/<instance>/v<VERSION>-Tr.<N>/
```

- `<instance>` is omitted for legacy V2 runs, which keep the original flat path.
- `<VERSION>` is detected automatically from the API response (falling back to a timestamp).
- `Tr.<N>` auto-increments per version, so each version keeps its full run history and trend.
- Raw `allure-results` attachments are uploaded alongside the report so WizyReport artifact URLs resolve.

Access is via **signed URLs valid for 7 days**, generated by `scripts/generate-signed-url.js` and posted to Slack.

---

## Slack Integration

Results are posted to Slack automatically after each CI run by `scripts/slack-reporter.js`, configured in `config/slack-report-config.json` (channel `#test-reports`, `Asia/Manila` timezone).

Each message includes:

- Overall status — All Passed, Failed, or Flaky
- Execution time and run metadata
- Failed test details, up to 10 tests
- A direct link to the full Allure report via its signed URL

---

## Project Structure

```
tests/                 End-to-end specs, organized by feature
  _base/               Shared test fixture (JAMF session handling)
  login/               Login + language tests (standalone configs)
  dashboard/ fleet/ enrollment/ application/ configuration/
  profile/ settings/ notifications/ adminaccounts/
utils/
  env.ts               Loads the right .env and composes baseURL
  helpers.ts           Shared action helpers (clicks, waits, search, etc.)
  authManager/         Login, session caching, JAMF auth flow, globalSetup
scripts/               Allure history, signed URLs, Slack + WizyReport reporting
.github/               CI/CD workflows and composite actions
playwright.config.ts             Main config (feature tests, globalSetup auth)
playwright.login.config.ts       Standalone login/language tests
playwright.login.jamf.config.ts  JAMF login tests
```

---

## Contribution Guidelines

- **Writing tests:** follow the Page Object Model 3-file pattern (`*.page.ts`, `*.ts`, `*.spec.ts`) and the existing `tests/` structure.
- **Branches:** branch off `development`, name them `<type>/<short-description>` (see the Branch Naming Guide).
- **Commits:** use Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:` …) — see the Commit Message Guide.
- **Pull requests:** fill out the PR template completely and link the related ticket. At least one core-team approval is required; no direct pushes to `main` or `development`.
- See the team's **Do's and Don'ts** and **Automation Pipeline** docs for full detail.

---

## Who Do I Talk To?

- Repo owner / admins for access and reviews.
- QA team on Slack (**#wizyemm-qa**) for general questions.
