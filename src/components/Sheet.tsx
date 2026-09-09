import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}

/** Phones use document scrolling; desktop uses a native, focus-trapped dialog. */
export default function Sheet({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  cancelLabel = "Cancel",
}: SheetProps) {
  // Keep the presentation stable while the keyboard opens or the device rotates.
  const [isPage] = useState(
    () => window.matchMedia("(max-width: 600px), (pointer: coarse)").matches,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (!isPage) {
      const element = dialog.current!;
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      element.showModal();
      return () => {
        element.close();
        document.body.style.overflow = previous;
      };
    }

    const app = document.querySelector<HTMLElement>(".app");
    const previousDisplay = app?.style.display ?? "";
    const previousFocus = document.activeElement;
    const scrollY = window.scrollY;
    // The form is portaled outside the app so the underlying screen can leave
    // document flow entirely. Safari remains in charge of scrolling and focus.
    if (app) app.style.display = "none";
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (app) app.style.display = previousDisplay;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
      window.scrollTo(0, scrollY);
    };
  }, [isPage]);

  const form = (
    <form
      className="sheet-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!onConfirm || confirmDisabled || submitting.current) return;
        submitting.current = true;
        setSaving(true);
        setError("");
        try {
          await onConfirm();
        } catch {
          setError("Could not save your changes. Please try again.");
        } finally {
          submitting.current = false;
          setSaving(false);
        }
      }}
    >
      <header className="sheet-nav">
        <h2 ref={heading} id={titleId} tabIndex={-1}>
          {title}
        </h2>
        {isPage && (
          <button type="button" className="navbar-action" onClick={onClose} disabled={saving}>
            {cancelLabel}
          </button>
        )}
      </header>
      <div className="sheet-body">
        {children}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="sheet-footer">
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
          {cancelLabel}
        </button>
        {confirmLabel && (
          <button type="submit" className="btn" disabled={confirmDisabled || saving}>
            {saving ? "Saving…" : confirmLabel}
          </button>
        )}
      </footer>
    </form>
  );

  if (isPage) {
    return createPortal(
      <section
        className="sheet-page"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !submitting.current) {
            event.preventDefault();
            onClose();
          }
        }}
      >
        {form}
      </section>,
      document.body,
    );
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting.current) onClose();
      }}
    >
      {form}
    </dialog>
  );
}
