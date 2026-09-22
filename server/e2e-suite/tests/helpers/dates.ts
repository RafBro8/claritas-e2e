export interface DateOffset {
  iso: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday), matches the backend's convention
}

/**
 * The timezone this suite runs in. The browser Playwright launches uses the
 * same one, and test providers are given it too (see setProviderWorkingHours),
 * so provider, customer, and these dates all share one calendar.
 */
export const RUNNER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A day on the local calendar, `days` from today - the same calendar the app's date picker uses. */
export function daysFromNow(days: number): DateOffset {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { iso: `${date.getFullYear()}-${month}-${day}`, dayOfWeek: date.getDay() };
}
