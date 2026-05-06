import { Page, Locator, expect } from "@playwright/test";
import config from "../../utils/env";

export class LoginPage {
  readonly page: Page;
  readonly loginButton: Locator;
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginButton = page.getByRole("button", { name: "Log in" });
    this.loginForm = page.locator("#login-form");
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.locator("#btn-login");
  }

  async navigateToLogin() {
    await this.page.goto(config.baseUrl);
  }

  async clickLoginButton() {
    await this.loginButton.click();
  }

  async waitForLoginForm() {
    await this.loginForm.waitFor({ state: "visible", timeout: 30000 });
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSubmitButton() {
    await this.submitButton.click();
  }

  async waitForDashboard() {
    await this.page.waitForURL(/dashboard/);
  }

  async verifyLoginSuccess() {
    await expect(this.page).toHaveURL(/dashboard/);
  }

  async login(email: string, password: string) {
    await this.navigateToLogin();
    await this.clickLoginButton();
    await this.waitForLoginForm();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmitButton();
    await this.waitForDashboard();
    await this.verifyLoginSuccess();
  }
}

export class ForgotPasswordPage {
  readonly page: Page;
  readonly forgotPasswordLink: Locator;
  readonly emailResetInput: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot Password" });
    this.emailResetInput = page.locator("#email-reset-password");
    this.resetButton = page.getByRole("button", { name: "Request Password Reset" });
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async fillResetEmail(email: string) {
    await this.emailResetInput.click();
    await this.emailResetInput.fill(email);
  }

  async clickResetButton() {
    await this.resetButton.click();
  }

  async verifyResetSuccess() {
    await expect(this.page.getByText("Your reset password request")).toBeVisible();
  }
}
