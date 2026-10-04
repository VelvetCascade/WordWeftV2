import { diagnosticScreen } from './pageErrorDetails.ts';

export interface InteractionRecord {
    kind: 'press' | 'activation' | 'navigation' | 'restoration';
    screen: string;
    control: 'button' | 'link' | 'summary' | 'none';
    input: 'touch' | 'mouse' | 'pen' | 'keyboard' | 'unknown';
    elapsedMs: number;
    at?: string;
}

/** No labels, element IDs, request bodies, URLs with queries or account IDs. */
export function createInteractionRecorder(capacity = 24) {
    const limit = Math.max(1, Math.min(40, Number.isFinite(capacity) ? Math.floor(capacity) : 24));
    const records: InteractionRecord[] = [];
    return {
        record(value: InteractionRecord) {
            records.push({
                kind: value.kind,
                screen: diagnosticScreen(value.screen),
                control: value.control,
                input: value.input,
                elapsedMs: Math.max(0, Math.min(60_000, Number.isFinite(value.elapsedMs) ? Math.round(value.elapsedMs) : 0)),
                at: new Date().toISOString(),
            });
            if (records.length > limit) records.splice(0, records.length - limit);
        },
        snapshot: () => records.map(record => ({ ...record })),
    };
}

const recorder = createInteractionRecorder();
export const recentInteractions = () => recorder.snapshot();

/** Passive observation only: never cancel a press, move focus or replace a control. */
export function installReliabilityDiagnostics() {
    let press: { element: Element; at: number; input: InteractionRecord['input'] } | null = null;
    const targetControl = (target: EventTarget | null) => target instanceof Element ? target.closest('button,a[href],summary') : null;
    const controlKind = (element: Element): InteractionRecord['control'] => element.tagName === 'A' ? 'link' : element.tagName === 'SUMMARY' ? 'summary' : 'button';
    const screen = () => window.location.pathname;
    const down = (event: PointerEvent) => {
        const element = targetControl(event.target);
        if (!element) return;
        const input = ['touch', 'mouse', 'pen'].includes(event.pointerType) ? event.pointerType as InteractionRecord['input'] : 'unknown';
        press = { element, at: performance.now(), input };
        recorder.record({ kind: 'press', screen: screen(), control: controlKind(element), input, elapsedMs: 0 });
    };
    const click = (event: MouseEvent) => {
        const element = targetControl(event.target);
        if (!element) return;
        const matched = press?.element === element ? press : null;
        recorder.record({ kind: 'activation', screen: screen(), control: controlKind(element), input: matched?.input || 'keyboard', elapsedMs: matched ? performance.now() - matched.at : 0 });
        press = null;
    };
    const navigation = () => recorder.record({ kind: 'navigation', screen: screen(), control: 'none', input: 'unknown', elapsedMs: 0 });
    const restoration = () => recorder.record({ kind: 'restoration', screen: screen(), control: 'none', input: 'unknown', elapsedMs: 0 });
    document.addEventListener('pointerdown', down, { capture: true, passive: true });
    document.addEventListener('click', click, { capture: true, passive: true });
    window.addEventListener('wordweft:navigate', navigation);
    window.addEventListener('popstate', restoration);
    window.addEventListener('pageshow', restoration);
    return () => {
        document.removeEventListener('pointerdown', down, true);
        document.removeEventListener('click', click, true);
        window.removeEventListener('wordweft:navigate', navigation);
        window.removeEventListener('popstate', restoration);
        window.removeEventListener('pageshow', restoration);
    };
}
