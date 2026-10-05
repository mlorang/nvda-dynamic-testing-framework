import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import type { Result } from 'axe-core';

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

/**
 * Returns the problems in `after` that were NOT already in `before`, i.e. the
 * ones the DOM change introduced. A problem is one rule failing on one
 * element, so the same rule failing on a new element counts as new.
 */
export function diffViolations(before: Result[], after: Result[]) {
  // node.target is the CSS selector axe uses to point at the element.
  const key = (ruleId: string, target: unknown) => `${ruleId} ${JSON.stringify(target)}`;

  const seenBefore = new Set(
    before.flatMap(v => v.nodes.map(node => key(v.id, node.target))),
  );

  return after.flatMap(v =>
    v.nodes
      .filter(node => !seenBefore.has(key(v.id, node.target)))
      .map(node => ({ rule: v.id, element: node.target.join(' ') })),
  );
}
