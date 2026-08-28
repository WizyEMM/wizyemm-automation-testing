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
      isOptional: true, // Not available in all environments (e.g. staging)
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
      isOptional: false, // Reverted in latest release
    },
    {
      fromLanguage: "English",
      toLanguageMenuItem: "中文 - Traditional Chinese",
      expectedLanguage: "中文",
      isOptional: false, // Reverted in latest release
    }
  ] as LanguageSwitch[],
};
