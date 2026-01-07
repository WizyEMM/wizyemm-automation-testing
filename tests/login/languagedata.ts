export interface LanguageSwitch {
  fromLanguage: string;
  toLanguageMenuItem: string;
  expectedLanguage: string;
  isOptional?: boolean; // true = will check if available, false/undefined = must be present
}

export const languageTestData = {
  languageSwitches: [
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Français - French",
      expectedLanguage: "Français",
      isOptional: false,
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Bahasa Indonesia - Indonesian",
      expectedLanguage: "Bahasa Indonesia",
      isOptional: false,
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "日本語 - Japanese",
      expectedLanguage: "日本語",
      isOptional: false,
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Español - Spanish",
      expectedLanguage: "Español",
      isOptional: false,
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "ไทย - Thai",
      expectedLanguage: "ไทย",
      isOptional: true, // Recently added, may not be fully released
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "Deutsch - German",
      expectedLanguage: "Deutsch",
      isOptional: true, // Reverted in latest release
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "中文 - Chinese",
      expectedLanguage: "中文",
      isOptional: true, // Reverted in latest release
    }
  ] as LanguageSwitch[],
};
