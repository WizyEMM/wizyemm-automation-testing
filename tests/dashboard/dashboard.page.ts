import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
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
    return this.modalBody.locator('div[role="button"][tabindex="0"]').filter({
      has: this.page.locator(".ant-card-head-title", { hasText: cardTitle }),
    });
  }

  async dragCardToPosition(sourceCard: string, targetCard: string) {
    const sourceElement = this.getDraggableCard(sourceCard);
    const targetElement = this.getDraggableCard(targetCard);

    await sourceElement.waitFor({ state: "visible" });
    await targetElement.waitFor({ state: "visible" });

    const sourceBox = await sourceElement.boundingBox();
    const targetBox = await targetElement.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error("Could not get bounding boxes for drag operation");
    }

    const sourceCenterX = sourceBox.x + sourceBox.width / 2;
    const sourceCenterY = sourceBox.y + sourceBox.height / 2;
    const targetCenterX = targetBox.x + targetBox.width / 2;
    const targetCenterY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(sourceCenterX, sourceCenterY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(100);

    await this.page.mouse.move(targetCenterX, targetCenterY, { steps: 10 });

    await this.page.mouse.up();
  }

  async saveChanges() {
    const saveButton = this.page.getByRole("button", { name: "Save Update" });
    await saveButton.waitFor({ state: "visible" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("firestore.googleapis.com") &&
        resp.url().includes("/Write/channel") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }

  async resetDashboard() {
    await this.page.getByRole("button", { name: "undo Reset" }).click();
  }

  async verifyResetButtonDisabled() {
    await expect(
      this.page.getByRole("button", { name: "undo Reset" })
    ).toBeDisabled();
  }

  async verifySaveButtonEnabled() {
    await expect(
      this.page.getByRole("button", { name: "Save Update" })
    ).toBeEnabled();
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
