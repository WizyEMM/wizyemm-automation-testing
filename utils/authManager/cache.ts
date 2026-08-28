/**
 * Auth Cache Management
 * Handles saving, loading, and validating cached authentication data
 */

import fs from "fs";
import path from "path";
import { AuthCacheData, JWTPayload } from "./types";

const CACHE_DIR = path.resolve(__dirname, "../../Cookies");

/** TEST_ENV value that routes auth to the Jamf instance flow and jamf-specific cache file */
export const JAMF_AUTH_ENV = "jamf";

/**
 * Resolve which auth cache bucket to use. Explicit `env` wins; else TEST_ENV=jamf uses Jamf cache.
 * Change: Jamf support — separate file so WizyEMM and Jamf sessions do not overwrite each other.
 */
function resolveAuthEnv(env?: string): string | undefined {
  if (env !== undefined) return env;
  return process.env.TEST_ENV === JAMF_AUTH_ENV ? JAMF_AUTH_ENV : undefined;
}

/**
 * Return the filesystem path for the auth cache JSON file.
 * Change: Jamf uses `auth-cache-jamf.json`; all other envs use `auth-cache.json`.
 */
export function getCacheFilePath(env?: string): string {
  const resolved = resolveAuthEnv(env);
  const fileName =
    resolved === JAMF_AUTH_ENV ? "auth-cache-jamf.json" : "auth-cache.json";
  return path.join(CACHE_DIR, fileName);
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Decode JWT token to get payload
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8")
    );
    return decoded as JWTPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  // exp is in seconds, convert to milliseconds
  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();

  // Consider token expired if less than 5 minutes remaining
  const bufferTime = 5 * 60 * 1000;
  return currentTime > expirationTime - bufferTime;
}

/**
 * Save authentication data to cache file
 * Change: optional `env` selects jamf vs default cache path (via getCacheFilePath).
 */
export function saveAuthCache(data: AuthCacheData, env?: string): void {
  ensureCacheDir();
  const filePath = getCacheFilePath(env);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("✓ Auth cache saved successfully");
}

/**
 * Load authentication data from cache file
 * Change: optional `env` — same resolution as saveAuthCache.
 */
export function loadAuthCache(env?: string): AuthCacheData | null {
  const filePath = getCacheFilePath(env);
  try {
    if (!fs.existsSync(filePath)) {
      console.log("ℹ Auth cache file not found");
      return null;
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const cache = JSON.parse(data) as AuthCacheData;
    return cache;
  } catch (error) {
    console.error("Failed to load auth cache:", error);
    return null;
  }
}

/**
 * Validate if cached data is still valid
 */
export function isAuthCacheValid(cache: AuthCacheData | null): boolean {
  if (!cache) return false;

  if (!cache.cookies || cache.cookies.length === 0) {
    console.log("✗ Auth cache invalid (no cookies)");
    return false;
  }

  if (cache.tokens.access_token) {
    // JWT-based validation (normal instance)
    if (isTokenExpired(cache.tokens.access_token)) {
      console.log("✗ Auth cache expired (access token expired)");
      return false;
    }
  } else {
    // Cookie-based validation (Jamf — session is cookie-only, no JWT in localStorage)
    const now = Date.now() / 1000;
    const bufferSeconds = 5 * 60;
    const keyAuthCookies = cache.cookies.filter(
      (c) => c.name === "auth0" || c.name === "auth0_compat"
    );
    if (keyAuthCookies.length === 0) {
      console.log("✗ Auth cache invalid (no auth0 cookies for Jamf flow)");
      return false;
    }
    const allValid = keyAuthCookies.every(
      (c) => c.expires !== undefined && c.expires > now + bufferSeconds
    );
    if (!allValid) {
      console.log("✗ Auth cache expired (Jamf auth0 cookies expired)");
      return false;
    }
  }

  console.log("✓ Auth cache is valid");
  return true;
}

/**
 * Clear the auth cache file
 * Change: optional `env` clears the matching cache file only.
 */
export function clearAuthCache(env?: string): void {
  const filePath = getCacheFilePath(env);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✓ Auth cache cleared");
    }
  } catch (error) {
    console.error("Failed to clear auth cache:", error);
  }
}
