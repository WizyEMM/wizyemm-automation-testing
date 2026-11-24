export interface LanguageSwitch {
  fromLanguage: string;
  toLanguageMenuItem: string;
  expectedLanguage: string;
  /** Button label on Jamf instances, when it intentionally differs from expectedLanguage. */
  jamfExpectedLanguage?: string;
}

// Must match the language menu on the login page exactly (locators use exact: true).
export const languageTestData = {
  languageSwitches: [
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Français - French",
      expectedLanguage: "Français",
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "日本語 - Japanese",
      expectedLanguage: "日本語",
      // Requested by a Japanese Jamf customer: Jamf shows "日本語 - 日本語" on the button.
      jamfExpectedLanguage: "日本語 - 日本語",
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Español - Spanish",
      expectedLanguage: "Español",
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Deutsch - German",
      expectedLanguage: "Deutsch",
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "繁體中文 - Traditional Chinese",
      expectedLanguage: "繁體中文",
    },
  ] as LanguageSwitch[],
};
