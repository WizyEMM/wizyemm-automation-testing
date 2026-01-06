export interface LanguageSwitch {
  fromLanguage: string;
  toLanguageMenuItem: string;
  expectedLanguage: string;
}

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
      toLanguageMenuItem: "中文 - Chinese",
      expectedLanguage: "中文",
    }
  ] as LanguageSwitch[],
};
