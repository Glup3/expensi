import type { Expense, Vacation } from "../db/db.ts";
import { parseCategory } from "./categories.ts";
import { isIsoDate } from "./date.ts";
import { minorToInputString, parseAmountToMinor } from "./money.ts";

export const CSV_HEADER = [
  "vacation",
  "currency",
  "rateToEur",
  "name",
  "category",
  "amount",
  "date",
  "notes",
] as const;

/* --------------------------------- export --------------------------------- */

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildCsv(vacations: Vacation[], expenses: Expense[]): string {
  const byId = new Map(vacations.map((v) => [v.id, v]));
  const rows: string[] = [CSV_HEADER.join(",")];

  const sorted = [...expenses].sort((a, b) =>
    a.vacationId === b.vacationId
      ? a.date.localeCompare(b.date)
      : a.vacationId.localeCompare(b.vacationId),
  );

  for (const expense of sorted) {
    const vacation = byId.get(expense.vacationId);
    if (!vacation) continue;
    rows.push(
      [
        vacation.name,
        vacation.currency,
        String(vacation.rateToEur),
        expense.name,
        expense.category,
        minorToInputString(expense.amountMinor, vacation.currency),
        expense.date,
        expense.notes ?? "",
      ]
        .map(escapeCell)
        .join(","),
    );
  }

  // Vacations without expenses would otherwise be lost on a full backup.
  for (const vacation of vacations) {
    if (expenses.some((e) => e.vacationId === vacation.id)) continue;
    rows.push(
      [vacation.name, vacation.currency, String(vacation.rateToEur), "", "", "", "", ""]
        .map(escapeCell)
        .join(","),
    );
  }

  return `${rows.join("\r\n")}\r\n`;
}

/* --------------------------------- import --------------------------------- */

/** Minimal RFC-4180 style parser: handles quotes, embedded commas and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  const input = text.replace(/^\uFEFF/, "");

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += char;
    i += 1;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ParsedCsvRow {
  vacationName: string;
  currency: string;
  rateToEur: number;
  name: string;
  category: ReturnType<typeof parseCategory>;
  amountRaw: string;
  date: string;
  notes: string;
}

export interface CsvPreview {
  rows: ParsedCsvRow[];
  vacationNames: string[];
  expenseCount: number;
  errors: string[];
}

export function analyzeCsv(text: string): CsvPreview {
  const table = parseCsv(text);
  const errors: string[] = [];

  if (table.length === 0) {
    return { rows: [], vacationNames: [], expenseCount: 0, errors: ["File is empty."] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const index = (key: string) => header.indexOf(key.toLowerCase());
  const iVacation = index("vacation");
  const iCurrency = index("currency");

  if (iVacation === -1 || iCurrency === -1) {
    return {
      rows: [],
      vacationNames: [],
      expenseCount: 0,
      errors: [`Missing required columns. Expected header: ${CSV_HEADER.join(", ")}`],
    };
  }

  const iRate = index("rateToEur");
  const iName = index("name");
  const iCategory = index("category");
  const iAmount = index("amount");
  const iDate = index("date");
  const iNotes = index("notes");

  const cell = (row: string[], i: number) => (i === -1 ? "" : (row[i] ?? "").trim());
  const rows: ParsedCsvRow[] = [];
  const vacationNames: string[] = [];

  table.slice(1).forEach((raw, n) => {
    const line = n + 2;
    const vacationName = cell(raw, iVacation);
    if (vacationName === "") {
      errors.push(`Line ${line}: missing vacation name.`);
      return;
    }

    const currency = cell(raw, iCurrency).toUpperCase() || "EUR";
    const rateRaw = cell(raw, iRate).replace(",", ".");
    const rate = rateRaw === "" ? (currency === "EUR" ? 1 : 0) : Number(rateRaw);

    if (!vacationNames.includes(vacationName)) vacationNames.push(vacationName);

    const amountRaw = cell(raw, iAmount);
    const name = cell(raw, iName);

    // Vacation-only row (no expense payload) — valid, creates the vacation.
    if (amountRaw === "" && name === "") {
      rows.push({
        vacationName,
        currency,
        rateToEur: Number.isFinite(rate) ? rate : 0,
        name: "",
        category: undefined,
        amountRaw: "",
        date: "",
        notes: "",
      });
      return;
    }

    const category = parseCategory(cell(raw, iCategory));
    const date = cell(raw, iDate);

    if (parseAmountToMinor(amountRaw, currency) === undefined) {
      errors.push(`Line ${line}: invalid amount "${amountRaw}".`);
      return;
    }
    if (!isIsoDate(date)) {
      errors.push(`Line ${line}: invalid date "${date}" (expected YYYY-MM-DD).`);
      return;
    }

    rows.push({
      vacationName,
      currency,
      rateToEur: Number.isFinite(rate) ? rate : 0,
      name: name || "Expense",
      category: category ?? "other",
      amountRaw,
      date,
      notes: cell(raw, iNotes),
    });
  });

  return {
    rows,
    vacationNames,
    expenseCount: rows.filter((r) => r.amountRaw !== "").length,
    errors,
  };
}
