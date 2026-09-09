import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}

/** Native modal: focus trapping, Escape support, and no background interactions. */
export default function Sheet({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  cancelLabel = "Cancel",
}: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    const scrollY = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    // Lock background scrolling on iOS as well as desktop browsers.
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    element.showModal();
    // The software keyboard can shrink the visual viewport without changing dvh.
    const viewport = window.visualViewport;
    const syncViewport = () => {
      element.style.setProperty("--dialog-height", `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty("--dialog-top", `${viewport?.offsetTop ?? 0}px`);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      element.close();
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, []);

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
          <h2 id={titleId}>{title}</h2>
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
    </dialog>
  );
}
