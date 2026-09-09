import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db.ts";
import { createVacation, listVacations } from "../db/repo.ts";
import { formatEur, formatMoney, toEurMinor } from "../lib/money.ts";
import { useToast } from "../components/toast-context.ts";
import VacationSheet from "./VacationSheet.tsx";
import DataSheet from "./DataSheet.tsx";

interface VacationsViewProps {
  onOpen: (vacationId: string) => void;
}

export default function VacationsView({ onOpen }: VacationsViewProps) {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [showData, setShowData] = useState(false);

  const vacations = useLiveQuery(() => listVacations(), [], undefined);
  const totals = useLiveQuery(
    async () => {
      const rows = await db.expenses.toArray();
      const map = new Map<string, number>();
      for (const row of rows) {
        map.set(row.vacationId, (map.get(row.vacationId) ?? 0) + row.amountMinor);
      }
      return map;
    },
    [],
    new Map<string, number>(),
  );

  return (
    <div className="screen">
      <div className="navbar">
        <div className="navbar-action" />
        <div className="navbar-title" />
        <button
          type="button"
          className="navbar-action navbar-action--right"
          onClick={() => setShowData(true)}
        >
          Data
        </button>
      </div>

      <div className="large-title-wrap">
        <h1 className="large-title">Vacations</h1>
      </div>

      <div className="screen-body">
        {vacations === undefined ? null : vacations.length === 0 ? (
          <div className="empty">
            <div className="empty-glyph">🧳</div>
            <div className="empty-title">No vacations yet</div>
            <p className="empty-text">Tap + to add your first trip, then start logging expenses.</p>
          </div>
        ) : (
          <div className="list">
            {vacations.map((vacation) => {
              const totalMinor = totals?.get(vacation.id) ?? 0;
              const eur = toEurMinor(totalMinor, vacation.currency, vacation.rateToEur);
              return (
                <button
                  key={vacation.id}
                  type="button"
                  className="row row--tappable"
                  onClick={() => onOpen(vacation.id)}
                >
                  <span className="row-main">
                    <span className="row-title">{vacation.name}</span>
                    <span className="row-subtitle">{vacation.currency}</span>
                  </span>
                  <span className="row-trailing">
                    <span>
                      <span className="row-amount">
                        {formatMoney(totalMinor, vacation.currency)}
                      </span>
                      {vacation.currency !== "EUR" && (
                        <span className="row-subtitle" style={{ textAlign: "right" }}>
                          ≈ {formatEur(eur)}
                        </span>
                      )}
                    </span>
                    <span className="chevron" aria-hidden="true">
                      ›
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        className="fab"
        onClick={() => setShowNew(true)}
        aria-label="New vacation"
      >
        +
      </button>

      {showNew && (
        <VacationSheet
          onClose={() => setShowNew(false)}
          onSave={async (input) => {
            const id = await createVacation(input);
            setShowNew(false);
            toast.show(`“${input.name}” created`);
            onOpen(id);
          }}
        />
      )}

      {showData && <DataSheet onClose={() => setShowData(false)} />}
    </div>
  );
}
