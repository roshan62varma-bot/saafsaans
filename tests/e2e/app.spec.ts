import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Fails the test on any console error, including Content-Security-Policy violations. */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

async function openSampleDashboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample Delhi family" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your smog-season plan" }),
  ).toBeVisible();
  await expect(page.getByText("AQI (CPCB)")).toBeVisible();
}

test.describe("setup", () => {
  test("loads cleanly with no console or CSP errors and no accessibility violations", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Protect your family from winter smog",
    );
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });

  test("skip link is the first tab stop and moves focus to main content", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("shows an accessible error summary when required details are missing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Name or nickname" }).fill("");
    await page.getByRole("button", { name: "Build my family's plan" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "Please fix" });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Choose your city or use your current location");
    await summary.getByRole("link", { name: /Name:/ }).click();
    await expect(page.getByRole("textbox", { name: "Name or nickname" })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Name or nickname" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expectNoA11yViolations(page);
  });

  test("builds a household from a city search", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "City or town" }).fill("Pune");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("radio", { name: /^Pune, Maharashtra/ }).check();
    await page.getByRole("button", { name: "+ Add a person" }).click();
    await page.getByRole("textbox", { name: "Name or nickname" }).nth(1).fill("Riya");
    await page.getByRole("combobox", { name: "Age group" }).nth(1).selectOption("child");
    await page.locator("label", { hasText: "Asthma" }).nth(1).click();
    await page.getByRole("combobox", { name: /Main way you travel/ }).selectOption("two_wheeler");
    await page.getByRole("button", { name: "Build my family's plan" }).click();
    await expect(page.getByText(/Pune · 2 people/)).toBeVisible();
  });
});

test.describe("dashboard", () => {
  test("shows live air, a quantified plan and passes accessibility checks", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await openSampleDashboard(page);
    await expect(page.getByText(/Breathing this air all day is like smoking/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your day, step by step" })).toBeVisible({
      timeout: 40_000,
    });
    await expect(page.getByText(/^Impact:/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Priya" })).toBeVisible();
    await page.getByText("Show forecast as a table").click();
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });

  test("impact calculator responds to choices", async ({ page }) => {
    await openSampleDashboard(page);
    const impact = page.locator("#impact");
    await impact.getByRole("combobox", { name: "I could switch to" }).selectOption("metro");
    await expect(impact.getByText(/Switching from petrol car to metro saves/)).toBeVisible();
    await impact.locator("label", { hasText: "Use an inverter battery" }).click();
    await expect(impact.getByText(/Your pledges keep about \d+ g of PM2.5/)).toBeVisible();
  });

  test("writes a community advisory in Hindi", async ({ page }) => {
    await openSampleDashboard(page);
    const community = page.locator("#community");
    await community.locator("label", { hasText: "School" }).click();
    await community.locator("label", { hasText: "हिन्दी" }).click();
    await community.getByRole("button", { name: "Write advisory" }).click();
    const text = community.locator("p[lang='hi']");
    await expect(text).toContainText("AQI");
    await expect(community.getByRole("link", { name: /Share on WhatsApp/ })).toHaveAttribute(
      "rel",
      /noopener/,
    );
  });

  test("lets people edit their household", async ({ page }) => {
    await openSampleDashboard(page);
    await page.getByRole("button", { name: "Edit household" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit your household" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Your smog-season plan" }),
    ).toBeVisible();
  });
});
