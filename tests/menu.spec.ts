import { test, expect } from '@playwright/test';

// The menu scenario on Team Y's site. The site uses hash routing, so the
// "page" lives after the # and the server always serves the same index.html.
const MENU_URL = '#/disclosure/menu?variant=accessible';

test('menu page loads', async ({ page }) => {
  await page.goto(MENU_URL);

  // The site is a React app: the HTML arrives nearly empty and React builds
  // the page afterwards. expect(...) retries until the element shows up
  // (5s by default), so we don't need any manual waiting.
  await expect(page.getByTestId('variant')).toHaveText('accessible');

  const trigger = page.getByTestId('trigger');
  await expect(trigger).toBeVisible();
  // Starting state, before anyone clicks: menu closed.
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('menu')).toBeHidden();
});
