import { useRef, useState } from "react";
import Sheet from "../components/Sheet.tsx";
import { useToast } from "../components/toast-context.ts";
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

interface DataSheetProps {
  onClose: () => void;
  /** When set, offers a single-vacation export in addition to the full backup. */
  vacation?: Vacation;
}

export default function DataSheet({ onClose, vacation }: DataSheetProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [busy, setBusy] = useState(false);

  async function doExport(scopeVacation?: Vacation) {
    try {
      const csv = await exportCsv(scopeVacation?.id);
      downloadCsv(csvFilename(scopeVacation?.name ?? "expenses-backup"), csv);
      toast.show("CSV exported");
    } catch {
      toast.show("Export failed");
    }
  }

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setPreview(previewImport(text));
    } catch {
      toast.show("Could not read file");
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await applyImport(preview);
      toast.show(
        `Imported ${result.expensesImported} expense${result.expensesImported === 1 ? "" : "s"}` +
          (result.vacationsCreated > 0 ? `, ${result.vacationsCreated} new vacation(s)` : ""),
      );
      setPreview(null);
      onClose();
    } catch {
      toast.show("Import failed");
    } finally {
      setBusy(false);
    }
  }

  if (preview) {
    const importable = preview.expenseCount > 0 || preview.vacationNames.length > 0;
    return (
      <Sheet
        title="Confirm Import"
        onClose={() => setPreview(null)}
        cancelLabel="Back"
        confirmLabel={busy ? "Importing…" : "Import"}
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
            name; expenses are added, never replaced.
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
      </Sheet>
    );
  }

  return (
    <Sheet title="Data" onClose={onClose} cancelLabel="Done">
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
    </Sheet>
  );
}
