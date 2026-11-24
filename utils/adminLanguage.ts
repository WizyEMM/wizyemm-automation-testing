import type { Page, Request } from "@playwright/test";

/**
 * The console language is saved on the admin account (PATCH /api/v1/administrators/me),
 * not just in the browser. If a test leaves it on e.g. "de", every later test that
 * finds elements by English text fails. This helper resets it through the API, so the
 * reset works even when the UI is broken.
 *
 * The API host, bearer token and namespace header are taken from the app's own
 * /administrators/me request, so no per-instance config is needed.
 */

const ADMIN_ME_PATH = "/api/v1/administrators/me";

export interface AdminApiSession {
  url: string;
  headers: Record<string, string>;
}

/**
 * Start listening BEFORE navigating: resolves with the API session from the first
 * /administrators/me request the app makes on load.
 */
export function captureAdminApiSession(page: Page, timeout = 30_000): Promise<AdminApiSession> {
  return page
    .waitForRequest(
      (req: Request) => req.url().includes(ADMIN_ME_PATH) && !!req.headers()["authorization"],
      { timeout }
    )
    .then((req) => {
      const h = req.headers();
      const headers: Record<string, string> = { authorization: h["authorization"] };
      if (h["wizyemm-namespace"]) headers["wizyemm-namespace"] = h["wizyemm-namespace"];
      return { url: req.url().split("?")[0], headers };
    });
}

/** Sets the admin account language via the API (e.g. "en", "fr"). Throws if the API rejects it. */
export async function setAdminLanguage(
  page: Page,
  session: AdminApiSession,
  language = "en"
): Promise<void> {
  const response = await page.request.patch(session.url, {
    headers: { ...session.headers, "content-type": "application/vnd.api+json" },
    data: { data: { attributes: { language }, type: "administrators", id: "me" } },
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to set admin language to "${language}": ${response.status()} ${await response.text()}`
    );
  }
}

/** Reads the admin account language from the API (e.g. "en"). */
export async function getAdminLanguage(page: Page, session: AdminApiSession): Promise<string | undefined> {
  const response = await page.request.get(session.url, { headers: session.headers });
  if (!response.ok()) return undefined;
  return (await response.json())?.data?.attributes?.language;
}
