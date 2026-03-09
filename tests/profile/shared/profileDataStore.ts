/**
 * Profile Data Store
 * Manages storing and retrieving profile names across test suites
 * Ensures data persists throughout the entire test execution
 */

interface ProfileStore {
  createdProfiles: {
    fm: string;
    cope: string;
    byod: string;
  };
  modifiedProfiles: {
    renamedFm: string;
    duplicatedCope: string;
  };
}

// Single source of truth for all profile data
const store: ProfileStore = {
  createdProfiles: {
    fm: "",
    cope: "",
    byod: "",
  },
  modifiedProfiles: {
    renamedFm: "",
    duplicatedCope: "",
  },
};

/**
 * Get all created profiles
 */
export function getCreatedProfiles() {
  return { ...store.createdProfiles };
}

/**
 * Get all modified profiles
 */
export function getModifiedProfiles() {
  return { ...store.modifiedProfiles };
}

/**
 * Set a created profile
 */
export function setCreatedProfile(
  type: "fm" | "cope" | "byod",
  value: string
) {
  store.createdProfiles[type] = value;
  console.log(`✓ Stored ${type} profile: "${value}"`);
}

/**
 * Set a modified profile
 */
export function setModifiedProfile(
  type: "renamedFm" | "duplicatedCope",
  value: string
) {
  store.modifiedProfiles[type] = value;
  console.log(`✓ Stored modified ${type} profile: "${value}"`);
}

/**
 * Get a specific created profile
 */
export function getCreatedProfile(type: "fm" | "cope" | "byod"): string {
  const value = store.createdProfiles[type];
  console.log(`📦 Retrieved ${type} profile: "${value || "[EMPTY]"}"`);
  return value;
}

/**
 * Get a specific modified profile
 */
export function getModifiedProfile(
  type: "renamedFm" | "duplicatedCope"
): string {
  const value = store.modifiedProfiles[type];
  console.log(`📦 Retrieved modified ${type} profile: "${value || "[EMPTY]"}"`);
  return value;
}

/**
 * Check if a created profile exists
 */
export function hasCreatedProfile(type: "fm" | "cope" | "byod"): boolean {
  const exists = !!store.createdProfiles[type];
  return exists;
}

/**
 * Check if a modified profile exists
 */
export function hasModifiedProfile(
  type: "renamedFm" | "duplicatedCope"
): boolean {
  const exists = !!store.modifiedProfiles[type];
  return exists;
}

/**
 * Log current store state for debugging
 */
export function logCurrentStore() {
  // Silent function - can be used for debugging if needed
}

/**
 * Clear all profiles (useful for cleanup)
 */
export function clearAllProfiles() {
  store.createdProfiles = { fm: "", cope: "", byod: "" };
  store.modifiedProfiles = { renamedFm: "", duplicatedCope: "" };
}

/**
 * Get full store state
 */
export function getFullStore(): ProfileStore {
  return JSON.parse(JSON.stringify(store));
}
