import { expect, test } from "@playwright/test";

import { syntheticGuardianImport } from "../src/test/fixture";

test("explains the import flow and rejects malformed data", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Two heads are better than one across." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start solving" }).click();
  await expect(page.getByRole("link", { name: "Copy Guardian cryptic" })).toHaveAttribute(
    "href",
    /^javascript:/,
  );
  await page.getByLabel("Puzzle data").fill('{"broken":true}');
  await expect(page.locator(".form-error")).toContainText("incomplete");
});

test("two guests share letters, presence, and chat", async ({ browser }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_CONVEX_URL,
    "Requires a configured Convex development deployment.",
  );

  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await firstPage.goto("/import");
  await firstPage
    .getByLabel("Puzzle data")
    .fill(JSON.stringify(syntheticGuardianImport));
  await firstPage.getByLabel("Your display name").fill("Ada");
  await firstPage.getByRole("button", { name: "Create private room" }).click();
  await expect(firstPage).toHaveURL(/\/room\//);
  const roomUrl = firstPage.url();

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto(roomUrl);
  await secondPage.getByLabel("Display name").fill("Grace");
  await secondPage.getByRole("button", { name: "Join the room" }).click();
  await expect(secondPage.getByTitle("Ada is online")).toBeVisible();

  await firstPage.getByLabel("Row 1, column 1").fill("C");
  await expect(secondPage.getByLabel("Row 1, column 1")).toHaveValue("C");

  await firstPage
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Try 1 down");
  await firstPage.getByRole("button", { name: "Send message" }).click();
  await expect(secondPage.getByText("Try 1 down")).toBeVisible();

  await first.close();
  await second.close();
});

