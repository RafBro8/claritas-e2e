export interface Spec {
  /** Filename without extension — what gets passed to `npx playwright test <id>`. */
  id: string;
  fileName: string;
  /** Human-readable title: the spec's top-level describe() block if it has one, else derived from the filename. */
  title: string;
}
