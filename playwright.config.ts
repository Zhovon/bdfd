import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the production build (`npm run build` first) against a
 * throwaway Postgres database, which global setup wipes on every run.
 *
 *   E2E_DATABASE_URL  required; its database name must contain "test" or "e2e"
 *   E2E_PORT          optional, default 3100
 *   PW_CHROMIUM_PATH  optional, use an existing Chromium instead of Playwright's
 */
const port = Number(process.env.E2E_PORT ?? 3100);
export const E2E = {
  baseURL: `http://localhost:${port}`,
  sessionSecret: "e2e-session-secret",
  adminEmail: "admin@e2e.test",
  adminPassword: "e2e-admin-password",
  uploadDir: path.join(os.tmpdir(), "food-family-e2e-uploads"),
};

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // One shared database: run serially so tests can't trip over each other.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E.baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `${E2E.baseURL}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      SESSION_SECRET: E2E.sessionSecret,
      ADMIN_EMAIL: E2E.adminEmail,
      ADMIN_PASSWORD: E2E.adminPassword,
      APP_URL: E2E.baseURL,
      UPLOAD_DIR: E2E.uploadDir,
      // Cloudflare's always-pass test keys.
      TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
  },
});
