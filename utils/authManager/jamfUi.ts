/**
 * Shared Auth0 / Jamf ID UI helpers used by performLoginJamf and Jamf login tests.
 */

import { Page, expect, Frame } from "@playwright/test";

/**
 * Locator for Auth0 "Log in using Jamf ID" primary action.
 */
export function jamfIdSubmitLocator(root: Page | Frame) {
  return root
    .getByRole("button", { name: /Log in using Jamf ID/i })
    .or(root.getByRole("button", { name: /Jamf ID/i }))
    .or(root.locator("button._button-login-id"))
    .or(
      root.locator('button[type="submit"][name="action"][value="default"]')
    )
    .or(root.locator("button").filter({ hasText: /Jamf ID/i }));
}

/**
 * Click Jamf ID submit on main page or inside an Auth0 iframe if present.
 */
export async function clickJamfIdSubmit(
  page: Page,
  after: "email" | "password"
): Promise<void> {
  const timeout = 45_000;
  const btnMain = jamfIdSubmitLocator(page).first();

  try {
    await expect(btnMain).toBeVisible({ timeout });
    await expect(btnMain).toBeEnabled({ timeout: 20_000 });
    await btnMain.scrollIntoViewIfNeeded();
    await btnMain.click();
    console.log(`✓ Clicked Jamf ID submit (after ${after})`);
    return;
  } catch {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const btn = jamfIdSubmitLocator(frame).first();
      try {
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await expect(btn).toBeEnabled({ timeout: 15_000 });
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        console.log(
          `✓ Clicked Jamf ID submit (after ${after}, in frame ${frame.url().slice(0, 80)}…)`
        );
        return;
      } catch {
        continue;
      }
    }
    throw new Error(
      `Jamf ID submit button not found or not clickable after ${after} step`
    );
  }
}

/**
 * After IdP redirect, wait until URL is back on the Manager SPA (same origin, not hosted login).
 */
export async function waitForJamfAppAfterIdp(
  page: Page,
  baseUrl: string
): Promise<void> {
  const origin = new URL(baseUrl).origin;
  const hostedPatterns = [
    /auth0\.com/i,
    /\/authorize/i,
    /\/u\/login/i,
    /identity\.jamf\.com/i,
    /accounts\./i,
  ];

  await page.waitForURL(
    (url) => {
      const href = typeof url === "string" ? url : url.toString();
      if (!href.startsWith(origin)) return false;
      return !hostedPatterns.some((re) => re.test(href));
    },
    { timeout: 120_000 }
  );

  await page.waitForLoadState("domcontentloaded").catch(() => {});
}
