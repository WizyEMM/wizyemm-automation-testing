import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async initializeDashboard() {
    // Navigate to dashboard to initialize the page with auth state
    await this.page.goto("/dashboard");
  }

  async navigateToProfiles() {
    await this.page.getByRole("link", { name: "Profiles" }).click();
  }

  async navigateToDashboard() {
    await this.page
      .getByRole("link", { name: "Dashboard", exact: true })
      .click();
  }

  async navigateToUsers() {
    await this.page.getByRole("link", { name: "Users" }).click();
  }

  async navigateToRegisteredDevices() {
    await this.page.getByRole("link", { name: "Registered Devices" }).click();
  }

  async navigateToEnrolledDevices() {
    await this.page.getByRole("link", { name: "Enrolled Devices" }).click();
  }

  async clickLogo() {
    await this.page.getByRole("link", { name: "logo" }).click();
  }

  async verifyDashboardWidgets() {
    await expect(this.page.getByText("Last Seen Breakdown")).toBeVisible();
    await expect(this.page.getByText("Battery Level Breakdown")).toBeVisible();
    await expect(this.page.getByText("Profile Update Status")).toBeVisible();
    await expect(this.page.getByText("Profile Distribution")).toBeVisible();
    await expect(this.page.getByText("Network Connectivity")).toBeVisible();
    await expect(this.page.getByText("Device Distribution")).toBeVisible();
    await expect(
      this.page.getByText("Android Version Distribution")
    ).toBeVisible();
    await expect(
      this.page.getByText("Management Mode Distribution")
    ).toBeVisible();
  }

  async verifyURL(expectedUrl: string) {
    await expect(this.page).toHaveURL(expectedUrl);
  }
}

export class HeaderNavigationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async clickHelpCenterIcon() {
    await this.page.getByRole("link").filter({ hasText: /^$/ }).nth(1).click();
  }

  async clickSettingsIcon() {
    await this.page.getByRole("link").filter({ hasText: /^$/ }).nth(2).click();
  }

  async clickHelpCenterLink() {
    await this.page.getByRole("link", { name: "Help Center" }).click();
  }

  async verifyPersonalSettings() {
    await expect(this.page.getByText("Personal Settings")).toBeVisible();
  }

  async waitForPopup(action: () => Promise<void>): Promise<Page> {
    const popupPromise = this.page.waitForEvent("popup");
    await action();
    return await popupPromise;
  }

  async verifyHelpCenterURL(newPage: Page) {
    await expect(newPage).toHaveURL(/https:\/\/support\.wizyemm\.com\/.*/);
  }
}

export class DashboardCustomizationPage {
  readonly page: Page;
  private readonly modalBody: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalBody = page.locator(".ant-modal-body");
  }

  async openCustomizeDashboard() {
    await this.page
      .getByRole("button", { name: "Customize Dashboard" })
      .click();

    await this.modalBody.waitFor({ state: "visible" });
  }

  private getDraggableCard(cardTitle: string): Locator {
    // Target the card wrapper that contains the ant-card-head-title
    return this.modalBody.locator(".ant-card").filter({
      has: this.page.locator(".ant-card-head-title", { hasText: cardTitle }),
    });
  }

  async dragCardToPosition(sourceCard: string, targetCard: string) {
    const sourceElement = this.getDraggableCard(sourceCard);
    const targetElement = this.getDraggableCard(targetCard);

    await sourceElement.waitFor({ state: "visible" });
    await targetElement.waitFor({ state: "visible" });

    console.log(`\n⟳ Dragging "${sourceCard}" to "${targetCard}"...`);

    // Get the drag handle (the dots icon - span with role="img")
    const sourceDragHandle = sourceElement.locator(".ant-card-head-wrapper span[role='img']").first();
    const targetCard_element = targetElement;

    const handleBox = await sourceDragHandle.boundingBox();
    const targetBox = await targetCard_element.boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error(`Could not get bounding boxes for drag operation`);
    }

    // Start from the drag handle center
    const fromX = handleBox.x + handleBox.width / 2;
    const fromY = handleBox.y + handleBox.height / 2;
    const toX = targetBox.x + targetBox.width / 2;
    const toY = targetBox.y + targetBox.height / 2;

    console.log(`  From drag handle: (${fromX}, ${fromY}) To target: (${toX}, ${toY})`);

    // Perform drag with slow movements
    await this.page.mouse.move(fromX, fromY);
    await this.page.waitForTimeout(100);
    await this.page.mouse.down();
    await this.page.waitForTimeout(200);
    
    // Move in steps for better drag simulation
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const currentX = fromX + (toX - fromX) * (i / steps);
      const currentY = fromY + (toY - fromY) * (i / steps);
      await this.page.mouse.move(currentX, currentY, { steps: 1 });
      await this.page.waitForTimeout(25);
    }
    
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
    console.log("✓ Drag operation completed\n");
  }

  async saveChanges() {
    const saveButton = this.page.getByRole("button", { name: "Save Update" });
    await saveButton.waitFor({ state: "visible" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const response = await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("firestore.googleapis.com") &&
        resp.url().includes("/Write/channel") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );

    // Log network response details for verification
    console.log("\n✓ Save request captured:");
    console.log(`  URL: ${response.url()}`);
    console.log(`  Status: ${response.status()}`);
    console.log(`  Method: ${response.request().method()}`);
    
    try {
      const responseBody = await response.json();
      console.log(`  Response body:`, JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.log(`  Response body: (binary or empty)`);
    }
    console.log("");
  }

  async verifySuccessNotification() {
    // Wait for the success notification with the exact text
    const notification = this.page.getByText('Dashboard View Updated Successfully');
    await notification.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Dashboard View Updated Successfully notification appeared");
    
    // Wait a moment for the notification to be fully shown, then it should auto-dismiss
    await this.page.waitForTimeout(2000);
    await notification.waitFor({ state: "hidden" });
    console.log("✓ Notification auto-dismissed\n");
  }

  async resetDashboard() {
    await this.page.getByRole("button", { name: "undo Reset" }).click();
  }

  /*
  async verifyResetButtonDisabled() {
    await expect(
      this.page.getByRole("button", { name: "undo Reset" })
    ).toBeDisabled();
  }
*/

  async verifySaveButtonEnabled() {
    await expect(
      this.page.getByRole("button", { name: "Save Update" })
    ).toBeEnabled();
  }

  async verifyResetOrCancel() {
    // Wait for the page to settle after reset
    await this.page.waitForTimeout(2000);
    
    // Check if save button is visible
    const saveButton = this.page.getByRole("button", { name: "Save Update" });
    const isVisible = await saveButton.isVisible();
    
    if (!isVisible) {
      console.log("\n⚠ Save button not visible after reset, clicking Cancel...");
      await this.page.getByRole("button", { name: "Cancel" }).click();
      console.log("✓ Cancelled modal\n");
      return;
    }
    
    // Save button is visible, click it to save the reset
    console.log("✓ Save button is visible, saving reset...");
    await this.page.waitForTimeout(1000);
    await saveButton.click();
    
    // Verify the success notification appeared
    await this.verifySuccessNotification();
  }
}

export class AlertEventsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get alertsButton() {
    return this.page.locator(".noticeButton__30Jwe").first();
  }

  get notificationsButton() {
    return this.page.locator(".noticeButton__30Jwe").nth(1);
  }

  async openAlerts() {
    await this.alertsButton.click();
  }

  async openNotifications() {
    await this.notificationsButton.click();
  }
}
