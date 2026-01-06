/**
 * Auth Cache Management
 * Handles saving, loading, and validating cached authentication data
 */

import fs from "fs";
import path from "path";
import { AuthCacheData, JWTPayload } from "./types";

const CACHE_DIR = path.resolve(__dirname, "../../Cookies");
const CACHE_FILE = path.join(CACHE_DIR, "auth-cache.json");

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
 */
export function saveAuthCache(data: AuthCacheData): void {
  ensureCacheDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  console.log("✓ Auth cache saved successfully");
}

/**
 * Load authentication data from cache file
 */
export function loadAuthCache(): AuthCacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      console.log("ℹ Auth cache file not found");
      return null;
    }

    const data = fs.readFileSync(CACHE_FILE, "utf-8");
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

  // Check if access token is expired
  if (isTokenExpired(cache.tokens.access_token)) {
    console.log("✗ Auth cache expired (access token expired)");
    return false;
  }

  // Check if cookies exist
  if (!cache.cookies || cache.cookies.length === 0) {
    console.log("✗ Auth cache invalid (no cookies)");
    return false;
  }

  console.log("✓ Auth cache is valid");
  return true;
}

/**
 * Clear the auth cache file
 */
export function clearAuthCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log("✓ Auth cache cleared");
    }
  } catch (error) {
    console.error("Failed to clear auth cache:", error);
  }
}

/**
 * Get cache file path (useful for debugging)
 */
export function getCacheFilePath(): string {
  return CACHE_FILE;
}
