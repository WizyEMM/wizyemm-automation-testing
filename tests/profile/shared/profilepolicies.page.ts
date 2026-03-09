import { Page, expect } from "@playwright/test";

export class ProfilePoliciesPage {
  constructor(private page: Page) {}

  async navigateToProfileAndSearch(profileName: string, searchTerm: string) {
    await this.page.getByRole("link", { name: "Profile Management" }).click();

    const searchBox = this.page
      .getByRole("textbox", { name: /Filter by.*name/i })
      .first();
    await searchBox.fill(profileName);
    await this.page.getByRole("button", { name: "Refresh" }).click();

    await this.page.waitForResponse(
      (resp) => resp.url().includes("/profiles") && resp.status() === 200
    );

    const row = this.page.getByRole("row", { name: profileName }).first();
    await row.locator("a").first().click();

    await expect(this.page).toHaveURL(
      /\/profiles\/[a-zA-Z0-9-]+\/(policies|personal-policies)/
    );

    const searchInput = this.page.getByRole("textbox", { name: "Search" });
    await searchInput.fill(searchTerm);
    await searchInput.press("Enter");
  }

  async togglePolicySwitch(policyName: string) {
    const switchLocator = this.page
      .getByRole("listitem")
      .filter({ hasText: policyName })
      .getByRole("switch");

    await switchLocator.click();
    
    // Wait for UI to settle before saving
    await this.page.waitForTimeout(500);
    
    await this.page.getByRole("button", { name: "Save" }).click();

    await this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/") &&
        (resp.status() === 200 || resp.status() === 204) &&
        (resp.request().method() === "PATCH" ||
          resp.request().method() === "PUT")
    );
  }

  async navigateToPersonalPolicies() {
    await this.page.getByRole("tab", { name: "Personal Policies" }).click();
  }

  async modifyPolicy(
    profileName: string,
    searchTerm: string,
    policyName: string
  ) {
    await this.navigateToProfileAndSearch(profileName, searchTerm);
    await this.togglePolicySwitch(policyName);
  }

  async modifyWorkProfilePolicy(
    profileName: string,
    searchTerm: string,
    policyName: string
  ) {
    await this.modifyPolicy(profileName, searchTerm, policyName);
  }

  async modifyPersonalProfilePolicy(policyName: string) {
    await this.navigateToPersonalPolicies();
    await this.togglePolicySwitch(policyName);
  }
}
