export function generateRunId(): string {
  const hash = Math.random().toString(16).slice(2, 6);
  return `run_${Date.now()}_${hash}`;
}
