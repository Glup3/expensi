import { useRef, useState, type ReactNode } from "react";

interface FormPageProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  onDelete?: () => void | Promise<void>;
  deleteLabel?: string;
}

/** Ordinary document flow on every device, including the save actions. */
export default function FormPage({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  cancelLabel = "Cancel",
  onDelete,
  deleteLabel,
}: FormPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  async function run(action: () => void | Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError("Could not save your changes. Please try again.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="form-page">
      <header className="navbar">
        <button type="button" className="navbar-action" onClick={onClose} disabled={busy}>
          ← {cancelLabel}
        </button>
      </header>
      <h1 className="large-title" tabIndex={-1}>
        {title}
      </h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onConfirm && !confirmDisabled) void run(onConfirm);
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          {children}
        </fieldset>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {confirmLabel && (
            <button type="submit" className="btn" disabled={confirmDisabled || busy}>
              {busy ? "Saving…" : confirmLabel}
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
        </div>
        {onDelete && (
          <button
            type="button"
            className="btn btn--destructive delete-action"
            disabled={busy}
            onClick={() => void run(onDelete)}
          >
            {deleteLabel ?? "Delete"}
          </button>
        )}
      </form>
    </section>
  );
}
