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

test("clue bank clicks switch direction at an intersection", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_CONVEX_URL,
    "Requires a configured Convex development deployment.",
  );

  await page.goto("/import");
  await page
    .getByLabel("Puzzle data")
    .fill(JSON.stringify(syntheticGuardianImport));
  await page.getByLabel("Your display name").fill("Ada");
  await page.getByRole("button", { name: "Create private room" }).click();
  await expect(page).toHaveURL(/\/room\//);

  const across = page.getByRole("button", {
    name: /^1 Feline heard \(3\), 3 letters$/,
  });
  const down = page.getByRole("button", {
    name: /^1 Vehicle \(3\), 3 letters$/,
  });

  await across.click();
  await expect(across).toHaveClass(/\bactive\b/);
  await down.click();
  await expect(down).toHaveClass(/\bactive\b/);
  await expect(across).not.toHaveClass(/\bactive\b/);
  await expect(page.getByRole("tab", { name: "1 D" })).toBeVisible();

  await across.click();
  await expect(across).toHaveClass(/\bactive\b/);
  await expect(down).not.toHaveClass(/\bactive\b/);
  await expect(page.getByRole("tab", { name: "1 A" })).toBeVisible();
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

  await firstPage.getByRole("tab", { name: "1 A" }).click();
  await secondPage.getByRole("tab", { name: "1 A" }).click();
  await expect(secondPage.getByText("Try 1 down")).not.toBeVisible();
  await firstPage
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Could be a homophone");
  await firstPage.getByRole("button", { name: "Send message" }).click();
  await expect(secondPage.getByText("Could be a homophone")).toBeVisible();

  await first.close();
  await second.close();
});

