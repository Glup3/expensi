import { db, newId, type Expense, type Vacation } from "./db.ts";
import { CATEGORIES, type Category } from "../lib/categories.ts";
import { toEurMinor } from "../lib/money.ts";

/* ---------------------------------- reads --------------------------------- */

export function listVacations(): Promise<Vacation[]> {
  return db.vacations.orderBy("createdAt").reverse().toArray();
}

export function getVacation(id: string): Promise<Vacation | undefined> {
  return db.vacations.get(id);
}

export function listExpenses(vacationId: string): Promise<Expense[]> {
  return db.expenses.where("vacationId").equals(vacationId).toArray();
}

/* --------------------------------- writes --------------------------------- */

export async function createVacation(input: Omit<Vacation, "id" | "createdAt">): Promise<string> {
  const id = newId();
  await db.vacations.add({ ...input, id, createdAt: Date.now() });
  return id;
}

export function updateVacation(
  id: string,
  changes: Partial<Omit<Vacation, "id" | "createdAt">>,
): Promise<number> {
  return db.vacations.update(id, changes);
}

/** Deletes a vacation and all of its expenses atomically. */
export function deleteVacation(id: string): Promise<void> {
  return db.transaction("rw", db.vacations, db.expenses, async () => {
    await db.expenses.where("vacationId").equals(id).delete();
    await db.vacations.delete(id);
  });
}

export async function createExpense(input: Omit<Expense, "id">): Promise<string> {
  const id = newId();
  await db.expenses.add({ ...input, id });
  return id;
}

export function updateExpense(
  id: string,
  changes: Partial<Omit<Expense, "id" | "vacationId">>,
): Promise<number> {
  return db.expenses.update(id, changes);
}

export function deleteExpense(id: string): Promise<void> {
  return db.expenses.delete(id);
}

/* -------------------------------- summaries ------------------------------- */

export interface CategoryTotal {
  category: Category;
  totalMinor: number;
  count: number;
  share: number;
}

export interface VacationSummary {
  totalMinor: number;
  totalEurMinor: number;
  count: number;
  byCategory: CategoryTotal[];
}

export function summarize(expenses: Expense[], vacation: Vacation): VacationSummary {
  const totals = new Map<Category, { totalMinor: number; count: number }>();
  let totalMinor = 0;

  for (const expense of expenses) {
    totalMinor += expense.amountMinor;
    const entry = totals.get(expense.category) ?? { totalMinor: 0, count: 0 };
    entry.totalMinor += expense.amountMinor;
    entry.count += 1;
    totals.set(expense.category, entry);
  }

  const byCategory: CategoryTotal[] = CATEGORIES.map((c) => c.id)
    .filter((id) => totals.has(id))
    .map((category) => {
      const entry = totals.get(category)!;
      return {
        category,
        totalMinor: entry.totalMinor,
        count: entry.count,
        share: totalMinor === 0 ? 0 : entry.totalMinor / totalMinor,
      };
    })
    .sort((a, b) => b.totalMinor - a.totalMinor);

  return {
    totalMinor,
    totalEurMinor: toEurMinor(totalMinor, vacation.currency, vacation.rateToEur),
    count: expenses.length,
    byCategory,
  };
}

/** Group expenses by ISO date, newest date first. */
export function groupByDate(expenses: Expense[]): { date: string; items: Expense[] }[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const list = groups.get(expense.date);
    if (list) list.push(expense);
    else groups.set(expense.date, [expense]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.amountMinor - a.amountMinor),
    }));
}
