import type { LoaderFunctionArgs } from "react-router-dom";
import { db } from "../db/db.ts";
import { getVacation, listExpenses } from "../db/repo.ts";

export async function vacationLoader({ params }: LoaderFunctionArgs) {
  const vacation = await getVacation(params.vacationId!);
  if (!vacation) throw new Response("Vacation not found", { status: 404 });
  return vacation;
}

export async function detailLoader(args: LoaderFunctionArgs) {
  const vacation = await vacationLoader(args);
  return { vacation, expenses: await listExpenses(vacation.id) };
}

export async function expenseLoader(args: LoaderFunctionArgs) {
  const vacation = await vacationLoader(args);
  const expense = args.params.expenseId ? await db.expenses.get(args.params.expenseId) : undefined;
  if (args.params.expenseId && (!expense || expense.vacationId !== vacation.id)) {
    throw new Response("Expense not found", { status: 404 });
  }
  return { vacation, expense };
}
