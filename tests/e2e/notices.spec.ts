import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { acceptDialogs, closeDb, db, photo, signIn } from "./support";

test.describe("notices and photo galleries", () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context, E2E.adminEmail);
  });

  test("publishes a notice with camera-sized photos and per-section galleries", async ({ page }) => {
    const big = { name: "camera.jpg", mimeType: "image/jpeg", buffer: await photo() };
    expect(big.buffer.length).toBeGreaterThan(1024 * 1024); // regression: >1 MB used to crash publishing

    await page.goto("/admin/content");
    await page.fill("input[name=title]", "Gallery tour");
    await page.setInputFiles("input[name=cover]", [big]);
    await page.getByRole("button", { name: "+ Add section" }).click();
    await page.getByRole("button", { name: "+ Add section" }).click();
    await page.fill('input[name="block-heading-0"]', "Day one");
    await page.setInputFiles('input[name="block-images-0"]', [
      { ...big, name: "a.jpg" },
      { ...big, name: "b.jpg" },
      { ...big, name: "c.jpg" },
    ]);
    await page.fill('input[name="block-heading-1"]', "Day two");
    await page.setInputFiles('input[name="block-images-1"]', [{ ...big, name: "d.jpg" }]);
    await page.getByRole("button", { name: "Publish notice" }).click();
    await expect(page.getByText("Notice published.")).toBeVisible({ timeout: 30_000 });

    const { rows } = await db().query<{ id: number }>(`SELECT id FROM posts WHERE title = 'Gallery tour'`);
    await page.goto(`/portal/notice/${rows[0].id}`);

    // Each section has its own gallery; its viewer pages through only its own photos.
    const sections = page.locator("article section");
    await sections.nth(0).getByRole("button", { name: /View gallery/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Day one · 1 / 3");
    await page.keyboard.press("ArrowRight");
    await expect(dialog).toContainText("Day one · 2 / 3");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await sections.nth(1).getByRole("button", { name: "View photo" }).click();
    await expect(page.getByRole("dialog")).toContainText("Day two · 1 / 1");
    await page.keyboard.press("Escape");

    // Grid thumbnails load the small file, and stored photos are served.
    const thumb = await sections.nth(0).locator(".grid-cols-4 img").first().getAttribute("src");
    expect(thumb).toMatch(/\.t\.webp$/);
    expect((await page.request.get(thumb!)).status()).toBe(200);
  });

  test("a rejected notice keeps everything the admin typed", async ({ page }) => {
    await page.goto("/admin/content");
    await page.fill("input[name=title]", "Keeps my work");
    await page.getByRole("button", { name: "+ Add section" }).click();
    await page.fill('textarea[name="block-body-0"]', "A long itinerary I would hate to retype.");
    // A file named .pdf that isn't a PDF is refused by the server.
    await page.setInputFiles("input[name=pdf]", {
      name: "programme.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a pdf"),
    });
    await page.getByRole("button", { name: "Publish notice" }).click();
    await expect(page.getByText("Upload a PDF file.")).toBeVisible();
    await expect(page.locator("input[name=title]")).toHaveValue("Keeps my work");
    await expect(page.locator('textarea[name="block-body-0"]')).toHaveValue(
      "A long itinerary I would hate to retype.",
    );
  });

  test("deleting a notice removes its photos from storage", async ({ page }) => {
    const { rows } = await db().query<{ url: string }>(
      `SELECT i.url FROM post_images i JOIN posts p ON p.id = i.post_id WHERE p.title = 'Gallery tour'`,
    );
    expect(rows.length).toBeGreaterThan(0);

    acceptDialogs(page);
    await page.goto("/admin/content");
    const row = page.locator("li", { hasText: "Gallery tour" });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("li", { hasText: "Gallery tour" })).toHaveCount(0);

    for (const { url } of rows) {
      expect((await page.request.get(url)).status(), url).toBe(404);
      expect((await page.request.get(url.replace(/\.f\.webp$/, ".t.webp"))).status()).toBe(404);
    }
  });

  test.afterAll(async () => {
    await closeDb();
  });
});
