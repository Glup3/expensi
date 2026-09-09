import { useRef, useState, type ReactNode } from "react";

const OPEN_WIDTH = 96;
const TRIGGER = 48;

interface SwipeRowProps {
  children: ReactNode;
  onDelete: () => void;
}

/** iOS-style swipe-left-to-reveal-delete row. */
export default function SwipeRow({ children, onDelete }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, base: 0, locked: false, cancelled: false });

  function onTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    start.current = {
      x: touch.clientX,
      y: touch.clientY,
      base: offset,
      locked: false,
      cancelled: false,
    };
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    const dx = touch.clientX - start.current.x;
    const dy = touch.clientY - start.current.y;

    if (!start.current.locked) {
      // Let vertical scrolling win if the gesture is mostly vertical.
      if (Math.abs(dy) > Math.abs(dx)) {
        start.current.cancelled = true;
        setDragging(false);
        return;
      }
      if (Math.abs(dx) > 6) start.current.locked = true;
    }
    if (start.current.cancelled) return;

    const next = Math.min(0, Math.max(-OPEN_WIDTH * 1.4, start.current.base + dx));
    setOffset(next);
  }

  function onTouchEnd() {
    if (start.current.cancelled) return;
    setDragging(false);
    setOffset(offset <= -TRIGGER ? -OPEN_WIDTH : 0);
  }

  function handleDelete() {
    setOffset(0);
    onDelete();
  }

  return (
    <div className={`swipe${dragging ? " swipe--dragging" : ""}`}>
      <button type="button" className="swipe-delete" onClick={handleDelete} tabIndex={-1}>
        Delete
      </button>
      <div
        className="swipe-content"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
