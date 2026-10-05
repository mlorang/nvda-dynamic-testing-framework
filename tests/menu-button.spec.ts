import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const menuPageUrl =
  "https://mlorang.github.io/nvda-dynamic-testing-webpage/#/disclosure/menu?variant=broken";
const interactionMode = process.env.MENU_INTERACTION ?? "auto";

test("rescans the menu button after its DOM state changes", async ({ page }) => {
  if (interactionMode !== "auto" && interactionMode !== "manual") {
    throw new Error(`Unsupported MENU_INTERACTION mode: ${interactionMode}`);
  }

  if (interactionMode === "manual") {
    test.setTimeout(120_000);
  }

  await page.goto(menuPageUrl);

  const menuButton = page.getByRole("button", { name: "Actions" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  const beforeChange = await new AxeBuilder({ page }).analyze();
  expect(
    beforeChange.violations.map(({ id, description }) => ({ id, description })),
  ).toEqual([]);

  const domChangeDetected = page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          const menuIsOpen =
            Array.from(
              document.querySelectorAll('button[aria-expanded="true"]'),
            ).some((button) => button.textContent?.trim() === "Actions") &&
            document.querySelector('[role="menu"]') !== null;

          if (menuIsOpen) {
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve();
          }
        });
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error("Timed out waiting for the menu DOM change."));
        }, 90_000);

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["aria-expanded"],
          childList: true,
          subtree: true,
        });
      }),
  );

  if (interactionMode === "manual") {
    console.log('Click the "Actions" menu button in the opened browser to continue.');
  } else {
    await menuButton.click();
  }

  await domChangeDetected;
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menu", { name: "Actions" })).toBeVisible();

  const afterChange = await new AxeBuilder({ page }).analyze();
  expect(
    afterChange.violations.map(({ id, description }) => ({ id, description })),
  ).toEqual([]);
});
