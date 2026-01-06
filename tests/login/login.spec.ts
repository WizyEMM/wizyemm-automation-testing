import { test, expect } from "@playwright/test";
import config from "../../utils/env";
import { forgotPassword, loginLocal, loginLocalWithInvalidCredentials } from "./login";

test.describe.configure({ timeout: 60_000 });

test("localLogin",
    async ({ page }) => {
        await loginLocal({ page });
        await expect(page).toHaveURL(`${config.baseUrl}/dashboard`);
    }
);

test ("localLoginWithInvalidCredentials",
    async ({ page }) => {
        await loginLocalWithInvalidCredentials({ page });
        await expect(page.getByText('Wrong email or password')).toBeVisible();
    }
);

test("forgotPassword",
    async ({ page }) => {
        await forgotPassword({ page });
    }
);
