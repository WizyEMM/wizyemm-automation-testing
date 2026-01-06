import { Page, Locator, expect } from "@playwright/test";

export function generateTimestamp(date?: Date): string {
    const now = date || new Date();
    return [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
    ].join('');
}

export async function selectFilterOptions(
    page: Page,
    filterName: string,
    options: string[],
    reset: boolean = false
): Promise<void> {
    for (let i = 0; i < options.length; i++) {
        const currentOption = options[i];
        const previousOption = i > 0 ? options[i - 1] : null;

        // Click the filter button to open dropdown
        await page.getByRole('cell', { name: `${filterName}` })
            .getByRole('button')
            .click();

        // Uncheck previous option if it exists
        if (previousOption) {
            await page.getByRole('menuitem', { name: previousOption, exact: true })
                .getByLabel('')
                .uncheck();
        }

        // Check the current option
        const menuItem = page.getByRole('menuitem', { name: currentOption, exact: true });
        const label = menuItem.getByLabel('');
        await label.check();

        // Click OK to confirm
        await page.getByRole('button', { name: 'OK' }).click();
        await waitAndSeeTable(page);
    }

    // Reset if requested
    if (reset) {
        await page.getByRole('cell', { name: `${filterName}` })
            .getByRole('button')
            .click();
        await page.getByRole('button', { name: 'Reset' }).click();
        await page.getByRole('button', { name: 'OK' }).click();
        await waitAndSeeTable(page);
    }
}

export function buildTargetLocator(
    scope: Page | Locator,
    roleOrSelector: string,
    name?: string | RegExp,
    options?: {
        position?: 'first' | number;
        hasAttribute?: string;
        childSelector?: string;
        exact?: boolean;
    }
): Locator {
    const { position, hasAttribute, childSelector, exact } = options || {};

    let baseLocator: Locator;

    if (roleOrSelector.startsWith('#') || roleOrSelector.startsWith('.') || roleOrSelector.startsWith('[')) {
        // Treat it as a CSS selector
        baseLocator = scope.locator(roleOrSelector);
    } else {
        // Treat it as a role
        baseLocator = scope.getByRole(roleOrSelector as any, { name: name!, exact });
    }

    if (hasAttribute) {
        baseLocator = baseLocator.locator(`[${hasAttribute}]`);
    }

    if (childSelector) {
        baseLocator = baseLocator.locator(childSelector);
    }

    if (position === 'first') return baseLocator.first();
    if (typeof position === 'number') return baseLocator.nth(position);

    return baseLocator;
}




export async function assertAndClick(target: Locator) {
    await expect(target).toBeVisible();
    await expect(target).toBeEnabled();
    await target.click();
}



export async function genericClicker(
    scope: Page | Locator,
    roleOrSelector: string,
    nameOrOptions?: string | RegExp | {
        position?: 'first' | number;
        hasAttribute?: string;
        childSelector?: string;
        exact?: boolean;
    },
    maybeOptions?: {
        position?: 'first' | number;
        hasAttribute?: string;
        childSelector?: string;
        exact?: boolean;
    }
) {
    let name: string | RegExp | undefined;
    let options:
        | {
            position?: 'first' | number;
            hasAttribute?: string;
            childSelector?: string;
            exact?: boolean;
        }
        | undefined;

    if (typeof nameOrOptions === 'string' || nameOrOptions instanceof RegExp) {
        name = nameOrOptions;
        options = maybeOptions;
    } else {
        options = nameOrOptions;
    }

    const target = buildTargetLocator(scope, roleOrSelector, name, options);
    await assertAndClick(target);
}



type Role = 'radio' | 'checkbox';
type locatorOptions =
    | { name: string }
    | { id: string };

export async function genericChecker(
    page: Page, role: Role, locatorOptions: locatorOptions
) {
    let locator: Locator;
    if (role === 'checkbox' && 'name' in locatorOptions) {
        const row = page.getByRole('row').filter({ hasText: locatorOptions.name }).first();
        locator = row.locator('input[type="checkbox"]');
    } else if ('name' in locatorOptions) {
        locator = page.getByRole(role, {
            name: locatorOptions.name,
            exact: false
        });
    } else if ('id' in locatorOptions) {
        const escapedID = locatorOptions.id.replace(/\./g, '\\.');
        locator = page.locator(`#${escapedID}`);
    } else {
        throw new Error('You alright, mate? You need to provide either a name or an id for the locator.');
    }

    await expect(locator).toBeVisible();

    if (await locator.isChecked()) {
        await locator.uncheck();
        await expect(locator).not.toBeChecked();
    } else {
        await locator.check();
        await expect(locator).toBeChecked();
    }
}



export async function searchFunction(page: Page, textboxString: string, searchTerm: string) {
    await page.getByRole('textbox', { name: textboxString }).click();
    await page.getByRole('textbox', { name: textboxString }).fill(searchTerm);
    // await page.keyboard.press('Escape');
}



export async function profileInfoFill(page: Page, profileName: string) {
    await page.getByRole('button', { name: 'plus Create' }).click();
    const nameTextBox = page.getByRole('textbox', { name: '* Name' });
    await nameTextBox.fill(profileName);
    await expect(nameTextBox).toHaveValue(profileName);
}



export async function waitAndSeeTable(page: Page) {
    // * smart wait! waits for the table behind to load
    const spinner = page.locator('svg[data-icon="loading"]');

    const firstRow = page.getByRole('row').nth(2);
    await expect(firstRow).toBeVisible();

    try {
        await expect(spinner).toBeHidden();
    } catch (_) {

    }

    // await spinner.waitFor({ state: 'hidden' });
    await expect(spinner).toHaveCount(0);
    await expect(firstRow).toBeVisible();
}




export async function svgClicker(page: Page, partialID: string) {
    const svgLocator = page.locator(`svg path[d*="${partialID}"]`);
    await expect(svgLocator).toBeVisible();

    const clickableSpan = svgLocator.locator('xpath=ancestor::span[contains(@class, "noticeButton")]').first();
    await expect(clickableSpan, 'Clickable icon container').toBeVisible();

    await clickableSpan.click();

}


export async function sixSecondWait(page: Page, updateString: string) {
    await expect(page.getByText(updateString)).toBeVisible();
    await expect(page.getByText(updateString)).toBeHidden({ timeout: 6000 });
}



export function generateAppPackageName(): string {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hhmmss = generateTimestamp(now);

    return `app.${month}${day}${year}${hhmmss}`;
}

export function playwrightDateGenerator(): string {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hhmmss = generateTimestamp(now);

    return `Playwright.${month}${day}${year}${hhmmss}`;
}

export async function checkboxToggle(page: Page, name: string) {
    const checkbox = page.getByRole('checkbox', { name });
    const isChecked = await checkbox.isChecked();
    await checkbox.setChecked(!isChecked); // toggles the checkbox
}