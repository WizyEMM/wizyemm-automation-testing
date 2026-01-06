import { expect, Page } from "@playwright/test";

export type ToastWaitOptions = {
    appearTimeout?: number;
    disappearTimeout?: number;
};

function padTimeUnit(value: number): string {
    return String(value).padStart(2, "0");
}

function buildTimestamp(date: Date): string {
    const hours = padTimeUnit(date.getHours());
    const minutes = padTimeUnit(date.getMinutes());
    const seconds = padTimeUnit(date.getSeconds());
    return `${hours}${minutes}${seconds}`;
}

function getLowercaseMonthName(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: "long" };
    const month = date.toLocaleString("en-US", options);
    return month.toLowerCase();
}

export function generateAppPackageName(date: Date = new Date()): string {
    const month = getLowercaseMonthName(date);
    const day = padTimeUnit(date.getDate());
    const year = date.getFullYear();
    const hhmmss = buildTimestamp(date);

    return `app.${month}${day}${year}${hhmmss}`;
}

export async function waitForApplicationToast(
    page: Page,
    message: string,
    options: ToastWaitOptions = {}
): Promise<void> {
    const { appearTimeout = 10_000, disappearTimeout = 10_000 } = options;
    const toast = page.locator(`text=${message}`).first();

    await expect(
        toast,
        `Timed out waiting for toast "${message}" to appear.`
    ).toBeVisible({ timeout: appearTimeout });

    await expect(
        toast,
        `Timed out waiting for toast "${message}" to disappear.`
    ).not.toBeVisible({ timeout: disappearTimeout });
}
