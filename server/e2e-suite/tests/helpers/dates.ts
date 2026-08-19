export interface DateOffset {
  iso: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sunday) – 6 (Saturday), matches the backend's convention
}

export function daysFromNow(days: number): DateOffset {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return { iso: date.toISOString().slice(0, 10), dayOfWeek: date.getUTCDay() };
}
