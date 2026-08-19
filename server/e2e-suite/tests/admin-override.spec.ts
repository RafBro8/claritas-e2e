import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { setupProviderWithService, registerViaApi, uniqueName } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";
import { daysFromNow } from "./helpers/dates";
import { API_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./helpers/constants";

test("an admin can cancel any booking on the platform as an override", async ({ page }) => {
  const target = daysFromNow(6);
  const providerName = uniqueName("Admin Override Provider");

  step("Setting up a provider, service, and a booked appointment via the API");
  const { provider, service } = await setupProviderWithService({
    dayOfWeek: target.dayOfWeek,
    providerName,
    serviceName: "Legal Consultation",
  });
  const customer = await registerViaApi("customer");

  // Discover a real open slot via the API rather than assuming one, since
  // this test's setup deliberately doesn't go through the booking UI at all
  // — the booking flow itself is already covered by booking-flow.spec.ts.
  const availabilityRes = await fetch(
    `${API_URL}/providers/${provider.id}/availability?serviceId=${service.id}&date=${target.iso}`,
  );
  const { slots } = (await availabilityRes.json()) as { slots: { startTime: string }[] };
  expect(slots.length).toBeGreaterThan(0);

  const bookRes = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: customer.cookie },
    body: JSON.stringify({ providerId: provider.id, serviceId: service.id, startTime: slots[0].startTime }),
  });
  expect(bookRes.ok).toBe(true);

  step("Logging in as the seeded e2e admin");
  await loginViaUi(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

  step("Opening the admin dashboard and finding this test's booking");
  await page.goto("/admin/dashboard");
  // Specs run in parallel against a shared database, so the admin dashboard
  // can show bookings from other concurrently-running specs too — scope
  // everything to this test's own row via its unique provider name.
  const row = page.locator("li").filter({ hasText: providerName });
  await expect(row).toBeVisible();
  await expect(row).toContainText(customer.name);

  step("Cancelling it as an admin override");
  await row.getByRole("button", { name: /cancel \(admin override\)/i }).click();
  await row.getByRole("button", { name: /confirm cancellation/i }).click();

  step("Verifying the row now shows Cancelled");
  // The status badge is styled capitalized via CSS only — the actual DOM
  // text is lowercase ("cancelled"), so this must match case-insensitively.
  await expect(row.getByText(/^cancelled$/i)).toBeVisible();
});
