/**
 * Auth Cache Types
 * Defines the structure of authentication data stored in cache
 */

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface TokenData {
  access_token: string;
  id_token: string;
  client_id: string;
  audience: string;
}

export interface AuthCacheData {
  cookies: CookieData[];
  tokens: TokenData;
  timestamp: number;
}

export interface JWTPayload {
  exp: number;
  iat: number;
  [key: string]: any;
}
