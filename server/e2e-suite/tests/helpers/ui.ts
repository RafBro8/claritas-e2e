import type { Page } from "@playwright/test";
import { step } from "./log";

export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  step(`Logging in as ${email}`);
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL("/");
}

/**
 * Navigates straight to a provider by id (not via search) and books the
 * first open slot on the given date.
 *
 * `dateIso` also accepts a list of candidate dates, tried in order and
 * falling through to the next one if a date has no open slots. This exists
 * for callers that need "the soonest available slot" rather than a
 * specific day — e.g. today's slots can legitimately run out near the UTC
 * day boundary (they're all in the past by the time the test runs), and
 * the actual soonest slot rolls over to tomorrow.
 */
export async function bookFirstAvailableSlot(
  page: Page,
  providerId: string,
  serviceName: string,
  dateIso: string | string[],
): Promise<void> {
  const candidates = Array.isArray(dateIso) ? dateIso : [dateIso];
  step(`Booking the first available slot for "${serviceName}" on one of: ${candidates.join(", ")}`);
  await page.goto(`/providers/${providerId}`);
  await page.getByRole("button", { name: new RegExp(serviceName) }).click();

  const slotButtons = page.locator("main button[aria-pressed]");
  const noSlotsMessage = page.getByText(/no open times on this day/i);
  let found = false;

  for (const candidate of candidates) {
    await page.locator('input[type="date"]').fill(candidate);
    await Promise.race([slotButtons.first().waitFor(), noSlotsMessage.waitFor()]);
    if (await slotButtons.first().isVisible()) {
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error(`No available slots for "${serviceName}" on any of: ${candidates.join(", ")}`);
  }

  await slotButtons.first().click();
  await page.getByRole("button", { name: /confirm booking/i }).click();
  await page.getByText(/^Booked!/).waitFor();
}
