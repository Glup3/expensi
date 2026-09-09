import { test, expect } from "@playwright/test";

test("disabled save explains what is missing", async ({ page }) => {
  await page.goto("/vacations/new");
  await expect(page.getByText("Enter a vacation name to save.")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Japan");
  await page.getByRole("combobox").selectOption("JPY");
  await page.getByLabel("Rate", { exact: true }).fill("0");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByText("Enter an exchange rate greater than zero to save.")).toBeVisible();
  await page.getByLabel("Rate", { exact: true }).fill("0.0061");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});

test("failed saves remain on the form with an inline error and draft intact", async ({ page }) => {
  await page.goto("/vacations/new");
  await page.getByLabel("Name", { exact: true }).fill("Keep my draft");
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = function () {
      throw new DOMException("Test storage full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Could not save your changes. Please try again.",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Keep my draft");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});

test("failed imports show an inline error and allow retry", async ({ page }) => {
  await page.goto("/data");
  await page.locator('input[type="file"]').setInputFiles({
    name: "valid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "vacation,currency,rateToEur,name,category,amount,date\nTrip,EUR,1,Coffee,food,3,2026-01-01\n",
    ),
  });
  await expect(page.getByRole("heading", { name: "Confirm Import" })).toBeVisible();
  await expect(page.getByText(/Importing the same file again creates duplicates/)).toBeVisible();
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = function () {
      throw new DOMException("Test storage full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Could not import this file. No changes were made. Please try again.",
  );
  await expect(page.getByRole("button", { name: "Import", exact: true })).toBeEnabled();
});

test("data errors are inline and invalid imports cannot be confirmed", async ({ page }) => {
  await page.goto("/data");
  await expect(page.getByText(/not synced or backed up automatically/)).toBeVisible();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("Test download failure");
    };
  });
  await page.getByRole("button", { name: "Export all data", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Could not export your data. Please try again.");
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "vacation,currency,name,category,amount,date\nInvalid trip,EUR,Coffee,food,not-money,2026-01-01\n",
    ),
  });
  await expect(page.getByRole("heading", { name: "Confirm Import" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  await expect(page.getByText(/invalid amount/)).toBeVisible();
});
