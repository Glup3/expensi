import { useEffect, type ReactNode } from "react";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Right-hand confirm action (e.g. Save). */
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}

export default function Sheet({
  title,
  onClose,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  cancelLabel = "Cancel",
}: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-nav">
          <button type="button" className="navbar-action" onClick={onClose}>
            {cancelLabel}
          </button>
          <div className="navbar-title">{title}</div>
          {confirmLabel ? (
            <button
              type="button"
              className="navbar-action navbar-action--right navbar-action--strong"
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </button>
          ) : (
            <div className="navbar-action navbar-action--right" />
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
