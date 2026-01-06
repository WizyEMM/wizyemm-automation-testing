// Load environment variables from .env.TEST_ENV when provided, otherwise fall back to .env
const envFile = process.env.TEST_ENV ? `.env.${process.env.TEST_ENV}` : ".env";
require("dotenv").config({ path: envFile });

const namespace = process.env.NAMESPACE || "";
const region = process.env.REGION || "";
const domain = process.env.DOMAIN || "";
const email = process.env.EMAIL || "";
const password = process.env.PASSWORD || "";


const baseUrl = `https://${namespace}.${region}.${domain}`;

export default {
  baseUrl,
  namespace,
  region,
  domain,
  email,
  password,
};
