import { useEffect, useRef } from "react";

export function useDragScroll(options?: { lockInteractive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const lockInteractive = options?.lockInteractive ?? true;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const scroller: HTMLDivElement = node;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    function onDown(event: PointerEvent) {
      if (
        lockInteractive &&
        (event.target as HTMLElement).closest("button, a, select, input, textarea")
      ) {
        return;
      }
      dragging = true;
      moved = false;
      scroller.dataset.dragged = "0";
      startX = event.clientX;
      startY = event.clientY;
      scrollLeft = scroller.scrollLeft;
      scrollTop = scroller.scrollTop;
      scroller.setPointerCapture(event.pointerId);
      scroller.style.cursor = "grabbing";
      scroller.style.userSelect = "none";
    }

    function onMove(event: PointerEvent) {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      scroller.scrollLeft = scrollLeft - dx;
      scroller.scrollTop = scrollTop - dy;
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      scroller.style.cursor = "";
      scroller.style.userSelect = "";
      scroller.dataset.dragged = moved ? "1" : "0";
    }

    scroller.addEventListener("pointerdown", onDown);
    scroller.addEventListener("pointermove", onMove);
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
