import { rm } from "node:fs/promises";
import { E2E } from "../../playwright.config";
import { closeDb, db, sessionCookie } from "./support";

/**
 * Start every run from an empty database: drop everything, then make one
 * authenticated request so the app runs its own migrations and seeds the admin
 * exactly as it would on a fresh deployment. (The web server is already up.)
 */
export default async function globalSetup() {
  await db().query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await rm(E2E.uploadDir, { recursive: true, force: true });

  // Any request that reads the session triggers ensureSchema(). The cookie's
  // user doesn't exist yet, so the request just redirects to /login.
  const res = await fetch(`${E2E.baseURL}/portal`, {
    headers: { cookie: `portal_session=${sessionCookie(1)}` },
    redirect: "manual",
  });
  if (res.status >= 500) throw new Error(`App failed to initialise the database (HTTP ${res.status}).`);

  const { rows } = await db().query(`SELECT 1 FROM users WHERE official_email = $1`, [E2E.adminEmail]);
  if (rows.length !== 1) throw new Error("Bootstrap admin was not seeded.");
  await closeDb();
}
