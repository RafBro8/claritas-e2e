import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { uniqueEmail, registerViaApi } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";

test.describe("auth", () => {
  test("a new customer can register through the UI and lands on the home page", async ({ page }) => {
    const email = uniqueEmail("customer");

    step(`Registering a new customer: ${email}`);
    await page.goto("/register");
    await page.getByLabel(/name/i).fill("Riley Customer");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill("supersecret1");
    // "Customer" is already selected by default — leave it.
    await page.getByRole("button", { name: /create account/i }).click();

    step("Verifying the nav shows the new account as logged in");
    await page.waitForURL("/");
    await expect(page.getByRole("link", { name: "Riley Customer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My bookings" })).toBeVisible();
  });

  test("a registered user can log in and log out", async ({ page }) => {
    step("Setting up a customer account via the API");
    const user = await registerViaApi("customer");

    await loginViaUi(page, user.email, user.password);
    await expect(page.getByRole("link", { name: user.name })).toBeVisible();

    step("Logging out");
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: user.name })).not.toBeVisible();
  });

  test("visiting a protected page while logged out redirects to login, then returns after signing in", async ({
    page,
  }) => {
    step("Setting up a customer account via the API");
    const user = await registerViaApi("customer");

    step("Visiting /account while logged out");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login$/);

    step("Logging in from the redirected login page");
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole("button", { name: /^log in$/i }).click();

    step("Verifying we landed back on /account, not the home page");
    await expect(page).toHaveURL("/account");
    await expect(page.getByText(user.email)).toBeVisible();
  });
});
