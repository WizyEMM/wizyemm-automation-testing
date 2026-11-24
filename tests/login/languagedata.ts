export interface LanguageSwitch {
  fromLanguage: string;
  toLanguageMenuItem: string;
  expectedLanguage: string;
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
