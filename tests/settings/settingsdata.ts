// Native names: the part of each option label that stays the same in every UI language.
export const languages = {
  FRENCH: "Français",
  JAPANESE: "日本語",
  SPANISH: "Español",
  GERMAN: "Deutsch",
  CHINESE: "繁體中文",
  ENGLISH: "English",
} as const;

export const languageCycle = [
  languages.FRENCH,
  languages.JAPANESE,
  languages.SPANISH,
  languages.GERMAN,
  languages.CHINESE,
  languages.ENGLISH,
];

export function generateUniqueGDPRData() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const uniqueId = `${timestamp}-${randomSuffix}`;

  return {
    dpoName: `DPO-${uniqueId}`,
    dpoEmail: `dpo+${uniqueId}@wizy.io`,
    euRepName: `EURep-${uniqueId}`,
    euRepEmail: `eurep+${uniqueId}@wizy.io`,
  };
}
