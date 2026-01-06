import { Page, expect, FrameLocator } from "@playwright/test";
import * as helpers from "../../utils/helpers";
import { waitForApplicationToast } from "./application.helpers";
import { applicationManagementData } from "./applicationmanagementdata";

const { navigation } = applicationManagementData;

export class ApplicationManagementPage {
  constructor(private page: Page) {}

  async navigateToApplicationManagement() {
    await this.page
      .getByRole("menuitem", { name: navigation.applicationManagement })
      .click();
  }

  async navigateToManagedApplications() {
    await this.page
      .getByRole("menuitem", { name: navigation.managedApplications })
      .click();
  }

  async navigateToPublicApplications() {
    await this.page
      .getByRole("menuitem", { name: navigation.publicApplications })
      .click();
  }

  async navigateToWebApplications() {
    await this.page
      .getByRole("menuitem", { name: navigation.webApplications })
      .click();
  }

  async navigateToSystemApplications() {
    await this.page
      .getByRole("menuitem", { name: navigation.systemApplications })
      .click();
  }

  async addManagedApplication(appName: string, packageName: string) {
    await this.page.getByRole("button", { name: "plus Add" }).click();
    await this.page
      .getByRole("textbox", { name: "* Application Name" })
      .click();
    await this.page
      .getByRole("textbox", { name: "* Application Name" })
      .fill(appName);
    await this.page
      .getByRole("textbox", { name: "* Application Package Name" })
      .click();
    await this.page
      .getByRole("textbox", { name: "* Application Package Name" })
      .fill(packageName);
    await this.page.getByRole("button", { name: "OK" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/playstoreapps") &&
        resp.status() === 201 &&
        resp.request().method() === "POST"
    );
    await waitForApplicationToast(this.page, "was added");
  }

  async removeManagedApplication(appRowName: string) {
    await this.page
      .getByRole("row", { name: appRowName })
      .getByLabel("")
      .first()
      .check();
    await this.page.getByRole("button", { name: "Remove application" }).click();
    await this.page.getByRole("button", { name: "OK" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/playstoreapps") &&
        resp.status() === 204 &&
        resp.request().method() === "DELETE"
    );
    await waitForApplicationToast(this.page, "have been deleted");
  }

  getPublicAppsFrame(): FrameLocator {
    return this.page.frameLocator('iframe:visible[src*="play.google.com"]');
  }

  async searchPublicApp(searchTerm: string) {
    const frame = this.getPublicAppsFrame();
    await frame.getByRole("textbox", { name: "Search" }).click();
    await frame.getByRole("textbox", { name: "Search" }).fill(searchTerm);
    await frame.getByRole("button", { name: "Search" }).click();
  }

  async clickPublicApp(appName: string) {
    const frame = this.getPublicAppsFrame();
    await expect(
      frame.getByRole("link", { name: appName, exact: true })
    ).toBeVisible();
    await frame.getByRole("link", { name: appName, exact: true }).click();
  }

  async verifyPublicAppText(expectedText: string) {
    const frame = this.getPublicAppsFrame();
    await expect(frame.getByText(expectedText)).toBeVisible();
  }

  getWebAppsFrame(): FrameLocator {
    return this.page.frameLocator('iframe:visible[src*="play.google.com"]');
  }

  async createWebApp(title: string, url: string) {
    const frame = this.getWebAppsFrame();
    await frame.getByRole("button", { name: "Create" }).click();
    await frame.getByRole("textbox", { name: "Application title" }).click();
    await frame.getByRole("textbox", { name: "Application title" }).fill(title);
    await frame.getByRole("textbox", { name: "Application URL" }).click();
    await frame.getByRole("textbox", { name: "Application URL" }).fill(url);
    await frame.getByRole("button", { name: "Create" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp
          .url()
          .includes("/_/PlayEnterpriseWebWebappsUi/data/batchexecute") &&
        resp.url().includes("rpcids=E6UJrf") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }

  async verifyWebAppText(expectedText: string) {
    const frame = this.getWebAppsFrame();
    await expect(frame.getByText(expectedText)).toBeVisible();
  }

  async deleteWebApp(appName: string) {
    const frame = this.getWebAppsFrame();
    await frame.getByRole("link", { name: appName }).click();
    await frame.getByRole("button", { name: "Delete" }).click();
    await expect(frame.getByText("Delete App")).toBeVisible();
    await frame.getByRole("button", { name: "Delete" }).click();
    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/batchexecute") &&
        resp.url().includes("rpcids=bcACZ") &&
        resp.status() === 200 &&
        resp.request().method() === "POST"
    );
  }

  async verifyWebAppDeleted(appName: string) {
    const frame = this.getWebAppsFrame();
    await expect(frame.getByText(appName)).not.toBeVisible();
  }

  async sortSystemAppsColumn(columnName: string, clicks: number = 3) {
    const locator = this.page
      .locator("#app")
      .getByText(columnName, { exact: true });
    for (let i = 0; i < clicks; i++) {
      await locator.click();
      await helpers.waitAndSeeTable(this.page);
    }
  }

  async selectDevice() {
    await this.page.locator("#device-selector").click();

    try {
      await this.page
        .locator(".ant-select-dropdown")
        .waitFor({ state: "visible" });

      const deviceOption = this.page
        .locator(".ant-select-item-option")
        .filter({ hasNotText: "Select a device" })
        .first();

      await deviceOption.waitFor({ state: "visible" });
      await deviceOption.click();
    } catch (error) {
      throw new Error("No devices available to select");
    }
  }
}
