import { expect, Page, Frame } from "@playwright/test";
import config from "../../utils/env";
import { performLoginJamf } from "../../utils/authManager/index";
import { clickJamfIdSubmit } from "../../utils/authManager/jamfUi";

function jamfHostedRoots(page: Page): (Page | Frame)[] {
  return [page, ...page.frames().filter((f) => f !== page.mainFrame())];
}

export const loginJamf = async ({ page }: { page: Page }) => {
  await performLoginJamf(page, config.email, config.password);
};

/**
 * Completes identifier-first Jamf ID flow with a deliberately wrong password.
 * Asserts an Auth0-style error is shown (copy of coverage in login.ts for local invalid creds).
 */
export const loginJamfWithInvalidCredentials = async ({
  page,
}: {
  page: Page;
}) => {
  await page.goto(config.baseUrl);
  try {
    await page.getByRole("button", { name: "Log in" }).click();
  } catch {
    // landing may already be on IdP
  }

  await page
    .waitForURL(/auth0|account-|identifier|\/u\/login/i, { timeout: 60_000 })
    .catch(() => {});

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const emailInput = page
    .locator(
      'input[type="email"], input[name="username"], input[name="email"], #username'
    )
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 60_000 });
  await emailInput.fill(config.email);

  await clickJamfIdSubmit(page, "email");

  await page.waitForSelector("#password", { state: "visible", timeout: 60_000 });
  await page.fill("#password", `invalid-${Date.now()}`);

  await clickJamfIdSubmit(page, "password");

  await expect(
    page.getByText(/wrong|incorrect|invalid|not match|try again/i).first()
  ).toBeVisible({ timeout: 30_000 });
};

/**
 * Jamf hosted login: "Can't log in to your account?" → "Forgot Your Password?" → email + Continue.
 * Does not complete email link / new password (same scope as login.ts forgotPassword).
 */
export const forgotPasswordJamf = async ({ page }: { page: Page }) => {
  await page.goto(config.baseUrl);
  try {
    await page.getByRole("button", { name: "Log in" }).click();
  } catch {
    /* already on login */
  }

  await page
    .waitForURL(/auth0|account-|identifier|\/u\/login|jamf/i, { timeout: 60_000 })
    .catch(() => {});

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const cantLogInLink = (root: Page | Frame) =>
    root.getByRole("link", {
      name: /can[\u2019']t log in to your account/i,
    });

  await expect
    .poll(
      async () => {
        for (const root of jamfHostedRoots(page)) {
          if (await cantLogInLink(root).isVisible().catch(() => false)) {
            return true;
          }
        }
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  let openedForgot = false;
  for (const root of jamfHostedRoots(page)) {
    const link = cantLogInLink(root);
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      openedForgot = true;
      break;
    }
  }
  if (!openedForgot) {
    throw new Error(
      'Jamf forgot password: could not click "Can\'t log in to your account?"'
    );
  }

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const forgotHeading = (root: Page | Frame) =>
    root.getByRole("heading", { name: /forgot your password/i });

  const emailInput = (root: Page | Frame) =>
    root
      .getByPlaceholder(/email address/i)
      .or(root.getByRole("textbox", { name: /email address/i }));

  const continueButton = (root: Page | Frame) =>
    root.getByRole("button", { name: /^continue$/i });

  let submitted = false;
  for (const root of jamfHostedRoots(page)) {
    try {
      await expect(forgotHeading(root)).toBeVisible({ timeout: 20_000 });
      await emailInput(root).first().fill(config.email);
      await continueButton(root).click();
      submitted = true;
      break;
    } catch {
      continue;
    }
  }
  if (!submitted) {
    throw new Error(
      "Jamf forgot password: Forgot Your Password? screen or Continue not found"
    );
  }

  const successPattern =
    /check your (e-?)?mail|sent you|instructions to reset|we(?:'ve| have) sent|reset (?:your )?password|email (?:has been )?sent/i;

  await expect
    .poll(
      async () => {
        for (const root of jamfHostedRoots(page)) {
          const loc = root.getByText(successPattern).first();
          if (await loc.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
};
