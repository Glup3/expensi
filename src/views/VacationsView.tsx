import { useNavigate, useLoaderData } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db.ts";
import { listVacations } from "../db/repo.ts";
import { formatEur, formatMoney, toEurMinor } from "../lib/money.ts";

export default function VacationsView() {
  const navigate = useNavigate();

  const initialVacations = useLoaderData<typeof listVacations>();
  const vacations = useLiveQuery(() => listVacations(), [], initialVacations);
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
        <div className="navbar-title">Expense tracker</div>
        <button
          type="button"
          className="navbar-action navbar-action--right"
          onClick={() => navigate("/data", { state: { from: "/vacations" } })}
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
            <p className="empty-text">Create a vacation to keep its expenses in one place.</p>
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
                  onClick={() =>
                    navigate(`/vacations/${vacation.id}`, { state: { from: "/vacations" } })
                  }
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
        className="add-button"
        onClick={() => navigate("/vacations/new", { state: { from: "/vacations" } })}
        aria-label="New vacation"
      >
        <span aria-hidden="true">+</span> New vacation
      </button>
    </div>
  );
}
