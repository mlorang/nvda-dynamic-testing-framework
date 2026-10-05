import type { Page } from "@playwright/test";

/** One DOM change, copied out of the browser as plain data. */
export type DomChange = {
  type: "attributes" | "childList" | "characterData";
  target: string; // e.g. 'button#actions-button'
  attributeName: string | null; // set when type === "attributes"
  oldValue: string | null; // attribute value before the change (null = attribute was absent)
  newValue: string | null; // attribute value now (null = attribute was removed)
  added: string[]; // nodes inserted (childList changes)
  removed: string[]; // nodes removed (childList changes)
};

/**
 * Starts a MutationObserver on the element matching `rootSelector` and
 * records every change inside it. Call this AFTER the page has rendered and
 * BEFORE doing whatever causes the change (e.g. the click), otherwise the
 * change can happen before anyone is listening.
 *
 * Returns:
 *  - changes: the live list of everything recorded so far
 *  - waitFor(isDone, timeoutMs): resolves once isDone(changes) is true,
 *    rejects if that doesn't happen within timeoutMs
 */
export async function watchDom(page: Page, rootSelector: string) {
  const changes: DomChange[] = [];
  // Called every time a new change arrives. waitFor() swaps in its own check.
  let onChange = () => {};

  // Direction 1: browser -> Node.
  // This creates window.__reportDomChange inside the page. When page code calls
  // it, Playwright ships the argument over to this Node process and runs our
  // callback here.
  await page.exposeFunction("__reportDomChange", (change: DomChange) => {
    changes.push(change);
    onChange();
  });

  // Direction 2: Node -> browser.
  // Everything inside this arrow function is sent to the browser and runs
  // THERE, so it can only use browser things (document, MutationObserver) and
  // the argument we pass in. It cannot see `changes` or anything else above.
  await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) throw new Error(`watchDom: nothing matches ${selector}`);

    // Turn a DOM node into a short readable label like 'ul#actions-menu'.
    const describe = (node: Node) =>
      node instanceof Element
        ? node.tagName.toLowerCase() + (node.id ? `#${node.id}` : "")
        : node.nodeName;

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        // MutationRecords hold live DOM nodes, which can't be sent to Node,
        // so we copy out just the strings we care about.
        (window as any).__reportDomChange({
          type: r.type,
          target: describe(r.target),
          attributeName: r.attributeName,
          oldValue: r.oldValue,
          newValue: r.attributeName
            ? (r.target as Element).getAttribute(r.attributeName)
            : null,
          added: Array.from(r.addedNodes).map(describe),
          removed: Array.from(r.removedNodes).map(describe),
        });
      }
    });

    observer.observe(root, {
      subtree: true, // watch every descendant, not just root itself
      attributes: true, // attribute added / changed / removed
      attributeOldValue: true, // also record the value before the change
      childList: true, // elements inserted / removed
    });
  }, rootSelector);

  return {
    changes,
    waitFor(
      isDone: (changes: DomChange[]) => boolean,
      timeoutMs = 5000,
    ): Promise<DomChange[]> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              `watchDom: expected change not seen within ${timeoutMs}ms. ` +
                `Recorded: ${JSON.stringify(changes, null, 2)}`,
            ),
          );
        }, timeoutMs);

        const check = () => {
          if (isDone(changes)) {
            clearTimeout(timer);
            resolve(changes);
          }
        };
        onChange = check;
        check(); // the change might already have arrived
      });
    },
  };
}
