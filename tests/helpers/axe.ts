import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

// Only run the rules that map to WCAG 2.0/2.1 levels A and AA.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Runs axe against the page as it is *right now* and returns the violations.
 * `label` (e.g. "before" / "after") names the report attachment so we can
 * tell scans of the same page apart.
 */
export async function runAxe(page: Page, testInfo: TestInfo, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  // Short summary in the terminal: one line per broken rule.
  console.log(`[axe ${label}] ${results.violations.length} violation(s)`);
  for (const v of results.violations) {
    console.log(`  - ${v.id} (${v.impact}): ${v.nodes.length} element(s) - ${v.help}`);
  }

  // Full results go into the HTML report (npx playwright show-report).
  await testInfo.attach(`axe-${label}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  return results.violations;
}
