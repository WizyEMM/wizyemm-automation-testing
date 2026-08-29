import path from "path";

// Load environment variables from .env.TEST_ENV when provided, otherwise fall back to .env
const envFileName = process.env.TEST_ENV ? `.env.${process.env.TEST_ENV}` : ".env";
const envPath = path.resolve(__dirname, "..", envFileName);

require("dotenv").config({ path: envPath });

const namespace = process.env.NAMESPACE || "";
const region = process.env.REGION || "";
const domain = process.env.DOMAIN || "";
const email = process.env.EMAIL || "";
const password = process.env.PASSWORD || "";

// Optional per-instance localStorage bootstrap (see globalSetup.ts)
const lscacheKey = process.env.LSCACHE_KEY || "";
const lscacheValue = process.env.LSCACHE_VALUE || "";

const baseUrl = `https://${namespace}.${region}.${domain}`;

export default {
  baseUrl,
  namespace,
  region,
  domain,
  email,
  password,
  lscacheKey,
  lscacheValue,
};
