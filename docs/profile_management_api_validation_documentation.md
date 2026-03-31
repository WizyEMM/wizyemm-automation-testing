# **Profile Management — API response validation**

## **Description**

This work adds **`waitForResponse`-based checks** on **Profile Management** Playwright flows so list and mutation calls to **`/api/v1/profiles`** are validated **together with UI steps** (same pattern as create/duplicate flows elsewhere).

* Assertions use **`Promise.all([ waitForResponse(...), userAction ])`** then **`expect(response.status())`**
* **Not** a separate REST/API test layer — still **UI-driven E2E** with network validation

## **How it works**

### **When we assert on the API**

| Flow | Request | Typical status | Notes |
| ---- | ------- | -------------- | ----- |
| Navigate to list (from another route) | `GET` … `/api/v1/profiles` | `200` | Only when opening list from **outside** `/profiles` |
| Search + **Refresh** | `GET` … `/api/v1/profiles` | `200` | Refresh must refetch list |
| Filter dialog **OK** | `GET` … `/api/v1/profiles` | `200` | Table refetch after filter apply |
| **Create** profile (modal OK) | `POST`/`PUT` … `/api/v1/profiles` | `201` | Unchanged pattern |
| **Rename** (modal OK) | `PUT` / `PATCH` / `POST` … `/api/v1/profiles` | `200` or `201` | Then **Refresh** + `GET` `200` |
| **Duplicate** (modal OK) | `POST` … `/api/v1/profiles` | `201` | Unchanged pattern |
| **Delete** confirm | `DELETE` … `/api/v1/profiles` | `200`/`204` success; `4xx` if in use | UI still drives pass/fail |
| Open profile **detail** (row link) | `GET` … `/api/v1/profiles/`… | `200` | `openProfile` / `openProfileDetailsFromTable` |

### **When we do *not* block on `waitForResponse`**

* **Column sort** (`clickSortColumn`): sorting is often **client-side** — no guaranteed new **GET** per click; block was removed to avoid **timeouts**
* **Navigate to Profile Management** when URL is **already** the list (`/profiles`): re-clicking nav often **does not** refetch — helper **`isOnProfileListPage()`** skips **`waitForResponse`** and only **`waitForTable()`**

This matches Playwright guidance: only wait for responses that the action **reliably** triggers.

## **Changes made**

### **Files modified**

* `tests/profile/shared/profilemanagement.page.ts`
* `tests/profile/profile-management/profilemanagement.spec.ts`

### **Files unchanged**

* Other profile areas (policies, applications, etc.) — apply the same pattern there if you extend coverage

## **Key updates by file**

### **`tests/profile/shared/profilemanagement.page.ts`**

* **`isOnProfileListPage()`** — detects list route (`/profiles` only) vs detail URLs
* **`navigateToProfileManagement`** — list GET + assert when navigating in; **skip** wait when already on list
* **`searchProfile`** — **Refresh** paired with **GET** `200`
* **`clickSortColumn`** — click + `waitForTable` only (no list GET assert)
* **`selectFilterOptions`** — filter **OK** + **GET** `200`
* **`renameProfile`** — rename **OK** + write API assert; **Refresh** + **GET** `200`
* **`deleteProfile`** — after confirm, **DELETE** with status rules + UI outcome (`success` → `200`/`204`; **in use** → `4xx` if response captured)
* **`openProfile`** / **`openProfileDetailsFromTable`** — row link + **GET** detail `200` + URL assert

### **`tests/profile/profile-management/profilemanagement.spec.ts`**

* **Search** loop — **GET** matcher + **`expect(200)`** on refresh response
* **Verify renamed / duplicated** — use **`openProfileDetailsFromTable`** (detail GET + URL in page object)

## **Running the tests**

From repo root (same env as other E2E, e.g. `.env` with `NAMESPACE`, `REGION`, `DOMAIN`, credentials):

```bash
npx playwright test tests/profile/profile-management/profilemanagement.spec.ts --project=chromium
```

Headed (PowerShell):

```powershell
$env:HEADLESS = "false"
npx playwright test tests/profile/profile-management/profilemanagement.spec.ts --project=chromium
```

Or with **`npx cross-env`** (from project devDependency):

```bash
npx cross-env HEADLESS=false npx playwright test tests/profile/profile-management/profilemanagement.spec.ts --project=chromium
```

## **Priorities (team roadmap)**

Further API checks in the same style, in order:

1. ~~Profile Management~~ (this doc)
2. Admin accounts
3. Users (configuration / user config flows)
4. Remaining suites as agreed

## **Troubleshooting**

* **`waitForResponse` timeout** after nav to Profile Management: often **already on `/profiles`** — ensure **`isOnProfileListPage`** logic is used; do not require a new **GET** on noop nav
* **Timeout on sort**: do not add **GET** wait on column header clicks unless product **always** refetches on sort
* **Flaky GET matcher**: confirm in browser DevTools that list uses **`/api/v1/profiles`** and **GET** for your tenant; adjust predicate if the app uses a different path or GraphQL-only list (then change strategy)
