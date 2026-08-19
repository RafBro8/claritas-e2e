/**
 * A single, greppable place every spec reports progress through. This is
 * deliberately plain console.log (not Playwright's own step/annotation
 * APIs) because claritas-e2e streams raw stdout from `npx playwright test`
 * to a non-technical viewer — these lines are what they'll actually see.
 */
export function step(message: string): void {
  console.log(`[e2e] ${message}`);
}
