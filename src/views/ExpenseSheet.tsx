import { useState } from "react";
import Sheet from "../components/Sheet.tsx";
import { CATEGORIES, type Category } from "../lib/categories.ts";
import { formatEur, minorToInputString, parseAmountToMinor, toEurMinor } from "../lib/money.ts";
import { todayIso } from "../lib/date.ts";
import type { Expense, Vacation } from "../db/db.ts";

export interface ExpenseDraft {
  name: string;
  category: Category;
  amountMinor: number;
  date: string;
  notes?: string;
}

interface ExpenseSheetProps {
  vacation: Vacation;
  expense?: Expense;
  onClose: () => void;
  onSave: (draft: ExpenseDraft) => void | Promise<void>;
  onDelete?: () => void;
}

export default function ExpenseSheet({
  vacation,
  expense,
  onClose,
  onSave,
  onDelete,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState(
    expense ? minorToInputString(expense.amountMinor, vacation.currency) : "",
  );
  const [category, setCategory] = useState<Category>(expense?.category ?? "food");
  const [name, setName] = useState(expense?.name ?? "");
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [notes, setNotes] = useState(expense?.notes ?? "");

  const amountMinor = parseAmountToMinor(amount, vacation.currency);
  const canSave = amountMinor !== undefined && amountMinor > 0 && name.trim() !== "" && date !== "";

  const eurHint =
    amountMinor !== undefined && amountMinor > 0 && vacation.currency !== "EUR"
      ? `≈ ${formatEur(toEurMinor(amountMinor, vacation.currency, vacation.rateToEur))}`
      : "";

  function submit() {
    if (!canSave || amountMinor === undefined) return;
    return onSave({
      name: name.trim(),
      category,
      amountMinor,
      date,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Sheet
      title={expense ? "Edit Expense" : "New Expense"}
      onClose={onClose}
      confirmLabel="Save"
      onConfirm={submit}
      confirmDisabled={!canSave}
    >
      <div className="amount-field">
        <div className="amount-input-wrap">
          <span className="amount-currency">{vacation.currency}</span>
          <input
            className="amount-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            aria-label="Amount"
            enterKeyHint="done"
          />
        </div>
        <div className="amount-hint">{eurHint}</div>
      </div>

      <div className="list-header" id="expense-category-label">
        Category
      </div>
      <div className="chip-grid" role="group" aria-labelledby="expense-category-label">
        {CATEGORIES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip${option.id === category ? " chip--selected" : ""}`}
            onClick={() => setCategory(option.id)}
            aria-pressed={option.id === category}
          >
            <span className="chip-glyph" style={{ background: option.tint }}>
              {option.glyph}
            </span>
            {option.label}
          </button>
        ))}
      </div>

      <div className="list">
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ramen, taxi, museum…"
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input
            className="field-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            className="field-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            rows={2}
          />
        </label>
      </div>

      {onDelete && (
        <div className="btn-stack">
          <button type="button" className="btn btn--destructive" onClick={onDelete}>
            Delete Expense
          </button>
        </div>
      )}
    </Sheet>
  );
}
