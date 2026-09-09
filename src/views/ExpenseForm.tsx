import { useRef, useState } from "react";
import FormPage from "../components/FormPage.tsx";
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

interface ExpenseFormProps {
  vacation: Vacation;
  expense?: Expense;
  onClose: () => void;
  onSave: (draft: ExpenseDraft) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export default function ExpenseForm({
  vacation,
  expense,
  onClose,
  onSave,
  onDelete,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(
    expense ? minorToInputString(expense.amountMinor, vacation.currency) : "",
  );
  const nameInput = useRef<HTMLInputElement>(null);
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
    <FormPage
      onDelete={onDelete}
      deleteLabel="Delete Expense"
      title={expense ? "Edit Expense" : "New Expense"}
      onClose={onClose}
      confirmLabel="Save"
      onConfirm={submit}
      confirmDisabled={!canSave}
      disabledReason="Enter an amount greater than zero, a name, and a date to save."
    >
      <div className="amount-field">
        <div className="amount-input-wrap">
          <input
            className="amount-input"
            autoFocus={!expense}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            aria-label="Amount"
            aria-describedby="expense-currency"
            required
            enterKeyHint="next"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                nameInput.current?.focus();
              }
            }}
          />
          <span id="expense-currency" className="amount-currency">
            {vacation.currency}
          </span>
        </div>
        <div className="amount-hint">{eurHint}</div>
      </div>

      <label className="field">
        <span className="field-label">Name</span>
        <input
          ref={nameInput}
          required
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ramen, taxi, museum…"
          enterKeyHint="done"
          autoCapitalize="sentences"
        />
      </label>

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
          <span className="field-label">Date</span>
          <input
            className="field-input"
            type="date"
            required
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
    </FormPage>
  );
}
