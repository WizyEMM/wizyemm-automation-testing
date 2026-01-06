import { expect, Page } from "@playwright/test";
import config from "../../utils/env";
import { LoginPage, ForgotPasswordPage } from "./login.page";
import { LanguageSwitchPage } from "./language.page";

const preLogin = async ({ page }: { page: Page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLogin();
  await loginPage.clickLoginButton();
};

const loginLocal = async ({ page }: { page: Page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login(config.email, config.password);
};

const loginLocalWithInvalidCredentials = async ({ page }: { page: Page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLogin();
  await loginPage.clickLoginButton();
  await loginPage.waitForLoginForm();
  
  const randomEmail = `test-${Math.random().toString(36).substring(2, 15)}@test.com`;
  await loginPage.fillEmail(randomEmail);
  await loginPage.fillPassword(config.password);
  await loginPage.clickSubmitButton();
};

const forgotPassword = async ({ page }: { page: Page }) => {
  const loginPage = new LoginPage(page);
  const forgotPasswordPage = new ForgotPasswordPage(page);
  
  await loginPage.navigateToLogin();
  await loginPage.clickLoginButton();
  await loginPage.waitForLoginForm();
  
  await forgotPasswordPage.clickForgotPassword();
  await page.waitForLoadState("networkidle");
  await forgotPasswordPage.fillResetEmail(config.email);
  await forgotPasswordPage.clickResetButton();
  await forgotPasswordPage.verifyResetSuccess();
};

const switchLanguageAndVerify = async (
  { page }: { page: Page },
  toLanguageMenuItem: string,
  expectedLanguage: string,
  fromLanguage: string = "English"
) => {
  const languagePage = new LanguageSwitchPage(page);
  await languagePage.switchLanguageAndVerify(
    fromLanguage,
    toLanguageMenuItem,
    expectedLanguage
  );
};

const resetLanguageToEnglish = async ({ page }: { page: Page }) => {
  const languagePage = new LanguageSwitchPage(page);
  await languagePage.resetLanguageToEnglish();
};

export { 
  loginLocal, 
  loginLocalWithInvalidCredentials, 
  preLogin, 
  forgotPassword,
  switchLanguageAndVerify,
  resetLanguageToEnglish
};
