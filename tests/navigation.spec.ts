import { test, expect, type Page } from "@playwright/test";

async function createVacation(page: Page, name = "Portugal") {
  await page.goto("/vacations");
  await page.getByRole("button", { name: "New vacation", exact: true }).click();
  await expect(page).toHaveURL(/\/vacations\/new$/);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function addExpense(page: Page) {
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      () => {
        document.documentElement.dataset.synchronousAmountFocus = String(
          document.activeElement?.getAttribute("aria-label") === "Amount",
        );
      },
      { once: true },
    );
  });
  await page.getByRole("button", { name: "New expense", exact: true }).click();
  // A later focus is insufficient for the iOS keyboard: the input must mount
  // and receive focus before the original tap finishes bubbling.
  await expect(page.locator("html")).toHaveAttribute("data-synchronous-amount-focus", "true");
  await expect(page).toHaveURL(/\/expenses\/new$/);
  await expect(page.getByLabel("Amount", { exact: true })).toBeFocused();
  await expect(page.locator(".amount-input + .amount-currency")).toHaveText("EUR");
  await page.getByLabel("Amount", { exact: true }).fill("12.50");
  await page.getByLabel("Amount", { exact: true }).press("Enter");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  const fieldOrder = await page
    .locator(".form-fields")
    .evaluate((form) =>
      Array.from(form.querySelectorAll('input, [role="group"], textarea')).map(
        (field) =>
          field.getAttribute("aria-label") ??
          (field.getAttribute("role") === "group"
            ? "Category"
            : field.closest("label")?.querySelector(".field-label")?.textContent),
      ),
    );
  expect(fieldOrder).toEqual(["Amount", "Name", "Category", "Date", "Notes"]);
  await page.getByLabel("Name", { exact: true }).fill("Lunch");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: /Lunch/ })).toBeVisible();
}

test("page routes create, reload, edit and confirm deletion", async ({ page }) => {
  const base = await createVacation(page);
  await expect(page.locator("dialog")).toHaveCount(0);
  await addExpense(page);
  await page.getByRole("button", { name: /Lunch/ }).click();
  await expect(page).toHaveURL(/\/expenses\/[^/]+\/edit$/);
  const editUrl = page.url();
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Lunch");
  await page.getByLabel("Amount", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${base}$`));
  await expect(page.getByRole("button", { name: /Lunch/ })).toContainText("20.00");
  await page.goto(editUrl);
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete “Lunch”?");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Delete Expense", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Lunch");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Expense", exact: true }).click();
  await expect(page.getByText("No expenses yet", { exact: true })).toBeVisible();
  await expect(page.locator(".toast-host")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Portugal updated");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Portugal updated", exact: true })).toBeVisible();
});

test("summary shows category EUR equivalents only for foreign currencies", async ({ page }) => {
  await createVacation(page);
  await addExpense(page);
  await page.getByRole("button", { name: "Summary", exact: true }).click();
  await expect(page.locator(".cat-row").filter({ hasText: "Food" })).not.toContainText("≈");

  await page.goto("/vacations/new");
  await page.getByLabel("Name", { exact: true }).fill("Japan");
  await page.getByRole("combobox").selectOption("JPY");
  await page.getByLabel("Rate", { exact: true }).fill("0.0061");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "New expense", exact: true }).click();
  await page.getByLabel("Amount", { exact: true }).fill("1000");
  await page.getByLabel("Name", { exact: true }).fill("Ramen");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Summary", exact: true }).click();
  const category = page.locator(".cat-row").filter({ hasText: "Food" });
  await expect(category.locator(".row-amount")).toContainText("1,000");
  await expect(category).toContainText("≈ €6.10");
});

test("back/forward, direct-link cancel, and missing-record recovery", async ({ page }) => {
  const base = await createVacation(page);
  await page.getByRole("button", { name: "Summary", exact: true }).click();
  await page.getByRole("button", { name: "New expense", exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/new$/);
  await page.goBack();
  await expect(page).toHaveURL(`${new URL(page.url()).origin}${base}?tab=summary`);
  await expect(page.getByText("Total spent", { exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "New Expense", exact: true })).toBeVisible();
  await page.goto(`${base}/edit`);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${base}$`));
  await page.goto("/vacations/missing/edit");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Go to vacations" }).click();
  await expect(page).toHaveURL(/\/vacations$/);
  await page.goto(`${base}/expenses/missing/edit`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/unknown");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("forms use document scrolling and keep actions reachable", async ({ page }) => {
  await page.goto("/vacations/new");
  await expect(page.getByRole("heading", { name: "New Vacation" })).toBeVisible();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 360 });
  await page.getByLabel("Name", { exact: true }).fill("Short viewport");
  await page.getByRole("combobox").selectOption("JPY");
  await page.getByLabel("Rate", { exact: true }).fill("0.006");
  await page.getByRole("button", { name: "Save", exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Short viewport", exact: true })).toBeVisible();
});

test("date input stays within the expense form on narrow screens", async ({ page }) => {
  await createVacation(page);
  await page.getByRole("button", { name: "New expense", exact: true }).click();
  const date = page.getByLabel("Date", { exact: true });
  await expect(date).toBeVisible();
  await date.fill("2026-12-31");
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 664 });
    for (const fontSize of [16, 24]) {
      await date.evaluate((input, size) => {
        input.style.fontSize = `${size}px`;
      }, fontSize);
      const bounds = await date.evaluate((input) => {
        const control = input.getBoundingClientRect();
        const field = input.closest("label")!.getBoundingClientRect();
        return {
          fits: control.left >= field.left && control.right <= field.right + 1,
          pageFits: document.documentElement.scrollWidth <= window.innerWidth,
          appearance: getComputedStyle(input).appearance,
        };
      });
      expect(bounds).toEqual({ fits: true, pageFits: true, appearance: "none" });
    }
  }
  await page.getByLabel("Amount", { exact: true }).fill("10");
  await page.getByLabel("Name", { exact: true }).fill("Date test");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: /Date test/ }).click();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-12-31");
});

test("data routes export and import CSV", async ({ page }) => {
  const base = await createVacation(page);
  await page.getByRole("button", { name: "Summary", exact: true }).click();
  await page.getByRole("button", { name: "Export / Import CSV" }).click();
  await expect(page).toHaveURL(`${new URL(page.url()).origin}${base}/data`);
  await page.reload();
  await expect(page.getByRole("button", { name: "Export “Portugal”" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.goto("/data");
  await page.locator('input[type="file"]').setInputFiles({
    name: "import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "vacation,currency,rateToEur,name,category,amount,date,notes\nPortugal,EUR,1,Coffee,food,3.50,2026-01-01,\n",
    ),
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page).toHaveURL(/\/vacations$/);
  await page.goto(base);
  await expect(page.getByRole("button", { name: /Coffee/ })).toBeVisible();
});

test("returning from a form restores list scroll position", async ({ page }) => {
  await page.goto("/data");
  const rows = Array.from(
    { length: 30 },
    (_, index) => `Trip ${index},EUR,1,Coffee,food,3,2026-01-01,`,
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "trips.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "vacation,currency,rateToEur,name,category,amount,date,notes\n" + rows.join("\n"),
    ),
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page).toHaveURL(/\/vacations$/);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.getByRole("button", { name: "New vacation", exact: true }).click();
  await expect(page).toHaveURL(/\/vacations\/new$/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/vacations$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700);
});

test("an expense cannot be edited under another vacation's URL", async ({ page }) => {
  await createVacation(page, "First");
  await addExpense(page);
  await page.getByRole("button", { name: /Lunch/ }).click();
  await expect(page).toHaveURL(/\/expenses\/[^/]+\/edit$/);
  const expenseId = new URL(page.url()).pathname.split("/").at(-2);
  const other = await createVacation(page, "Second");
  await page.goto(`${other}/expenses/${expenseId}/edit`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("cached PWA serves deep routes and saves expenses offline", async ({
  page,
  context,
  browserName,
}) => {
  // Playwright WebKit does not expose service worker support.
  test.skip(browserName !== "chromium", "Service worker coverage uses Chromium");
  const base = await createVacation(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto(`${base}/expenses/new`);
  await page.getByLabel("Amount", { exact: true }).fill("5");
  await page.getByLabel("Name", { exact: true }).fill("Offline snack");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: /Offline snack/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Offline snack/ })).toBeVisible();
});
