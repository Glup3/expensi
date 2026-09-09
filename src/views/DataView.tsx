import { useRef, useState } from "react";
import FormPage from "../components/FormPage.tsx";
import {
  applyImport,
  csvFilename,
  downloadCsv,
  exportCsv,
  previewImport,
  readFileAsText,
} from "../db/transfer.ts";
import type { CsvPreview } from "../lib/csv.ts";
import type { Vacation } from "../db/db.ts";

interface DataViewProps {
  onClose: () => void;
  /** When set, offers a single-vacation export in addition to the full backup. */
  vacation?: Vacation;
}

export default function DataView({ onClose, vacation }: DataViewProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  async function doExport(scopeVacation?: Vacation) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const csv = await exportCsv(scopeVacation?.id);
      downloadCsv(csvFilename(scopeVacation?.name ?? "expenses-backup"), csv);
    } catch {
      setError("Could not export your data. Please try again.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function onFilePicked(file: File | undefined) {
    if (!file || running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const text = await readFileAsText(file);
      setPreview(previewImport(text));
    } catch {
      setError("Could not read this file. Choose a CSV file and try again.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    // FormPage handles pending state and reports failures next to the action.
    await applyImport(preview);
    onClose();
  }

  if (preview) {
    const importable = preview.rows.length > 0;
    return (
      <FormPage
        key="preview"
        title="Confirm Import"
        onClose={() => setPreview(null)}
        cancelLabel="Back"
        confirmLabel="Import"
        pendingLabel="Importing…"
        failureMessage="Could not import this file. No changes were made. Please try again."
        onConfirm={confirmImport}
        confirmDisabled={busy || !importable}
      >
        <div className="list">
          <div className="row">
            <span className="row-main">Expenses</span>
            <span className="row-amount">{preview.expenseCount}</span>
          </div>
          <div className="row">
            <span className="row-main">Vacations</span>
            <span className="row-amount">{preview.vacationNames.length}</span>
          </div>
        </div>

        {preview.vacationNames.length > 0 && (
          <p className="info-text">
            Vacations in file: {preview.vacationNames.join(", ")}. Existing vacations are matched by
            name; expenses are added, never replaced. Importing the same file again creates
            duplicates.
          </p>
        )}

        {preview.errors.length > 0 && (
          <>
            <div className="list-header">
              {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"} skipped
            </div>
            <div className="error-text">
              {preview.errors.slice(0, 8).join("\n")}
              {preview.errors.length > 8 ? `\n…and ${preview.errors.length - 8} more` : ""}
            </div>
          </>
        )}
      </FormPage>
    );
  }

  return (
    <FormPage key="data" title="Data" onClose={onClose} cancelLabel="Back" busy={busy}>
      <p className="info-text">
        Your data is stored only in this browser on this device, not synced or backed up
        automatically. Export a backup before clearing browser data or switching devices.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="info-text">
          Preparing your file…
        </p>
      )}
      <div className="list-header">Export</div>
      <div className="list">
        {vacation && (
          <button
            type="button"
            className="row row--tappable row--action"
            onClick={() => doExport(vacation)}
          >
            <span className="row-main">Export “{vacation.name}”</span>
          </button>
        )}
        <button type="button" className="row row--tappable row--action" onClick={() => doExport()}>
          <span className="row-main">Export all data</span>
        </button>
      </div>

      <div className="list-header">Import</div>
      <div className="list">
        <button
          type="button"
          className="row row--tappable row--action"
          onClick={() => fileInput.current?.click()}
        >
          <span className="row-main">Choose CSV file…</span>
        </button>
      </div>
      <p className="info-text">
        CSV columns: vacation, currency, rateToEur, name, category, amount, date (YYYY-MM-DD),
        notes. Import adds to existing data — export first if you want a backup.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv,text/plain"
        hidden
        onChange={(e) => {
          void onFilePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </FormPage>
  );
}
