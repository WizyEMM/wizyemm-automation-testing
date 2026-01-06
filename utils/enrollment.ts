import { Page, Locator } from '@playwright/test';

/**
 * Toggles between two options in a selector dropdown
 * @param scope - Page or Locator scope to search within
 * @param selectorId - The ID of the selector element (e.g., 'locale', 'theme', etc.)
 * @param option1 - First option to toggle between
 * @param option2 - Second option to toggle between
 */
export async function toggleSelector(
    scope: Page | Locator,
    selectorId: string,
    option1: string,
    option2: string
): Promise<void> {
    // Target the specific selector using the provided ID
    const selector = scope.locator(`.ant-select-selector:has(#${selectorId})`);

    // Check current selection from the selector
    const currentSelectionText = await selector.locator('.ant-select-selection-item').textContent();
    const currentSelection = currentSelectionText?.trim() || '';

    // Determine target option
    const targetOption = currentSelection === option1 ? option2 : option1;

    // Click the selector to open dropdown
    await selector.click();

    // Select the target option from the dropdown
    await scope.getByText(targetOption).click();
}

// Example usage for language toggle
export async function toggleEnglish(scope: Page | Locator): Promise<void> {
    await toggleSelector(
        scope,
        'locale',
        'English (PH)',
        'English (PG)'
    );
}

// Example usage for other toggles
export async function toggleTimezone(scope: Page | Locator): Promise<void> {
    await toggleSelector(
        scope,
        'timezone',
        'Asia/Taipei',
        'Asia/Singapore'
    );
}

export async function toggleWifi(scope: Page | Locator): Promise<void> {
    await toggleSelector(
        scope,
        'wifi-network-selector',
        'Wifi sa bahay',
        'Livebox-2240'
    );
}

export async function toggleWifiSecurity(scope: Page | Locator): Promise<void> {
    await toggleSelector(
        scope,
        'wifi-security-selector',
        'Unspecified',
        'WEP'
    );
}