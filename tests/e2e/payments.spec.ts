import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { closeDb, createMember, db, setLang, signIn } from "./support";

const MEMBER = "payer@e2e.test";

test.describe("tour payments and notifications", () => {
  let postId: number;

  test.beforeAll(async () => {
    await createMember({ name: "Paying Member", email: MEMBER });
    const { rows } = await db().query<{ id: number }>(
      `INSERT INTO posts (category, title, body, payment_mode, fee_amount)
       VALUES ('travel', 'Paid tour', '', 'participation', 3500) RETURNING id`,
    );
    postId = rows[0].id;
  });

  test("a member reports a payment once; a reused reference is refused", async ({ page, context }) => {
    await signIn(context, MEMBER);
    for (const expected of [
      "your participation payment is recorded",
      "This transaction ID has already been reported",
    ]) {
      await page.goto(`/portal/pay/${postId}`);
      await page.selectOption("select[name=method]", { index: 1 });
      await page.fill("input[name=transactionRef]", "TRX-E2E-1");
      await page.getByRole("button", { name: "Confirm payment" }).click();
      await expect(page.getByText(expected, { exact: false })).toBeVisible();
    }
  });

  test("staff verify it and the member is notified in their language", async ({ browser }) => {
    const admin = await browser.newContext();
    await signIn(admin, E2E.adminEmail);
    const a = await admin.newPage();
    await a.goto("/admin/donations?q=TRX-E2E-1");
    await a.getByRole("button", { name: "Verify" }).click();
    await expect(a.locator("tbody")).toContainText("verified");

    const member = await browser.newContext();
    await signIn(member, MEMBER, "bn");
    const m = await member.newPage();
    await m.goto("/portal/notifications");
    await expect(m.getByText("অংশগ্রহণ নিশ্চিত হয়েছে")).toBeVisible();
    await expect(m.getByText("আপনার ৳ ৩,৫০০ পেমেন্ট নিশ্চিত হয়েছে।")).toBeVisible();

    await setLang(member, "en");
    await m.reload();
    await expect(m.getByText("Participation confirmed")).toBeVisible();
    await expect(m.getByText("Your ৳ 3,500 payment has been confirmed. Thank you.")).toBeVisible();
  });

  test("payments are only accepted on Travel notices", async ({ page, context }) => {
    const { rows } = await db().query<{ id: number }>(
      `INSERT INTO posts (category, title, body) VALUES ('welfare', 'Welfare notice', '') RETURNING id`,
    );
    await signIn(context, MEMBER);
    await page.goto(`/portal/pay/${rows[0].id}`);
    await expect(page).toHaveURL(new RegExp(`/portal/notice/${rows[0].id}$`));
  });

  test.afterAll(async () => {
    await closeDb();
  });
});
