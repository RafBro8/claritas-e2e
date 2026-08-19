import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { setupProviderWithService, registerViaApi, uniqueName } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";
import { daysFromNow } from "./helpers/dates";

test("a customer can browse, book an appointment, and see it in My Bookings", async ({ page }) => {
  // Deliberately not "today": if this test happens to run near the UTC day
  // boundary, "today" can have zero slots left (all already in the past),
  // which isn't what this test is checking. A day out sidesteps that
  // entirely since none of tomorrow's slots can ever be in the past yet.
  const bookingDate = daysFromNow(1);
  const providerName = uniqueName("Career Coach");

  step("Setting up a provider with wide-open hours tomorrow and one service");
  const { provider, service } = await setupProviderWithService({
    dayOfWeek: bookingDate.dayOfWeek,
    providerName,
    serviceName: "Career Coaching Session",
    durationMinutes: 30,
    price: 75,
  });

  step("Setting up and logging in a customer");
  const customer = await registerViaApi("customer");
  await loginViaUi(page, customer.email, customer.password);

  step(`Searching for provider "${providerName}" on the browse page`);
  await page.goto("/providers");
  await page.getByPlaceholder(/search by name/i).fill(providerName);
  await page.getByRole("link").filter({ hasText: providerName }).click();

  step("Selecting the service and the target date");
  await expect(page.getByRole("heading", { name: providerName })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(service.name) }).click();
  await page.locator('input[type="date"]').fill(bookingDate.iso);

  step("Picking the first available slot");
  const slotButtons = page.locator("main button[aria-pressed]");
  await expect(slotButtons.first()).toBeVisible();
  await slotButtons.first().click();

  step("Confirming the booking");
  await expect(page.getByText(new RegExp(`Book ${service.name}`))).toBeVisible();
  await page.getByRole("button", { name: /confirm booking/i }).click();
  await expect(page.getByText(/^Booked!/)).toBeVisible();

  step("Following the link to My Bookings and verifying the booking is there");
  await page.getByRole("link", { name: /view my bookings/i }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  // Scoped to the <li> row specifically (not a bare page-wide getByText) so
  // this can't accidentally match the service-selector button or the
  // "Booked!" banner from the previous page during the SPA transition.
  const bookingRow = page.locator("li").filter({ hasText: service.name });
  await expect(bookingRow).toBeVisible();
  await expect(bookingRow).toContainText(providerName);
  // The status badge is styled capitalized via CSS only — the actual DOM
  // text is lowercase ("booked"), so this must match case-insensitively.
  await expect(bookingRow.getByText(/^booked$/i)).toBeVisible();
});
