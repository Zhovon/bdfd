import bcrypt from "bcryptjs";
import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { closeDb, createMember, resetToken, setLang, signIn } from "./support";

test.describe("authentication", () => {
  test("the site opens in Bangla by default", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("লগ ইন");
  });

  test("admin logs in through the form and lands in the admin panel", async ({ page, context }) => {
    await setLang(context, "en");
    await page.goto("/login");
    await page.fill("input[name=email]", E2E.adminEmail);
    await page.fill("input[name=password]", "wrong-password");
    await page.click("button[type=submit]");
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    // A rejected attempt keeps what was typed (React would otherwise reset it).
    await expect(page.locator("input[name=email]")).toHaveValue(E2E.adminEmail);

    await page.fill("input[name=password]", E2E.adminPassword);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("a pending member can't log in yet", async ({ page, context }) => {
    await createMember({
      name: "Pending Person",
      email: "pending@e2e.test",
      status: "pending",
      passwordHash: await bcrypt.hash("pending-pass", 4),
    });
    await setLang(context, "en");
    await page.goto("/login");
    await page.fill("input[name=email]", "pending@e2e.test");
    await page.fill("input[name=password]", "pending-pass");
    await page.click("button[type=submit]");
    await expect(page.getByText("Your account is awaiting administrator approval.")).toBeVisible();
  });

  test("members' pages redirect to login when signed out", async ({ page }) => {
    await page.goto("/portal/travel");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a reset link works once and signs out existing sessions", async ({ browser }) => {
    const id = await createMember({ name: "Reset Person", email: "reset@e2e.test" });
    const token = resetToken(id);

    const existing = await browser.newContext();
    await signIn(existing, "reset@e2e.test");
    const tab = await existing.newPage();
    await tab.goto("/portal");
    await expect(tab).toHaveURL(/\/portal$/);

    const resetOnce = async () => {
      const ctx = await browser.newContext();
      await setLang(ctx, "en");
      const p = await ctx.newPage();
      await p.goto(`/reset?token=${encodeURIComponent(token)}`);
      await p.fill("input[name=password]", "brand-new-pass");
      await p.fill("input[name=confirm]", "brand-new-pass");
      await p.click("button[type=submit]");
      return p;
    };

    await expect(await resetOnce()).toHaveURL(/\/login\?reset=1$/);
    const second = await resetOnce();
    await expect(second.getByText("This reset link is invalid or has expired.", { exact: false })).toBeVisible();

    await tab.goto("/portal");
    await expect(tab).toHaveURL(/\/login$/);
  });

  test("malformed ids are a 404, not a server error", async ({ page, context }) => {
    await signIn(context, E2E.adminEmail);
    for (const path of ["/portal/notice/abc", "/portal/notice/1.5", "/portal/notice/99999999999", "/portal/pay/abc"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test.afterAll(async () => {
    await closeDb();
  });
});
