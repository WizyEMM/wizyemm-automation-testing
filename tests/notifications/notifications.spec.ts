import { test, expect } from "../_base/jamfTest";
import config from "../../utils/env";
import { NotificationsPage } from "./notifications.page";
import { notificationTestData } from "./notificationsdata";

test.describe.configure({ timeout: 60_000 });

test.describe("Notification Settings", () => {
  let notificationsPage: NotificationsPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to trigger auth from storageState
    await page.goto(`${config.baseUrl}/dashboard`);
    await expect(page).toHaveURL(/dashboard/);

    notificationsPage = new NotificationsPage(page);
    await notificationsPage.navigateToNotifications();
  });

  test("should configure notification settings and verify email frequency options", async () => {
    await notificationsPage.openConfiguration();

    await notificationsPage.toggleBellNotifications();
    await notificationsPage.toggleEmailNotifications();

    await notificationsPage.updateSettings();

    await notificationsPage.ensureEmailNotificationsEnabled();
    expect(await notificationsPage.isEmailFrequencySelectorEnabled()).toBe(
      true
    );

    await notificationsPage.openEmailFrequencyDropdown();
    const visibleOptions = await notificationsPage.getVisibleFrequencyOptions();
    for (const expectedOption of notificationTestData.emailFrequencyOptions) {
      expect(
        visibleOptions.some((option) =>
          option.toLowerCase().includes(expectedOption.toLowerCase())
        )
      ).toBe(true);
    }
  });
});
