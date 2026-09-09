import { useState } from "react";
import Sheet from "../components/Sheet.tsx";
import { CURRENCIES, currencyOption } from "../lib/currencies.ts";
import type { Vacation } from "../db/db.ts";

interface VacationSheetProps {
  vacation?: Vacation;
  onClose: () => void;
  onSave: (input: { name: string; currency: string; rateToEur: number }) => void;
  onDelete?: () => void;
}

export default function VacationSheet({ vacation, onClose, onSave, onDelete }: VacationSheetProps) {
  const [name, setName] = useState(vacation?.name ?? "");
  const [currency, setCurrency] = useState(vacation?.currency ?? "EUR");
  const [rate, setRate] = useState(
    vacation ? String(vacation.rateToEur) : String(currencyOption("EUR")?.suggestedRateToEur ?? 1),
  );

  const isEur = currency === "EUR";
  const rateValue = Number(rate.replace(",", "."));
  const rateValid = isEur || (Number.isFinite(rateValue) && rateValue > 0);
  const canSave = name.trim() !== "" && rateValid;

  function changeCurrency(code: string) {
    setCurrency(code);
    // Prefill a sensible rate when switching, but keep an existing custom rate.
    if (code === "EUR") setRate("1");
    else if (!vacation || vacation.currency !== code) {
      setRate(String(currencyOption(code)?.suggestedRateToEur ?? 1));
    } else {
      setRate(String(vacation.rateToEur));
    }
  }

  function submit() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      currency,
      rateToEur: isEur ? 1 : rateValue,
    });
  }

  return (
    <Sheet
      title={vacation ? "Edit Vacation" : "New Vacation"}
      onClose={onClose}
      confirmLabel="Save"
      onConfirm={submit}
      confirmDisabled={!canSave}
    >
      <div className="list">
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Japan 2025"
            autoFocus={!vacation}
            enterKeyHint="done"
            autoCapitalize="words"
          />
        </label>
        <label className="field">
          <span className="field-label">Currency</span>
          <select
            className="field-input"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
          >
            {CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} — {option.label}
              </option>
            ))}
          </select>
        </label>
        {!isEur && (
          <label className="field">
            <span className="field-label">Rate</span>
            <input
              className="field-input"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              inputMode="decimal"
              placeholder="0.0061"
            />
          </label>
        )}
      </div>

      {!isEur && (
        <p className="info-text">
          1 {currency} = {rateValid ? rateValue : "?"} EUR. Entered manually and used only to show
          EUR equivalents.
        </p>
      )}

      {onDelete && (
        <div className="btn-stack">
          <button type="button" className="btn btn--destructive" onClick={onDelete}>
            Delete Vacation
          </button>
        </div>
      )}
    </Sheet>
  );
}
