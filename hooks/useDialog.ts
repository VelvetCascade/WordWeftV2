import { useEffect, useRef } from 'react';

const dialogStack: symbol[] = [];
let unlockedOverflow = '';

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
    if (!dialogStack.length) unlockedOverflow = document.body.style.overflow;
    dialogStack.push(identity);
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
    ) || []).filter(element => element.getClientRects().length && !element.closest('[hidden],[inert]'));
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
      (preferred || controls()[0] || ref.current)?.focus();
    });
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== identity) return;
      if (event.key === 'Escape' && dismissibleRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) {
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
      if (!dialogStack.length) document.body.style.overflow = unlockedOverflow;
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
