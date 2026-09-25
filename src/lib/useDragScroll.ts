import { useEffect, useRef } from "react";

const DRAG_THRESHOLD = 8;

export function useDragScroll(options?: { lockInteractive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const lockInteractive = options?.lockInteractive ?? true;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const scroller: HTMLDivElement = node;

    let pending = false;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;
    let pointerId: number | null = null;

    function onDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (
        lockInteractive &&
        (event.target as HTMLElement).closest("button, a, select, input, textarea, [role='button']")
      ) {
        return;
      }
      pending = true;
      dragging = false;
      moved = false;
      pointerId = event.pointerId;
      scroller.dataset.dragged = "0";
      startX = event.clientX;
      startY = event.clientY;
      scrollLeft = scroller.scrollLeft;
      scrollTop = scroller.scrollTop;
    }

    function onMove(event: PointerEvent) {
      if (!pending && !dragging) return;
      if (pointerId !== null && event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        dragging = true;
        moved = true;
        scroller.dataset.dragged = "1";
        try {
          scroller.setPointerCapture(event.pointerId);
        } catch {
          /* already captured */
        }
        scroller.style.cursor = "grabbing";
        scroller.style.userSelect = "none";
      }
      scroller.scrollLeft = scrollLeft - dx;
      scroller.scrollTop = scrollTop - dy;
      event.preventDefault();
    }

    function onUp(event: PointerEvent) {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      pending = false;
      if (dragging) {
        dragging = false;
        scroller.style.cursor = "";
        scroller.style.userSelect = "";
        try {
          if (scroller.hasPointerCapture(event.pointerId)) {
            scroller.releasePointerCapture(event.pointerId);
          }
        } catch {
          /* ignore */
        }
      }
      scroller.dataset.dragged = moved ? "1" : "0";
      pointerId = null;
    }

    scroller.addEventListener("pointerdown", onDown);
    scroller.addEventListener("pointermove", onMove, { passive: false });
    scroller.addEventListener("pointerup", onUp);
    scroller.addEventListener("pointercancel", onUp);
    return () => {
      scroller.removeEventListener("pointerdown", onDown);
      scroller.removeEventListener("pointermove", onMove);
      scroller.removeEventListener("pointerup", onUp);
      scroller.removeEventListener("pointercancel", onUp);
    };
  }, [lockInteractive]);

  return { ref };
}
