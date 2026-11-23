import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { forgotPassword, loginLocal, loginLocalWithInvalidCredentials } from "./login";

test.describe.configure({ timeout: 60_000 });

test("localLogin - should navigate to local login page", { tag: [`@smoke`, `@regression`] },
    async ({ page }) => {
        await loginLocal({ page });
        await expect(page).toHaveURL(`${config.baseUrl}/dashboard`);
    }
);

test ("localLoginWithInvalidCredentials - should try logging in with invalid email ", { tag: [`@smoke`, `@regression`] },
    async ({ page }) => {
        await loginLocalWithInvalidCredentials({ page });
        await expect(page.getByText('Wrong email or password')).toBeVisible();
    }
);

test("forgotPassword - should navigate to forgot password page", { tag: [`@smoke`, `@regression`] },
    async ({ page }) => {
        await forgotPassword({ page });
    }
);
