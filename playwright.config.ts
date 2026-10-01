import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  // Print each test as it runs, and also write an HTML report we can open later.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Team Y's site. Tests call page.goto('#/...') and Playwright prepends this.
    // The trailing slash matters: without it the relative URL would replace
    // "nvda-dynamic-testing-webpage" instead of being appended after it.
    baseURL: 'https://mlorang.github.io/nvda-dynamic-testing-webpage/',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
