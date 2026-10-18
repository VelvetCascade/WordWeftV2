import { useEffect, useRef } from 'react';

const dialogStack: symbol[] = [];
let unlockedOverflow = '';
let unlockedPadding = '';
let unlockedPaddingPriority = '';

/** Keep a sheet keyboard reachable and return focus to the control that opened it. */
export function useDialog(open: boolean, onClose: () => void, dismissible = true) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const identity = Symbol('dialog');
    if (!dialogStack.length) {
      unlockedOverflow = document.body.style.overflow;
      unlockedPadding = document.body.style.getPropertyValue('padding-right');
      unlockedPaddingPriority = document.body.style.getPropertyPriority('padding-right');
      const before = document.documentElement.clientWidth;
      const padding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.overflow = 'hidden';
      // Compensate only for width actually released by hiding the scrollbar.
      // A browser with overlay scrollbars or a stable gutter needs no padding.
      const released = document.documentElement.clientWidth - before;
      if (released > 0) document.body.style.setProperty('padding-right', `${padding + released}px`);
    }
    dialogStack.push(identity);
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'a[href],button,input,select,textarea,summary,[tabindex]'
    ) || []).filter(element => {
      if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden],[inert]') || !element.getClientRects().length) return false;
      const visibility = getComputedStyle(element).visibility;
      if (visibility === 'hidden' || visibility === 'collapse') return false;
      // Only the first summary is the native disclosure control. Closed details
      // may still report rectangles for their hidden content in some browsers.
      if (element.tagName === 'SUMMARY' && (element.parentElement?.tagName !== 'DETAILS' || element.parentElement.querySelector(':scope > summary') !== element)) return false;
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === 'DETAILS' && !ancestor.hasAttribute('open')) {
          const summary = ancestor.querySelector(':scope > summary');
          if (!summary?.contains(element)) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Match native sequential focus: positive tabindex first, DOM order for ties.
      const order = (element: HTMLElement) => element.tabIndex > 0 ? element.tabIndex : Infinity;
      return order(a) - order(b);
    });
    const dialog = ref.current;
    const originalMaxHeight = dialog?.style.getPropertyValue('max-height') || '';
    const originalPriority = dialog?.style.getPropertyPriority('max-height') || '';
    const restoreMaxHeight = () => {
      if (originalMaxHeight) dialog?.style.setProperty('max-height', originalMaxHeight, originalPriority);
      else dialog?.style.removeProperty('max-height');
    };
    const updateAvailableHeight = () => {
      if (!dialog) return;
      // Re-read the component's responsive cap instead of enlarging every sheet
      // to the shared viewport limit, or retaining a smaller keyboard-era cap.
      restoreMaxHeight();
      const componentCap = Number.parseFloat(getComputedStyle(dialog).maxHeight);
      const height = window.visualViewport?.height || window.innerHeight;
      const available = Math.max(0, height - 32);
      dialog.style.setProperty('max-height', `${Math.min(Number.isFinite(componentCap) ? componentCap : available, available)}px`);
    };
    updateAvailableHeight();
    window.visualViewport?.addEventListener('resize', updateAvailableHeight);
    window.addEventListener('resize', updateAvailableHeight);
    const frame = requestAnimationFrame(() => {
      const preferred = ref.current?.querySelector<HTMLElement>('[data-dialog-focus]');
      (preferred || controls()[0] || ref.current)?.focus({ preventScroll: true });
    });
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== identity) return;
      if (event.key === 'Escape' && dismissibleRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const activeIndex = active ? items.indexOf(active) : -1;
      const next = items[activeIndex + (event.shiftKey ? -1 : 1)];
      // Native positive-tabindex traversal spans the whole document. Keep the
      // boundary between positive and ordinary controls inside this dialog.
      if (activeIndex >= 0 && next && ((active!.tabIndex > 0) !== (next.tabIndex > 0))) {
        event.preventDefault(); next.focus();
      } else if (event.shiftKey && (active === first || !ref.current?.contains(active))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (active === last || !ref.current?.contains(active))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', updateAvailableHeight);
      window.removeEventListener('resize', updateAvailableHeight);
      restoreMaxHeight();
      document.removeEventListener('keydown', keydown);
      const wasTop = dialogStack[dialogStack.length - 1] === identity;
      const index = dialogStack.indexOf(identity);
      if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) {
        document.body.style.overflow = unlockedOverflow;
        if (unlockedPadding) document.body.style.setProperty('padding-right', unlockedPadding, unlockedPaddingPriority);
        else document.body.style.removeProperty('padding-right');
      }
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
