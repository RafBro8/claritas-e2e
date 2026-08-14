import type { FailureAnalysis, FailureCategory, HealthProbe, RunCounts } from "../types";

interface FailureRule {
  pattern: RegExp;
  category: Exclude<FailureCategory, "unknown">;
  weight: number;
  /** Plain-English reason shown verbatim in the badge tooltip. */
  label: string;
}

// A conservative, explainable, rules-based classifier — no ML. Every
// contributing rule is surfaced in `signals[]` so a human can see exactly
// why a category was chosen, rather than trusting a black box.
const RULES: FailureRule[] = [
  // Environment signals: the app/network/infra was the problem, not the test.
  { pattern: /net::ERR_/i, category: "environment", weight: 3, label: "Network error reaching the app (net::ERR_*)" },
  {
    pattern: /ECONNREFUSED|ECONNRESET|EAI_AGAIN|ENOTFOUND/i,
    category: "environment",
    weight: 3,
    label: "Connection refused/reset — the server may have been unreachable",
  },
  { pattern: /certificate|SSL|TLS/i, category: "environment", weight: 2, label: "SSL/TLS certificate error" },
  {
    pattern: /page\.goto:[^\n]*Timeout/i,
    category: "environment",
    weight: 2,
    label: "Navigation timed out loading a page",
  },
  {
    pattern: /401 Unauthorized|403 Forbidden/i,
    category: "environment",
    weight: 1,
    label: "Auth failure talking to the app",
  },
  { pattern: /\b5\d{2}\b.*(error|internal server)/i, category: "environment", weight: 2, label: "Server returned a 5xx error" },
  { pattern: /proxy/i, category: "environment", weight: 1, label: "Proxy-related error" },
  {
    pattern: /Timed out waiting[^\n]*(from config\.webServer|for.*server)/i,
    category: "environment",
    weight: 3,
    label: "The local dev server never became healthy in time",
  },

  // UI-change signals: the app's markup/behavior changed and the spec needs updating.
  {
    pattern: /locator resolved to 0 elements|expected to be visible|element\(s\) not found/i,
    category: "ui-change",
    weight: 3,
    label: "A locator didn't resolve to any element",
  },
  {
    pattern: /strict mode violation/i,
    category: "ui-change",
    weight: 2,
    label: "A locator matched more than one element (strict mode violation)",
  },
  {
    pattern: /element is not attached to the DOM|element is detached/i,
    category: "ui-change",
    weight: 2,
    label: "An element was detached from the DOM mid-interaction",
  },
  {
    pattern: /expect\(.*\)\.(toHaveText|toContainText|toBeVisible|toHaveValue|toHaveURL)/,
    category: "ui-change",
    weight: 1,
    label: "A visible-content assertion failed",
  },
];

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export interface ClassifyFailureParams {
  output: string;
  specCount: number;
  failedSpecCount: number;
  counts: RunCounts;
  health: HealthProbe;
}

export function classifyFailure(params: ClassifyFailureParams): FailureAnalysis {
  const clean = stripAnsi(params.output);
  const scores: Record<"ui-change" | "environment", number> = { "ui-change": 0, environment: 0 };
  const signals: string[] = [];

  for (const rule of RULES) {
    if (rule.pattern.test(clean)) {
      scores[rule.category] += rule.weight;
      signals.push(rule.label);
    }
  }

  // Blast radius: every selected spec failing together points at the
  // environment; exactly one spec failing among several passing siblings
  // points at that spec needing an update.
  if (params.specCount > 1) {
    if (params.failedSpecCount === params.specCount) {
      scores.environment += 2;
      signals.push("Every selected spec failed together — points at the environment rather than one spec");
    } else if (params.failedSpecCount === 1) {
      scores["ui-change"] += 1;
      signals.push("Only one spec failed while its siblings passed — points at that spec needing an update");
    }
  }

  if (params.counts.flaky > 0) {
    signals.push(`${params.counts.flaky} test(s) passed on retry (flaky) — treat this result with caution`);
    return { category: "unknown", confidence: 0.3, signals };
  }

  if (params.health.ok === false) {
    scores.environment += 3;
    signals.push("The environment was unreachable or unhealthy before this run even started");
  }

  const total = scores["ui-change"] + scores.environment;
  if (total === 0) {
    return {
      category: "unknown",
      confidence: 0,
      signals: signals.length ? signals : ["No clear signal in the output — worth a human look"],
    };
  }
  if (scores["ui-change"] === scores.environment) {
    return { category: "unknown", confidence: 0.2, signals };
  }

  const category: FailureCategory = scores["ui-change"] > scores.environment ? "ui-change" : "environment";
  const winningScore = Math.max(scores["ui-change"], scores.environment);
  const confidence = Math.round(Math.min(1, winningScore / (total + 2)) * 100) / 100;

  return { category, confidence, signals };
}
