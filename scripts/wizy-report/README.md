# WizyReport — Test Result Ingestion

This module sends Playwright/Allure test results from GitHub Actions to the WizyReport API after every test run.

---

## How It Works

```
GitHub Actions CI
│
├── Runs Playwright tests  →  generates allure-results/
├── Uploads allure-results as artifact
│
└── ingest-to-wizy-report job
    ├── Downloads allure-results artifact
    ├── Parses result JSON files  (allure-parser.js)
    ├── Builds & validates payload  (payload-builder.js)
    └── POST /api/v1/test-ingestion  →  WizyReport Backend
```

---

## For Backend — API Contract

### Endpoint

```
POST /api/v1/test-ingestion
```

### Authentication

```
Authorization: Bearer <WIZY_REPORT_API_KEY>
```

The API key comes from the `WIZY_REPORT_API_KEY` GitHub secret. If the key is absent (local/dev), the request is sent without an `Authorization` header.

---

### Request Payload

`Content-Type: application/json`

```jsonc
{
  "runMetadata": {
    "runId": "12345678901",                    // string, REQUIRED — GitHub Actions run ID (unique per workflow run)
    "repositoryName": "wizyemm-automation-testing", // string, REQUIRED
    "branch": "main",                          // string, REQUIRED — git branch name
    "environment": "staging",                  // string, REQUIRED — enum: "staging" | "production"
    "instanceType": "Normal Instance",         // string, optional — enum: "Normal Instance" | "JAMF Instance"
    "executionStartTime": "2026-05-04T08:00:00Z", // string, REQUIRED — ISO 8601, actual workflow start time
    "executionEndTime": "2026-05-04T08:45:00Z",   // string, REQUIRED — ISO 8601, approx. test completion time
    "appVersion": "1.2.3",                     // string | null, optional — app version under test
    "workflowName": "Playwright Tests V2",     // string | null, optional — GitHub Actions workflow name
    "triggeredBy": "john.doe"                  // string, optional — GitHub username who triggered the run
  },
  "testResults": [
    {
      "suiteName": "profile",                                     // string, REQUIRED — test suite/folder name
      "testName": "profile › should display user profile",        // string, REQUIRED — full test name from Allure
      "status": "Passed",                                         // string, REQUIRED — see Status Values below
      "duration": 4823,                                           // number, REQUIRED — milliseconds, >= 0
      "errorMessage": null,                                       // string | null — only populated for Failed tests
      "artifacts": null                                           // object | null — only populated for Failed tests
    },
    {
      "suiteName": "application",
      "testName": "application › should install app successfully",
      "status": "Failed",
      "duration": 12450,
      "errorMessage": "Timeout waiting for element .install-btn after 10000ms",
      "artifacts": {
        "screenshot": "abc123-attachment.png",  // filename from allure-results (not a full URL)
        "video": "def456-attachment.webm"       // filename from allure-results (not a full URL)
      }
    }
  ],
  "summary": {
    "total": 150,   // integer, REQUIRED
    "passed": 145,  // integer, REQUIRED
    "failed": 3,    // integer, REQUIRED
    "skipped": 2,   // integer, REQUIRED
    "flaky": 0      // integer, optional — defaults to 0
  }
}
```

---

### Field Reference

#### `runMetadata`

| Field | Type | Required | Description |
|---|---|---|---|
| `runId` | string | Yes | GitHub Actions run ID — unique per workflow run, use this as the deduplication key |
| `repositoryName` | string | Yes | Repository name |
| `branch` | string | Yes | Git branch where tests ran |
| `environment` | string | Yes | `"staging"` or `"production"` |
| `instanceType` | string | No | `"Normal Instance"` or `"JAMF Instance"` |
| `executionStartTime` | string | Yes | ISO 8601 — workflow start time (`github.run_started_at`) |
| `executionEndTime` | string | Yes | ISO 8601 — captured when ingest job begins (closest to test completion) |
| `appVersion` | string \| null | No | Version of the app under test (fetched from API during test run) |
| `workflowName` | string \| null | No | GitHub Actions workflow name |
| `triggeredBy` | string | No | GitHub username of whoever triggered the dispatch |

#### `testResults[n]`

| Field | Type | Required | Description |
|---|---|---|---|
| `suiteName` | string | Yes | Suite name parsed from Allure labels or test name prefix |
| `testName` | string | Yes | Full test name as recorded in Allure |
| `status` | string | Yes | See Status Values below |
| `duration` | number | Yes | Test duration in milliseconds |
| `errorMessage` | string \| null | No | Error/failure message — only set when `status === "Failed"`, otherwise `null` |
| `artifacts` | object \| null | No | Screenshot/video refs — only set when `status === "Failed"`, otherwise `null` |
| `artifacts.screenshot` | string | No | Allure attachment filename (e.g. `abc123-attachment.png`) |
| `artifacts.video` | string | No | Allure attachment filename (e.g. `def456-attachment.webm`) |

#### Status Values

| Value | When Used |
|---|---|
| `Passed` | Test completed successfully |
| `Failed` | Test failed or errored (Allure `failed` and `broken` both map here) |
| `Skipped` | Test was skipped |
| `Flaky` | Test has a `flaky: true` label in Allure |
| `Unknown` | Status could not be determined from Allure output |

#### `summary`

| Field | Type | Required |
|---|---|---|
| `total` | integer | Yes |
| `passed` | integer | Yes |
| `failed` | integer | Yes |
| `skipped` | integer | Yes |
| `flaky` | integer | No |

> **Note on artifacts**: Values are **filenames** from the `allure-results/` directory, not full URLs. Your API decides how to store or serve them.

---

### Required Responses

#### `200` or `201` — Success

```json
{
  "success": true,
  "message": "Test results ingested successfully",
  "data": {
    "runId": "12345678901",
    "reference": "wizy-run-abc123"
  }
}
```

`data.runId` and `data.reference` are logged by the ingestor. `reference` is your internal tracking ID for this run.

#### `409` — Duplicate Run

Return this when the same `runId` has already been ingested. The ingestor treats `409` as **success** — it logs a warning and exits cleanly without retrying. This protects against double ingestion from re-runs.

```json
{
  "success": false,
  "message": "Run ID already exists",
  "data": {
    "runId": "12345678901",
    "existingReference": "wizy-run-abc123"
  }
}
```

#### `400` — Validation Error

Return this when the payload is malformed or missing required fields. The ingestor will **not** retry on 400 — it will fail the step immediately.

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "runMetadata.environment must be 'staging' or 'production'",
    "testResults[2].status is invalid"
  ]
}
```

#### `5xx` — Server Error

The ingestor **retries automatically** on any 5xx — up to 3 attempts with increasing delay (2s, 4s). Your endpoint should be safe to receive the same `runId` multiple times and use the `409` path for duplicates.

---

### Retry Behavior Summary

| Scenario | Ingestor Behavior |
|---|---|
| Network error | Retry up to 3 times |
| Request timeout (10s) | Retry up to 3 times |
| `5xx` server error | Retry up to 3 times |
| `409` duplicate | Treated as success, exit 0 |
| `4xx` client error | Fail immediately, no retry |

---

## Backend Implementation Checklist

- [ ] `POST /api/v1/test-ingestion` endpoint created
- [ ] Bearer token authentication implemented
- [ ] Payload validated — required fields and enum values checked
- [ ] Duplicate `runId` check — return `409` if already exists
- [ ] `runMetadata` persisted
- [ ] `testResults` persisted and linked to the run
- [ ] `summary` statistics persisted
- [ ] `artifacts: null` handled gracefully (most tests won't have artifacts)
- [ ] Success response returns `{ success, message, data: { runId, reference } }`
- [ ] Error response returns `{ success, message, errors[] }` on `400`
- [ ] Endpoint is safe for duplicate `runId` (idempotent or 409)

---

## Folder Structure

```
scripts/wizy-report/
├── ingestor.js           — orchestrates parse → build → validate → send
├── payload-schema.json   — JSON Schema v7 for payload structure reference
├── README.md             — this file
└── utils/
    ├── allure-parser.js  — reads allure-results/, extracts test data
    └── payload-builder.js — assembles and validates the payload object
```

---

## Environment Variables Reference

| Variable | Required | Source | Description |
|---|---|---|---|
| `GITHUB_RUN_ID` | Yes | GitHub built-in | Unique run identifier — used as `runId` |
| `GITHUB_REF_NAME` | Yes | GitHub built-in | Branch name |
| `WIZY_REPORT_ENDPOINT` | Yes | GitHub secret | Full URL to `POST /api/v1/test-ingestion` |
| `WIZY_REPORT_API_KEY` | No | GitHub secret | Bearer token for authentication |
| `ENVIRONMENT` | No | Workflow dispatch input | `staging` or `production` |
| `INSTANCE_TYPE` | No | Workflow dispatch input | `Normal Instance` or `JAMF Instance` |
| `EXECUTION_START_TIME` | No | `github.run_started_at` | Actual workflow start time (ISO 8601) |
| `EXECUTION_END_TIME` | No | `$(date -u ...)` at ingest step | Approx. test completion time (ISO 8601) |
| `APP_VERSION` | No | Version API call during test job | Version string of the app under test |
| `DEBUG` | No | Manual | Enables verbose stack trace logging |

---

## Running the Ingestor Locally

```bash
# From wizyemm-automation-testing/
GITHUB_RUN_ID=test-local-001 \
GITHUB_REF_NAME=main \
WIZY_REPORT_ENDPOINT=http://localhost:3000/api/v1/test-ingestion \
WIZY_REPORT_API_KEY=your-key \
ENVIRONMENT=staging \
INSTANCE_TYPE="Normal Instance" \
DEBUG=true \
node scripts/wizy-report/ingestor.js
```

## Testing the Endpoint with curl

```bash
curl -X POST http://localhost:3000/api/v1/test-ingestion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "runMetadata": {
      "runId": "test-001",
      "repositoryName": "wizyemm-automation-testing",
      "branch": "main",
      "environment": "staging",
      "instanceType": "Normal Instance",
      "executionStartTime": "2026-05-04T08:00:00Z",
      "executionEndTime": "2026-05-04T08:45:00Z",
      "appVersion": null,
      "workflowName": "Playwright Tests V2",
      "triggeredBy": "test-user"
    },
    "testResults": [
      {
        "suiteName": "profile",
        "testName": "profile › should display user profile",
        "status": "Passed",
        "duration": 3200,
        "errorMessage": null,
        "artifacts": null
      },
      {
        "suiteName": "application",
        "testName": "application › should install app",
        "status": "Failed",
        "duration": 12000,
        "errorMessage": "Element not found: .install-btn",
        "artifacts": {
          "screenshot": "abc123-attachment.png",
          "video": "def456-attachment.webm"
        }
      }
    ],
    "summary": {
      "total": 2,
      "passed": 1,
      "failed": 1,
      "skipped": 0,
      "flaky": 0
    }
  }'
```

---
