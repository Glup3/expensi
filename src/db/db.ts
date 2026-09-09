import Dexie, { type EntityTable } from "dexie";
import type { Category } from "../lib/categories.ts";

export interface Vacation {
  id: string;
  name: string;
  /** ISO 4217 code, single currency per vacation. */
  currency: string;
  /** Manual, one-time conversion rate into EUR. 1 for EUR vacations. */
  rateToEur: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  vacationId: string;
  name: string;
  category: Category;
  /** Integer minor units of the vacation's currency. */
  amountMinor: number;
  /** "YYYY-MM-DD" */
  date: string;
  notes?: string;
}

const db = new Dexie("expense-tracker") as Dexie & {
  vacations: EntityTable<Vacation, "id">;
  expenses: EntityTable<Expense, "id">;
};

db.version(1).stores({
  vacations: "id, name, createdAt",
  expenses: "id, vacationId, date, category, [vacationId+date]",
});

export { db };

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
