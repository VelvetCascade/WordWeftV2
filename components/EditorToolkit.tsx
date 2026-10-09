import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Search, ListTree, Link as LinkIcon, NotebookPen, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { editorOutline, findEditorMatches, replaceEditorMatches, removeEditorBlockFormatting, continueAfterEditorBlock } from '../utils/editorTools';

const editorSignals = new WeakMap<Editor, EventTarget>();
function signalsFor(editor: Editor) {
    if (!editorSignals.has(editor)) editorSignals.set(editor, new EventTarget());
    return editorSignals.get(editor)!;
}

/** Prevent a pointer press on formatting controls from collapsing the manuscript
 * selection before the click, including touch and pen input. Keyboard remains native. */
export const preserveEditorSelection = (event: React.PointerEvent) => { if (event.button === 0) event.preventDefault(); };

export function EditorBlockActions({ editor }: { editor: Editor }) {
    const options = [{ name: 'table', label: 'Table' }, { name: 'details', label: 'Collapsible section' }, { name: 'pullQuote', label: 'Pull quote' }, { name: 'codeBlock', label: 'Code block' }, { name: 'blockquote', label: 'Blockquote' }];
    const active = options.find(option => editor.isActive(option.name));
    if (!active) return null;
    const run = (remove: boolean) => {
        const transaction = remove ? removeEditorBlockFormatting(editor.state, active.name) : continueAfterEditorBlock(editor.state, active.name);
        if (transaction) editor.view.dispatch(transaction);
        editor.commands.focus();
    };
    return <div className="rte-atmosphere-context rte-block-context" role="group" aria-label={`${active.label} actions`}>
        <span>{active.label}</span>
        <button type="button" onPointerDown={preserveEditorSelection} onClick={() => run(false)}>Continue after block</button>
        <button type="button" onPointerDown={preserveEditorSelection} onClick={() => run(true)}>Remove block formatting</button>
        <small>Your words stay unchanged</small>
    </div>;
}

export function EditorEntryButton({ editor, kind, children, shortcut = false }: { editor: Editor; kind: 'link' | 'footnote'; children?: React.ReactNode; shortcut?: boolean }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const selection = useRef({ from: 0, to: 0 });
    const id = useId();
    const dialog = useDialog(open, () => setOpen(false));
    const start = () => {
        selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
        setValue(kind === 'link' ? editor.getAttributes('link').href || '' : '');
        setError(''); setOpen(true);
    };
    useEffect(() => {
        if (kind !== 'link' || !shortcut) return;
        const listener = () => start();
        const signals = signalsFor(editor);
        signals.addEventListener('add-link', listener);
        return () => signals.removeEventListener('add-link', listener);
    }, [editor, kind, shortcut]);
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const input = value.trim();
        if (kind === 'link' && input) {
            const candidate = /^(https?:|mailto:|tel:|\/|#)/i.test(input) ? input : `https://${input}`;
            if (!/^(https?:\/\/[^\s/]+[^\s]*|mailto:[^\s@]+@[^\s@]+|tel:[+\d\s()-]+|\/[^\s]*|#[^\s]*)$/i.test(candidate)) {
                setError('Enter a valid web address, email link, or page anchor.'); return;
            }
            editor.chain().focus().setTextSelection(selection.current).extendMarkRange('link').setLink({ href: candidate }).run();
        } else if (kind === 'link') {
            editor.chain().focus().setTextSelection(selection.current).extendMarkRange('link').unsetLink().run();
        } else {
            if (!input) { setError('Write a note before adding it.'); return; }
            // A footnote belongs at the end of the selected passage; it never replaces the words.
            editor.chain().focus().setTextSelection(selection.current.to).insertFootnote({ note: input }).run();
        }
        setOpen(false); requestAnimationFrame(() => editor.commands.focus());
    };
    return <>
        <button type="button" className={`rte-toolbar-btn ${kind === 'link' && editor.isActive('link') ? 'rte-toolbar-btn-active' : ''}`}
            data-tool-label={kind === 'link' ? 'Link' : 'Footnote'}
            onPointerDown={preserveEditorSelection} onClick={start} aria-label={kind === 'link' ? 'Add or edit link' : 'Add footnote'}
            title={kind === 'link' ? 'Add or edit link (Ctrl/Cmd+K)' : 'Add footnote'} aria-haspopup="dialog" aria-expanded={open}>
            {children || (kind === 'link' ? <LinkIcon size={16} /> : <NotebookPen size={16} />)}
        </button>
        {open && createPortal(<div className="rte-mood-backdrop" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
            <div ref={dialog} className="rte-mood-dialog rte-entry-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
                <header><h2 id={`${id}-title`}>{kind === 'link' ? 'Add a link' : 'Add a footnote'}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button></header>
                <p>{kind === 'link' ? 'Link the selected words. Leave the address empty to remove an existing link.' : 'Your note appears after the selected words and opens when a reader selects its marker.'}</p>
                <form onSubmit={submit}>
                    <label htmlFor={`${id}-value`}>{kind === 'link' ? 'Web address' : 'Note text'}</label>
                    {kind === 'link' ? <input id={`${id}-value`} data-dialog-focus value={value} onChange={event => setValue(event.target.value)} placeholder="https://example.com" inputMode="url" autoComplete="url" aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error} />
                        : <textarea id={`${id}-value`} data-dialog-focus rows={4} value={value} onChange={event => setValue(event.target.value)} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error} />}
                    {error && <p id={`${id}-error`} role="alert" className="rte-tool-error">{error}</p>}
                    <div className="rte-entry-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit">{kind === 'link' ? value.trim() ? 'Save link' : 'Remove link' : 'Add note'}</button></div>
                </form>
            </div>
        </div>, document.body)}
    </>;
}

export function EditorNavigation({ editor }: { editor: Editor }) {
    const [panel, setPanel] = useState<'find' | 'outline' | null>(null);
    const [query, setQuery] = useState('');
    const [replacement, setReplacement] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [revision, setRevision] = useState(0);
    const [current, setCurrent] = useState(0);
    const [confirmAll, setConfirmAll] = useState(false);
    const [message, setMessage] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const region = useRef<HTMLDivElement>(null);
    const id = useId();
    const highlightKey = useMemo(() => new PluginKey('manuscriptFind'), []);
    const lastHighlights = useRef('');
    const matches = useMemo(() => findEditorMatches(editor.state.doc, query, caseSensitive), [editor, query, caseSensitive, revision]);
    const outline = useMemo(() => editorOutline(editor.state.doc), [editor, revision]);
    useEffect(() => {
        const listener = ({ transaction }: { transaction: { docChanged: boolean } }) => { if (transaction.docChanged) { setRevision(value => value + 1); setConfirmAll(false); setMessage(''); } };
        editor.on('transaction', listener);
        const register = () => {
            lastHighlights.current = '';
            editor.unregisterPlugin(highlightKey);
            editor.registerPlugin(new Plugin({ key: highlightKey, state: {
            init: () => DecorationSet.empty,
            apply: (tr, previous) => tr.getMeta(highlightKey) || previous.map(tr.mapping, tr.doc),
            }, props: { decorations: state => highlightKey.getState(state) } }));
        };
        editor.on('mount', register);
        if (!editor.isDestroyed) register();
        return () => { editor.off('mount', register); editor.off('transaction', listener); editor.unregisterPlugin(highlightKey); };
    }, [editor, highlightKey]);
    useEffect(() => {
        const index = Math.min(current, Math.max(0, matches.length - 1));
        const signature = panel === 'find' && matches.length ? `${index}:${matches.map(match => `${match.from}-${match.to}`).join(',')}` : '';
        // An initial empty metadata transaction can trigger document-normalizing
        // plugins. Unopened/empty Find has nothing to render and must stay inert.
        if (editor.isDestroyed || signature === lastHighlights.current) return;
        lastHighlights.current = signature;
        const decorations = panel === 'find' ? matches.map((match, i) => Decoration.inline(match.from, match.to, { class: i === index ? 'rte-find-match rte-find-current' : 'rte-find-match' })) : [];
        editor.view.dispatch(editor.state.tr.setMeta(highlightKey, DecorationSet.create(editor.state.doc, decorations)).setMeta('addToHistory', false));
    }, [editor, highlightKey, matches, current, panel]);
    useEffect(() => {
        if (editor.isDestroyed || panel !== 'find') return;
        setCurrent(0);
        const first = findEditorMatches(editor.state.doc, query, caseSensitive)[0];
        if (first) { editor.commands.setTextSelection(first); editor.view.dispatch(editor.state.tr.scrollIntoView()); }
    }, [editor, query, caseSensitive, panel]);
    useEffect(() => {
        if (panel === 'find') input.current?.focus();
        if (panel === 'outline') region.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }, [panel]);
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if (editor.isDestroyed) return;
            const target = event.target as HTMLElement;
            if (!editor.view.dom.closest('.rte-wrapper')?.contains(target)) return;
            if ((event.ctrlKey || event.metaKey) && !event.altKey) {
                const key = event.key.toLowerCase();
                if (key === 'f' || key === 'h') { event.preventDefault(); setPanel('find'); requestAnimationFrame(() => input.current?.focus()); }
                if (key === 'k') { event.preventDefault(); signalsFor(editor).dispatchEvent(new Event('add-link')); }
            }
        };
        document.addEventListener('keydown', keydown);
        return () => document.removeEventListener('keydown', keydown);
    }, [editor]);
    const close = () => { setPanel(null); editor.commands.focus(); };
    const navigate = (step: number) => {
        if (!matches.length) return;
        const index = (Math.min(current, matches.length - 1) + step + matches.length) % matches.length;
        setCurrent(index);
        editor.commands.setTextSelection(matches[index]);
        editor.view.dispatch(editor.state.tr.scrollIntoView());
    };
    const replace = (all: boolean) => {
        const selected = all ? matches : matches.slice(Math.min(current, matches.length - 1), Math.min(current, matches.length - 1) + 1);
        if (!selected.length) return;
        editor.view.dispatch(replaceEditorMatches(editor.state, selected, replacement));
        setMessage(`${selected.length} ${selected.length === 1 ? 'match' : 'matches'} replaced. Undo restores your words.`);
        setConfirmAll(false);
    };
    return <div className="rte-navigation">
        <div className="rte-navigation-buttons" role="group" aria-label="Manuscript navigation">
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => setPanel(panel === 'find' ? null : 'find')} aria-label="Find and replace" aria-expanded={panel === 'find'} aria-controls={`${id}-panel`} title="Find and replace (Ctrl/Cmd+F)"><Search size={16} /><span>Find</span></button>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => setPanel(panel === 'outline' ? null : 'outline')} aria-label="Outline" aria-expanded={panel === 'outline'} aria-controls={`${id}-panel`}><ListTree size={16} /><span>Outline</span></button>
        </div>
        {panel && <div id={`${id}-panel`} ref={region} className="rte-tool-panel" role="region" aria-label={panel === 'find' ? 'Find and replace' : 'Chapter outline'} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
            <header><strong>{panel === 'find' ? 'Find and replace' : 'Chapter outline'}</strong><button type="button" onClick={close} aria-label={`Close ${panel === 'find' ? 'find and replace' : 'outline'}`}><X size={18} /></button></header>
            {panel === 'find' ? <>
                <div className="rte-find-row"><label htmlFor={`${id}-query`}>Find</label><input ref={input} id={`${id}-query`} value={query} onChange={event => { setQuery(event.target.value); setCurrent(0); setConfirmAll(false); setMessage(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); navigate(event.shiftKey ? -1 : 1); } }} placeholder="Word or phrase" />
                    <button type="button" onClick={() => navigate(-1)} disabled={!matches.length} aria-label="Previous match"><ChevronUp size={18} /></button><button type="button" onClick={() => navigate(1)} disabled={!matches.length} aria-label="Next match"><ChevronDown size={18} /></button>
                </div>
                <div className="rte-find-options"><span role="status" aria-live="polite">{query ? matches.length ? `${Math.min(current + 1, matches.length)} of ${matches.length} matches` : 'No matches' : 'Search this chapter'}</span><label><input type="checkbox" checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setCurrent(0); setConfirmAll(false); }} /> Match case</label></div>
                <div className="rte-find-row"><label htmlFor={`${id}-replacement`}>Replace</label><input id={`${id}-replacement`} value={replacement} onChange={event => { setReplacement(event.target.value); setConfirmAll(false); }} placeholder="Replacement text" /><button type="button" disabled={!matches.length} onClick={() => replace(false)}>Replace</button><button type="button" disabled={!matches.length} onClick={() => setConfirmAll(true)}>Replace all</button></div>
                {confirmAll && <div className="rte-replace-confirm" role="group" aria-label="Confirm replace all"><span>Replace all {matches.length} matches{replacement ? ` with “${replacement}”` : ' with empty text'}?</span><button type="button" onClick={() => setConfirmAll(false)}>Cancel</button><button type="button" onClick={() => replace(true)}>Confirm replace all</button></div>}
                {message && <p role="status">{message}</p>}
            </> : <>{outline.length ? <ol className="rte-outline-list">{outline.map(item => <li key={item.position}><button type="button" style={{ paddingLeft: item.kind === 'heading' ? `${Math.max(0, (item.level || 1) - 1) * 12 + 10}px` : '10px' }} onClick={() => {
                const selection = TextSelection.near(editor.state.doc.resolve(item.position));
                editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView()); editor.commands.focus();
            }}><span>{item.kind === 'scene' ? '— ' : ''}{item.label}</span><small>{item.kind === 'heading' ? `H${item.level}` : 'Scene break'}</small></button></li>)}</ol> : <p>Add headings or scene breaks to navigate your chapter here.</p>}</>}
        </div>}
    </div>;
}
