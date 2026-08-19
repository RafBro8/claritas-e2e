import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { setupProviderWithService, registerViaApi, uniqueName } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";
import { daysFromNow } from "./helpers/dates";
import { API_URL } from "./helpers/constants";

test("only one of two simultaneous booking attempts for the same slot succeeds", async ({ browser }) => {
  // Deliberately not "today": if this test happens to run near the UTC day
  // boundary, "today" can have zero slots left (all already in the past),
  // which isn't what this test is checking. A day out sidesteps that
  // entirely since none of tomorrow's slots can ever be in the past yet.
  const bookingDate = daysFromNow(1);
  const providerName = uniqueName("Race Condition Provider");

  step("Setting up a provider with wide-open hours tomorrow and one service");
  const { provider, service } = await setupProviderWithService({
    dayOfWeek: bookingDate.dayOfWeek,
    providerName,
    serviceName: "Contested Slot Service",
  });

  step("Registering two customers who will race for the same slot");
  const customerA = await registerViaApi("customer");
  const customerB = await registerViaApi("customer");

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await loginViaUi(pageA, customerA.email, customerA.password);
    await loginViaUi(pageB, customerB.email, customerB.password);

    step("Both customers navigate to the same provider, service, and date");
    for (const page of [pageA, pageB]) {
      await page.goto(`/providers/${provider.id}`);
      await page.getByRole("button", { name: new RegExp(service.name) }).click();
      await page.locator('input[type="date"]').fill(bookingDate.iso);
    }

    const slotsA = pageA.locator("main button[aria-pressed]");
    const slotsB = pageB.locator("main button[aria-pressed]");
    await slotsA.first().waitFor();
    await slotsB.first().waitFor();

    step("Both customers select the exact same slot");
    await slotsA.first().click();
    await slotsB.first().click();

    const outcomeA = pageA.getByText(/^Booked!/).or(pageA.getByText(/not available|just booked by someone else/i));
    const outcomeB = pageB.getByText(/^Booked!/).or(pageB.getByText(/not available|just booked by someone else/i));

    step("Firing both booking confirmations at the same instant");
    await Promise.all([
      pageA.getByRole("button", { name: /confirm booking/i }).click(),
      pageB.getByRole("button", { name: /confirm booking/i }).click(),
    ]);
    await Promise.all([expect(outcomeA).toBeVisible(), expect(outcomeB).toBeVisible()]);

    step("Checking exactly one customer won the slot and the other got a conflict error");
    const aBooked = await pageA.getByText(/^Booked!/).isVisible();
    const bBooked = await pageB.getByText(/^Booked!/).isVisible();
    expect([aBooked, bBooked].filter(Boolean)).toHaveLength(1);

    const winner = aBooked ? customerA : customerB;

    step("Confirming via the API that exactly one booked appointment exists for this slot");
    const meRes = await fetch(`${API_URL}/bookings/mine`, {
      headers: { Cookie: winner.cookie },
    });
    const { appointments } = (await meRes.json()) as { appointments: { providerId: unknown; status: string }[] };
    const bookedForThisProvider = appointments.filter((a) => a.status === "booked");
    expect(bookedForThisProvider).toHaveLength(1);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
