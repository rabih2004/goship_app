import { test, expect } from "@playwright/test";

/**
 * Auth + role-redirect smoke tests against seeded dev accounts.
 * Run `npm run seed:dev` once before this suite.
 */

test.describe("authentication flow", () => {
  test("anonymous user sees the marketing landing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(
      page.getByRole("heading", {
        name: /compare sea-freight quotes/i,
      })
    ).toBeVisible();
  });

  test("locked-down route redirects unauthed user to sign-in", async ({
    page,
  }) => {
    await page.goto("/en/customer");
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test("customer signs in and lands on the customer dashboard", async ({
    page,
  }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel(/email/i).fill("customer@test.local");
    await page.getByLabel(/password/i).fill("Test1234!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Content-based wait — the role-redirect from /dashboard happens
    // server-side and may not surface as a load event Playwright sees.
    await expect(
      page.getByText("customer@test.local").first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/en\/customer\b/);
  });

  test("forwarder signs in and lands on forwarder dashboard with lane count", async ({
    page,
  }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel(/email/i).fill("forwarder@test.local");
    await page.getByLabel(/password/i).fill("Test1234!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText("Test Forwarders Ltd.").first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/en\/forwarder\b/);
    await expect(page.getByText(/active lanes/i).first()).toBeVisible();
  });

  test("admin lands on /admin and sees the revenue card", async ({ page }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel(/email/i).fill("admin@test.local");
    await page.getByLabel(/password/i).fill("Test1234!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/platform revenue/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/en\/admin\b/);
  });

  test("Arabic landing renders with RTL direction", async ({ page }) => {
    await page.goto("/ar");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
    await expect(page.getByText("منصة الشحن").first()).toBeVisible();
  });
});
