import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
  useLoaderData,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import SegmentedControl from "../components/SegmentedControl.tsx";
import { categoryInfo } from "../lib/categories.ts";
import { formatEur, formatMoney, toEurMinor } from "../lib/money.ts";
import { formatDateHeading } from "../lib/date.ts";
import { getVacation, groupByDate, listExpenses, summarize } from "../db/repo.ts";
import type { detailLoader } from "../lib/loaders.ts";
import { useReturnTo } from "../lib/useReturnTo.ts";

export default function VacationDetailView() {
  const initial = useLoaderData<typeof detailLoader>();
  const location = useLocation();
  const navigationState = { state: { from: location.pathname + location.search } };
  const { vacationId = "" } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") === "summary" ? "summary" : "expenses";
  const base = `/vacations/${vacationId}`;
  const onBack = useReturnTo("/vacations");

  const vacation = useLiveQuery(
    async () => (await getVacation(vacationId)) ?? null,
    [vacationId],
    initial.vacation,
  );
  const expenses = useLiveQuery(() => listExpenses(vacationId), [vacationId], initial.expenses);

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

  return (
    <div className="screen detail-screen">
      <nav className="navbar detail-navbar" aria-label="Vacation navigation">
        <button type="button" className="navbar-action" onClick={onBack}>
          <span aria-hidden="true">‹</span> Vacations
        </button>
        <button
          type="button"
          className="navbar-action navbar-action--right"
          onClick={() => navigate(`${base}/edit`, navigationState)}
        >
          Edit
        </button>
      </nav>

      <div className="large-title-wrap">
        <h1 className="large-title">{vacation.name}</h1>
      </div>

      <div className="detail-tabs">
        <SegmentedControl
          value={tab}
          onChange={(value) =>
            setSearch(value === "summary" ? { tab: value } : {}, {
              replace: true,
              preventScrollReset: true,
              state: location.state,
            })
          }
          options={[
            { value: "expenses", label: "Expenses" },
            { value: "summary", label: "Summary" },
          ]}
        />
      </div>

      <div className="screen-body">
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
                        onClick={() =>
                          navigate(`${base}/expenses/${expense.id}/edit`, navigationState)
                        }
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
                            <span>
                              <span className="row-amount">
                                {formatMoney(entry.totalMinor, vacation.currency)}
                              </span>
                              {vacation.currency !== "EUR" && (
                                <span className="row-subtitle" style={{ textAlign: "right" }}>
                                  ≈{" "}
                                  {formatEur(
                                    toEurMinor(
                                      entry.totalMinor,
                                      vacation.currency,
                                      vacation.rateToEur,
                                    ),
                                  )}
                                </span>
                              )}
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
                onClick={() => navigate(`${base}/data`, navigationState)}
              >
                Export / Import CSV
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className="add-button add-button--expense"
        onClick={() =>
          navigate(`${base}/expenses/new`, {
            state: { ...navigationState.state, vacation },
            // Mount/autofocus the input within the tap event, not after a loader.
            flushSync: true,
          })
        }
        aria-label="New expense"
      >
        <span aria-hidden="true">+</span> Add expense
      </button>
    </div>
  );
}
