import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { registerViaApi, uniqueName } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";
import { daysFromNow } from "./helpers/dates";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test("a provider can configure hours and services through the dashboard, and the resulting availability is correct", async ({
  page,
}) => {
  const target = daysFromNow(5);
  const providerName = uniqueName("Dr. Availability Test");

  step("Registering a provider account and logging in");
  const provider = await registerViaApi("provider", { name: providerName });
  await loginViaUi(page, provider.email, provider.password);

  step("Opening the provider dashboard's Availability tab");
  await page.goto("/provider/dashboard");
  await page.getByRole("button", { name: "Availability" }).click();

  step(`Adding a 2-hour working-hours block on ${DAY_NAMES[target.dayOfWeek]}`);
  await page.getByRole("button", { name: /add working hours block/i }).click();
  await page.locator("select").selectOption(String(target.dayOfWeek));
  const timeInputs = page.locator('input[type="time"]');
  await timeInputs.nth(0).fill("13:00");
  await timeInputs.nth(1).fill("15:00");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  step("Switching to the Services tab and adding a 60-minute service");
  await page.getByRole("button", { name: "Services" }).click();
  await page.getByPlaceholder("Name").fill("Deep Tissue Massage");
  await page.getByLabel(/duration \(min\)/i).fill("60");
  await page.getByLabel(/price/i).fill("120");
  await page.getByRole("button", { name: /^add service$/i }).click();
  await expect(page.getByText("Deep Tissue Massage")).toBeVisible();

  step("Viewing the provider's public page and checking the availability grid matches");
  await page.goto(`/providers/${provider.id}`);
  await page.getByRole("button", { name: /Deep Tissue Massage/ }).click();
  await page.locator('input[type="date"]').fill(target.iso);

  const slotButtons = page.locator("main button[aria-pressed]");
  await slotButtons.first().waitFor();
  // A 2-hour window (13:00-15:00) with a 60-minute service should produce
  // exactly two slots — a real, timezone-agnostic proof the configured
  // hours took effect, rather than eyeballing displayed clock times (which
  // render in the browser's local timezone, not fixed UTC labels).
  await expect(slotButtons).toHaveCount(2);
});
