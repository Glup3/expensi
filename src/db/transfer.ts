import { db, newId, type Vacation } from "./db.ts";
import { analyzeCsv, buildCsv, type CsvPreview } from "../lib/csv.ts";
import { parseAmountToMinor } from "../lib/money.ts";
import { listExpenses, listVacations } from "./repo.ts";

/* --------------------------------- export --------------------------------- */

export async function exportCsv(vacationId?: string): Promise<string> {
  const vacations = await listVacations();
  if (vacationId) {
    const vacation = vacations.find((v) => v.id === vacationId);
    if (!vacation) return buildCsv([], []);
    return buildCsv([vacation], await listExpenses(vacationId));
  }
  return buildCsv(vacations, await db.expenses.toArray());
}

export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give Safari a moment before revoking, otherwise the download can abort.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function csvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "expenses"}-${stamp}.csv`;
}

/* --------------------------------- import --------------------------------- */

export interface ImportResult {
  vacationsCreated: number;
  expensesImported: number;
}

export function previewImport(text: string): CsvPreview {
  return analyzeCsv(text);
}

/**
 * Applies a parsed CSV. Vacations are matched by name (case-insensitive);
 * missing ones are created. Expenses are always appended as new rows.
 */
export async function applyImport(preview: CsvPreview): Promise<ImportResult> {
  if (preview.rows.length === 0) return { vacationsCreated: 0, expensesImported: 0 };

  return db.transaction("rw", db.vacations, db.expenses, async () => {
    const existing = await db.vacations.toArray();
    const byName = new Map(existing.map((v) => [v.name.trim().toLowerCase(), v]));
    let vacationsCreated = 0;
    let expensesImported = 0;

    for (const row of preview.rows) {
      const key = row.vacationName.trim().toLowerCase();
      let vacation = byName.get(key);

      if (!vacation) {
        const created: Vacation = {
          id: newId(),
          name: row.vacationName,
          currency: row.currency,
          rateToEur: row.rateToEur,
          createdAt: Date.now(),
        };
        await db.vacations.add(created);
        byName.set(key, created);
        vacation = created;
        vacationsCreated += 1;
      }

      if (row.amountRaw === "" || !row.category) continue;

      const amountMinor = parseAmountToMinor(row.amountRaw, vacation.currency);
      if (amountMinor === undefined) continue;

      await db.expenses.add({
        id: newId(),
        vacationId: vacation.id,
        name: row.name,
        category: row.category,
        amountMinor,
        date: row.date,
        notes: row.notes || undefined,
      });
      expensesImported += 1;
    }

    return { vacationsCreated, expensesImported };
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}
