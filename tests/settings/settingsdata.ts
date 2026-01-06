export const languages = {
  FRENCH: "Français - French",
  JAPANESE: "日本語 – Japonais",
  SPANISH: "Español - スペイン語",
  GERMAN: "Deutsch (alemán)",
  CHINESE: "中文 – Chinesisch",
  ENGLISH: "English - 英语",
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
