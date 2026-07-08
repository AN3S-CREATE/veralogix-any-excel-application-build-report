import * as React from 'react';

interface UseSwipeSheetOptions {
  sheetCount: number;
  activeSheet: number;
  onSwipe: (newIndex: number, direction: 'left' | 'right') => void;
  /** Minimum horizontal distance (px) to trigger a swipe. Default 60. */
  threshold?: number;
  /** Maximum vertical drift (px) allowed before the gesture is cancelled. Default 40. */
  verticalTolerance?: number;
}

/**
 * Attaches touch-swipe listeners to a ref'd element.
 * Swipe LEFT  → next sheet
 * Swipe RIGHT → previous sheet
 *
 * Only fires on mobile (touch) devices and ignores horizontal scrolls
 * that are clearly vertical swipes (verticalTolerance guard).
 */
export function useSwipeSheet(
  ref: React.RefObject<HTMLElement>,
  {
    sheetCount,
    activeSheet,
    onSwipe,
    threshold = 60,
    verticalTolerance = 40,
  }: UseSwipeSheetOptions,
) {
  const startX = React.useRef<number>(0);
  const startY = React.useRef<number>(0);
  const swiping = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      swiping.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!swiping.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      // If clearly a vertical scroll, cancel swipe tracking
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > verticalTolerance) {
        swiping.current = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swiping.current) return;
      swiping.current = false;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      // Reject if vertical drift is too large
      if (Math.abs(dy) > verticalTolerance) return;
      if (Math.abs(dx) < threshold) return;

      if (dx < 0) {
        // Swipe left → next sheet
        const next = Math.min(activeSheet + 1, sheetCount - 1);
        if (next !== activeSheet) onSwipe(next, 'left');
      } else {
        // Swipe right → previous sheet
        const prev = Math.max(activeSheet - 1, 0);
        if (prev !== activeSheet) onSwipe(prev, 'right');
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ref, sheetCount, activeSheet, onSwipe, threshold, verticalTolerance]);
}
