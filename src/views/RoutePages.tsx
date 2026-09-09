import { useLoaderData, useLocation, useNavigate } from "react-router-dom";
import type { vacationLoader, expenseLoader } from "../lib/loaders.ts";
import {
  createVacation,
  updateVacation,
  deleteVacation,
  getVacation,
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
} from "../db/repo.ts";
import { useToast } from "../components/toast-context.ts";
import VacationForm from "./VacationForm.tsx";
import ExpenseForm from "./ExpenseForm.tsx";
import DataView from "./DataView.tsx";
import { useReturnTo } from "../lib/useReturnTo.ts";

export function NewVacationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = useReturnTo("/vacations");
  const toast = useToast();
  return (
    <VacationForm
      onClose={close}
      onSave={async (input) => {
        const id = await createVacation(input);
        toast.show(`“${input.name}” created`);
        await navigate(`/vacations/${id}`, { replace: true, state: location.state });
      }}
    />
  );
}

export function EditVacationPage() {
  const vacation = useLoaderData<typeof vacationLoader>();
  const close = useReturnTo(`/vacations/${vacation.id}`);
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <VacationForm
      key={vacation.id}
      vacation={vacation}
      onClose={close}
      onSave={async (input) => {
        if (!(await updateVacation(vacation.id, input)))
          throw new Error("Vacation no longer exists");
        toast.show("Vacation updated");
        close();
      }}
      onDelete={async () => {
        if (
          !window.confirm(`Delete “${vacation.name}” and all its expenses? This cannot be undone.`)
        )
          return;
        await deleteVacation(vacation.id);
        toast.show("Vacation deleted");
        await navigate("/vacations", { replace: true });
      }}
    />
  );
}

export function ExpensePage() {
  const { vacation, expense } = useLoaderData<typeof expenseLoader>();
  const close = useReturnTo(`/vacations/${vacation.id}`);
  const toast = useToast();
  return (
    <ExpenseForm
      key={expense?.id ?? vacation.id}
      vacation={vacation}
      expense={expense}
      onClose={close}
      onSave={async (draft) => {
        if (!(await getVacation(vacation.id))) throw new Error("Vacation no longer exists");
        if (expense) {
          if (!(await updateExpense(expense.id, draft)))
            throw new Error("Expense no longer exists");
        } else await createExpense({ ...draft, vacationId: vacation.id });
        toast.show(expense ? "Expense updated" : "Expense added");
        close();
      }}
      onDelete={
        expense
          ? async () => {
              await deleteExpense(expense.id);
              toast.show("Expense deleted", {
                label: "Undo",
                run: () => {
                  void (async () => {
                    try {
                      if (!(await getVacation(expense.vacationId)))
                        throw new Error("Vacation no longer exists");
                      await restoreExpense(expense);
                    } catch {
                      toast.show("Could not restore expense");
                    }
                  })();
                },
              });
              close();
            }
          : undefined
      }
    />
  );
}

export function AllDataPage() {
  const close = useReturnTo("/vacations");
  return <DataView onClose={close} />;
}

export function VacationDataPage() {
  const vacation = useLoaderData<typeof vacationLoader>();
  const close = useReturnTo(`/vacations/${vacation.id}`);
  return <DataView key={vacation.id} vacation={vacation} onClose={close} />;
}
