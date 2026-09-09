import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import SegmentedControl from "../components/SegmentedControl.tsx";
import { useToast } from "../components/toast-context.ts";
import { categoryInfo } from "../lib/categories.ts";
import { formatEur, formatMoney } from "../lib/money.ts";
import { formatDateHeading } from "../lib/date.ts";
import {
  createExpense,
  deleteExpense,
  deleteVacation,
  getVacation,
  groupByDate,
  listExpenses,
  restoreExpense,
  summarize,
  updateExpense,
  updateVacation,
} from "../db/repo.ts";
import type { Expense } from "../db/db.ts";
import ExpenseSheet from "./ExpenseSheet.tsx";
import VacationSheet from "./VacationSheet.tsx";
import DataSheet from "./DataSheet.tsx";

type Tab = "expenses" | "summary";

interface VacationDetailViewProps {
  vacationId: string;
  onBack: () => void;
}

export default function VacationDetailView({ vacationId, onBack }: VacationDetailViewProps) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("expenses");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showVacationEdit, setShowVacationEdit] = useState(false);
  const [showData, setShowData] = useState(false);

  const vacation = useLiveQuery(
    async () => (await getVacation(vacationId)) ?? null,
    [vacationId],
    undefined,
  );
  const expenses = useLiveQuery(() => listExpenses(vacationId), [vacationId], undefined);

  if (!vacation) {
    return (
      <div className="screen">
        <div className="navbar">
          <button type="button" className="navbar-action" onClick={onBack}>
            ← Vacations
          </button>
        </div>
        <p role="status">
          {vacation === undefined ? "Loading vacation…" : "This vacation no longer exists."}
        </p>
      </div>
    );
  }

  const summary = summarize(expenses ?? [], vacation);
  const groups = groupByDate(expenses ?? []);

  async function removeExpense(expense: Expense) {
    await deleteExpense(expense.id);
    toast.show("Expense deleted", {
      label: "Undo",
      run: () => void restoreExpense(expense),
    });
  }

  return (
    <div className="screen">
      <div className="navbar">
        <button type="button" className="navbar-action" onClick={onBack}>
          <span aria-hidden="true">‹</span> Vacations
        </button>
        <div className="navbar-title">{vacation.name}</div>
        <button
          type="button"
          className="navbar-action navbar-action--right"
          onClick={() => setShowVacationEdit(true)}
        >
          Edit
        </button>
      </div>

      <div className="large-title-wrap">
        <h1 className="large-title">{vacation.name}</h1>
      </div>

      <div className="screen-body">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "expenses", label: "Expenses" },
            { value: "summary", label: "Summary" },
          ]}
        />

        {tab === "expenses" ? (
          expenses === undefined ? null : expenses.length === 0 ? (
            <div className="empty">
              <div className="empty-glyph">🧾</div>
              <div className="empty-title">No expenses yet</div>
              <p className="empty-text">
                Add your first expense below. Tap any expense to edit or delete it.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.date}>
                <div className="list-header">{formatDateHeading(group.date)}</div>
                <div className="list">
                  {group.items.map((expense) => {
                    const info = categoryInfo(expense.category);
                    return (
                      <button
                        key={expense.id}
                        type="button"
                        className="row row--tappable"
                        onClick={() => setEditing(expense)}
                      >
                        <span className="row-glyph" style={{ background: info.tint }}>
                          {info.glyph}
                        </span>
                        <span className="row-main">
                          <span className="row-title">{expense.name}</span>
                          <span className="row-subtitle">
                            {info.label}
                            {expense.notes ? ` · ${expense.notes}` : ""}
                          </span>
                        </span>
                        <span className="row-trailing">
                          <span className="row-amount">
                            {formatMoney(expense.amountMinor, vacation.currency)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )
        ) : (
          <>
            <div className="total-card">
              <div className="total-label">Total spent</div>
              <div className="total-value">
                {formatMoney(summary.totalMinor, vacation.currency)}
              </div>
              {vacation.currency !== "EUR" && (
                <div className="total-eur">≈ {formatEur(summary.totalEurMinor)}</div>
              )}
              <div className="total-meta">
                {summary.count} expense{summary.count === 1 ? "" : "s"}
              </div>
            </div>

            {summary.byCategory.length === 0 ? (
              <div className="empty">
                <div className="empty-glyph">📊</div>
                <div className="empty-title">Nothing to summarize</div>
                <p className="empty-text">Add expenses to see the category breakdown.</p>
              </div>
            ) : (
              <>
                <div className="list-header">By category</div>
                <div className="list">
                  {summary.byCategory.map((entry) => {
                    const info = categoryInfo(entry.category);
                    return (
                      <div key={entry.category} className="row cat-row">
                        <div style={{ width: "100%" }}>
                          <div className="cat-row-top">
                            <span className="row-glyph" style={{ background: info.tint }}>
                              {info.glyph}
                            </span>
                            <span className="row-main">
                              <span className="row-title">{info.label}</span>
                              <span className="row-subtitle">
                                {entry.count} item{entry.count === 1 ? "" : "s"}
                              </span>
                            </span>
                            <span className="row-amount">
                              {formatMoney(entry.totalMinor, vacation.currency)}
                            </span>
                            <span className="cat-share">{Math.round(entry.share * 100)}%</span>
                          </div>
                          <div className="cat-bar-track">
                            <div
                              className="cat-bar-fill"
                              style={{
                                width: `${Math.max(entry.share * 100, 2)}%`,
                                background: info.tint,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="btn-stack">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowData(true)}
              >
                Export / Import CSV
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className="add-button"
        onClick={() => setShowNew(true)}
        aria-label="New expense"
      >
        <span aria-hidden="true">+</span> Add expense
      </button>

      {showNew && (
        <ExpenseSheet
          vacation={vacation}
          onClose={() => setShowNew(false)}
          onSave={async (draft) => {
            await createExpense({ ...draft, vacationId });
            setShowNew(false);
            setTab("expenses");
            toast.show("Expense added");
          }}
        />
      )}

      {editing && (
        <ExpenseSheet
          vacation={vacation}
          expense={editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            await updateExpense(editing.id, draft);
            setEditing(null);
          }}
          onDelete={async () => {
            const expense = editing;
            setEditing(null);
            await removeExpense(expense);
          }}
        />
      )}

      {showVacationEdit && (
        <VacationSheet
          vacation={vacation}
          onClose={() => setShowVacationEdit(false)}
          onSave={async (input) => {
            await updateVacation(vacation.id, input);
            setShowVacationEdit(false);
          }}
          onDelete={async () => {
            if (
              !window.confirm(
                `Delete “${vacation.name}” and all its expenses? This cannot be undone.`,
              )
            )
              return;
            await deleteVacation(vacation.id);
            setShowVacationEdit(false);
            onBack();
            toast.show(`“${vacation.name}” deleted`);
          }}
        />
      )}

      {showData && <DataSheet vacation={vacation} onClose={() => setShowData(false)} />}
    </div>
  );
}
