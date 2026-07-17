/**
 * Enable click-drag panning on a horizontal scroll container.
 * Clicks on buttons/links still work unless the pointer moved past threshold.
 */
export function enableDragScroll(el) {
  if (!el || el.dataset.dragScrollBound === '1') return;

  const DRAG_THRESHOLD = 6;
  let isPointerDown = false;
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let pointerId = null;

  const endDrag = (event) => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (pointerId != null && el.hasPointerCapture?.(pointerId)) {
      try { el.releasePointerCapture(pointerId); } catch { /* ignore */ }
    }
    pointerId = null;

    el.classList.remove('is-dragging');

    if (isDragging) {
      // Block the click that fires after a drag, without permanently blocking text.
      const blockClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        el.removeEventListener('click', blockClick, true);
      };
      el.addEventListener('click', blockClick, true);
      window.setTimeout(() => el.removeEventListener('click', blockClick, true), 0);
    }

    isDragging = false;
  };

  el.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    // Allow normal interaction on form controls / buttons
    if (event.target.closest('button, a, input, textarea, select, label')) return;

    isPointerDown = true;
    isDragging = false;
    startX = event.clientX;
    startScrollLeft = el.scrollLeft;
    pointerId = event.pointerId;
  });

  el.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return;

    const dx = event.clientX - startX;
    if (!isDragging && Math.abs(dx) < DRAG_THRESHOLD) return;

    if (!isDragging) {
      isDragging = true;
      el.classList.add('is-dragging');
      if (pointerId != null) {
        try { el.setPointerCapture(pointerId); } catch { /* ignore */ }
      }
    }

    el.scrollLeft = startScrollLeft - dx;
    event.preventDefault();
  });

  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
  el.addEventListener('pointerleave', (event) => {
    if (isDragging) endDrag(event);
  });

  el.dataset.dragScrollBound = '1';
}
