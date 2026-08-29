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

// Some instances (e.g. team-a) need a localStorage key set before the app
// finishes loading, or it hangs indefinitely. Unset on instances that don't
// need it, so this stays a no-op everywhere else.
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
