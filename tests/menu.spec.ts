import { test, expect } from "@playwright/test";
import { runAxe } from "./helpers/axe";

// The menu scenario on Team Y's site. The site uses hash routing, so the
// "page" lives after the # and the server always serves the same index.html.
// accessible should pass on our tests
// broken will still pass but we are asserting what the failure is and checking
const menuUrl = (variant: "accessible" | "broken") =>
  `#/disclosure/menu?variant=${variant}`;

test("menu page loads", async ({ page }) => {
  await page.goto(menuUrl("accessible"));

  // The site is a React app: the HTML arrives nearly empty and React builds
  // the page afterwards. expect(...) retries until the element shows up
  // (5s by default), so we don't need any manual waiting.
  await expect(page.getByTestId("variant")).toHaveText("accessible");

  const trigger = page.getByTestId("trigger");
  await expect(trigger).toBeVisible();
  // Starting state, before anyone clicks: menu closed.
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("menu")).toBeHidden();
});

test("accessible: baseline axe scan is clean", async ({ page }, testInfo) => {
  await page.goto(menuUrl("accessible"));
  await expect(page.getByTestId("trigger")).toBeVisible();

  const violations = await runAxe(page, testInfo, "before");
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("broken: baseline axe scan catches the unnamed button", async ({
  page,
}, testInfo) => {
  await page.goto(menuUrl("broken"));
  await expect(page.getByTestId("trigger")).toBeVisible();

  // The broken trigger is an icon-only <button> with no accessible name,
  // so a screen reader would just say "button". axe reports that as button-name.
  const violations = await runAxe(page, testInfo, "before");
  expect(violations.map((v) => v.id)).toContain("button-name");
});
