import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { closeDb, db, signIn } from "./support";

test.describe("admin member list", () => {
  test.beforeAll(async () => {
    await db().query(
      `INSERT INTO users (full_name, email, mobile, address, designation, posting, password_hash, status)
       SELECT 'Listed Officer ' || g, 'listed' || g || '@e2e.test', '0181' || lpad(g::text, 7, '0'), 'L-' || g,
              'AO', CASE WHEN g % 2 = 0 THEN 'Rajshahi' ELSE 'Sylhet' END, 'x', 'approved'
       FROM generate_series(1, 30) g`,
    );
    await db().query(
      `INSERT INTO users (full_name, email, mobile, address, designation, posting, password_hash, status)
       VALUES ('Hundred%Sure', 'pct@e2e.test', '0', 'P', 'AO', 'Dhaka', 'x', 'approved')`,
    );
  });

  test.beforeEach(async ({ context }) => {
    await signIn(context, E2E.adminEmail);
  });

  test("searches, filters and pages while keeping the filters", async ({ page }) => {
    await page.goto("/admin");
    await page.fill("input[name=q]", "Listed Officer");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/q=Listed\+Officer/);
    await expect(page.getByText("1–25 of 30", { exact: false })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(25);

    await page.getByRole("navigation").getByRole("link", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/q=Listed\+Officer.*page=2|page=2.*q=Listed\+Officer/);
    await expect(page.locator("tbody tr")).toHaveCount(5);

    await page.goto("/admin?q=rajshahi");
    await expect(page.getByText("of 15", { exact: false })).toBeVisible();
  });

  test("treats % in a search literally", async ({ page }) => {
    await page.goto("/admin?q=%25");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("Hundred%Sure");
  });

  test("ignores an unknown status and clamps an out-of-range page", async ({ page }) => {
    const res = await page.goto("/admin?status=nonsense&page=999");
    expect(res?.status()).toBe(200);
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test.afterAll(async () => {
    await closeDb();
  });
});
