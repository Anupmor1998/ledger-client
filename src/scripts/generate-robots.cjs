const fs = require("node:fs");
const path = require("node:path");
const { loadEnv } = require("vite");

const rootDir = process.cwd();
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

const env = {
  ...loadEnv(mode, rootDir, ""),
  ...process.env,
};

const appEnv = env.APP_ENV;

if (!["staging", "production"].includes(appEnv)) {
  throw new Error(
    `Invalid or missing APP_ENV: ${appEnv}. Expected staging or production.`,
  );
}

const publicDir = path.join(rootDir, "public");

const sourceFile =
  appEnv === "production" ? "robots.production.txt" : "robots.staging.txt";

fs.copyFileSync(
  path.join(publicDir, sourceFile),
  path.join(publicDir, "robots.txt"),
);

console.log(`Generated robots.txt for ${appEnv}`);
