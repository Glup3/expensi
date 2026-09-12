import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface FormPageProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmDisabled?: boolean;
  confirmInHeader?: boolean;
  cancelLabel?: string;
  onDelete?: () => void | Promise<void>;
  deleteLabel?: string;
  busy?: boolean;
  pendingLabel?: string;
  failureMessage?: string;
  disabledReason?: string;
}

/** Document-scrolling form with sticky navigation on every device. */
export default function FormPage({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  confirmInHeader = false,
  cancelLabel = "Cancel",
  onDelete,
  deleteLabel,
  busy: externalBusy = false,
  pendingLabel = "Saving…",
  failureMessage = "Could not save your changes. Please try again.",
  disabledReason,
}: FormPageProps) {
  const [action, setAction] = useState<"save" | "delete" | null>(null);
  const formId = useId();
  const busy = externalBusy || action !== null;
  const [error, setError] = useState("");
  const running = useRef(false);
  const errorElement = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorElement.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

  async function run(task: () => void | Promise<void>, kind: "save" | "delete" = "save") {
    if (running.current || externalBusy) return;
    running.current = true;
    setAction(kind);
    setError("");
    try {
      await task();
    } catch {
      setError(
        kind === "delete" ? "Could not delete this item. Please try again." : failureMessage,
      );
    } finally {
      running.current = false;
      setAction(null);
    }
  }

  return (
    <section className="form-page">
      <header className="navbar">
        <button type="button" className="navbar-action" onClick={onClose} disabled={busy}>
          ← {cancelLabel}
        </button>
        {confirmInHeader && confirmLabel && (
          <button
            type="submit"
            form={formId}
            className="navbar-action navbar-action--right"
            disabled={confirmDisabled || busy}
            aria-describedby={confirmDisabled && disabledReason ? "save-help" : undefined}
          >
            {action === "save" ? pendingLabel : confirmLabel}
          </button>
        )}
      </header>
      <h1 className="large-title" tabIndex={-1}>
        {title}
      </h1>
      <form
        id={formId}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (onConfirm && !confirmDisabled) void run(onConfirm);
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          {children}
        </fieldset>
        {error && (
          <p ref={errorElement} className="error-text" role="alert">
            {error}
          </p>
        )}
        {confirmDisabled && disabledReason && (
          <p id="save-help" className="info-text">
            {disabledReason}
          </p>
        )}
        <div className="form-actions">
          {confirmLabel && !confirmInHeader && (
            <button
              type="submit"
              className="btn"
              disabled={confirmDisabled || busy}
              aria-describedby={confirmDisabled && disabledReason ? "save-help" : undefined}
            >
              {action === "save" ? pendingLabel : confirmLabel}
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
            onClick={() => void run(onDelete, "delete")}
          >
            {action === "delete" ? "Deleting…" : (deleteLabel ?? "Delete")}
          </button>
        )}
      </form>
    </section>
  );
}
