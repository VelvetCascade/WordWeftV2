import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Flower2, Wind, CloudRain, Sunrise, Moon, Waves } from 'lucide-react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { PluginKey, TextSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';

import { Character } from '../types';
import { MentionList } from './MentionList';
import { Details, DetailsSummary, DetailsContent } from './extensions/DetailsExtension';
import { Spoiler } from './extensions/SpoilerExtension';
import { Footnote } from './extensions/FootnoteExtension';
import { MoodBlock } from './extensions/MoodExtension';
import { WriterTrailingNode } from './extensions/WriterTrailingNode';
import { PullQuote, PullQuoteText, PullQuoteCite } from './extensions/PullQuoteExtension';
import * as api from '../api/client';
import { ImageCropModal } from './ImageCropModal';
import imageCompression from 'browser-image-compression';
import { ResizableImage } from './extensions/ResizableImageExtension';
import { useDialog } from '../hooks/useDialog';
import '../styles/writing-controls.css';
import '../styles/writer-editor-toolkit.css';
import { EditorEntryButton, EditorNavigation, EditorBlockActions, EditorFootnoteActions, preserveEditorSelection } from './EditorToolkit';
import { useWriterEditorState } from '../hooks/useWriterEditorState';
import { captureImageInsertion, mapImageInsertion } from '../utils/editorInsertionPoint';
import { mapEditorEntryTarget, type EditorEntryTarget } from '../utils/editorEntryTarget';

// ─── SVG Icon Components ───────────────────────────────────────────
const Icon: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        className={`w-4 h-4 ${className}`}>
        {children}
    </svg>
);

const BoldIcon = () => <Icon><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></Icon>;
const ItalicIcon = () => <Icon><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></Icon>;
const UnderlineIcon = () => <Icon><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></Icon>;
const StrikethroughIcon = () => <Icon><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" y1="12" x2="20" y2="12" /></Icon>;
const CodeIcon = () => <Icon><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Icon>;
const Heading1Icon = () => <Icon><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 12l3-2v8" /></Icon>;
const Heading2Icon = () => <Icon><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" /></Icon>;
const Heading3Icon = () => <Icon><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" /><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" /></Icon>;
const ListBulletIcon = () => <Icon><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Icon>;
const ListOrderedIcon = () => <Icon><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Icon>;
const QuoteIcon = () => <Icon><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></Icon>;
const HorizontalRuleIcon = () => <Icon><line x1="2" y1="12" x2="22" y2="12" /></Icon>;
const ImageIconSvg = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Icon>;
const TableIconSvg = () => <Icon><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" /></Icon>;
const LinkIconSvg = () => <Icon><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Icon>;
const UnlinkIcon = () => <Icon><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" /><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" /><line x1="8" y1="2" x2="8" y2="5" /><line x1="2" y1="8" x2="5" y2="8" /><line x1="16" y1="19" x2="16" y2="22" /><line x1="19" y1="16" x2="22" y2="16" /></Icon>;
const UndoIcon = () => <Icon><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></Icon>;
const RedoIcon = () => <Icon><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Icon>;
const CodeBlockIcon = () => <Icon><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Icon>;
const DetailsIcon = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 8l4 4-4 4" /></Icon>;
const SpoilerIcon = () => <Icon><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /></Icon>;
const FootnoteIcon = () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon>;
const MoodIcon = () => <Icon><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></Icon>;
const PullQuoteIcon = () => <Icon><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1" /></Icon>;

// ─── Toolbar Button ────────────────────────────────────────────────
interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}
const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, disabled, title, children }) => (
    <button
        type="button"
        data-editor-command="true"
        data-tool-label={title.replace(/\s*\([^)]*\)$/, '')}
        onPointerDown={preserveEditorSelection}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        aria-pressed={isActive === undefined ? undefined : isActive}
        className={`rte-toolbar-btn ${isActive ? 'rte-toolbar-btn-active' : ''}`}
    >
        {children}
    </button>
);

const ToolbarGroup: React.FC<{ label: string; primary?: boolean; children: React.ReactNode }> = ({ label, primary, children }) => (
    <div className={`rte-toolbar-group ${primary ? 'rte-toolbar-group-primary' : ''}`} role="group" aria-label={label} data-label={label}>
        {children}
    </div>
);

// ─── Mood Picker — Immersive Grid ──────────────────────────────────
const MOOD_OPTIONS = [
    { mood: 'romantic', Icon: Flower2, label: 'Romantic', detail: 'Drifting petals' },
    { mood: 'tense', Icon: Wind, label: 'Tense', detail: 'Gathering storm' },
    { mood: 'melancholy', Icon: CloudRain, label: 'Melancholy', detail: 'Falling rain' },
    { mood: 'triumphant', Icon: Sunrise, label: 'Triumphant', detail: 'Rising light' },
    { mood: 'eerie', Icon: Moon, label: 'Eerie', detail: 'Drifting mist' },
    { mood: 'serene', Icon: Waves, label: 'Serene', detail: 'Quiet haze' },
] as const;

const MoodPicker: React.FC<{ editor: Editor; label?: string; contextual?: boolean }> = ({ editor, label = 'Atmosphere', contextual = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState('');
    const selectionRef = useRef<EditorEntryTarget>({ from: 0, to: 0, notePosition: null, deleted: false });
    const openRef = useRef(false);
    const close = () => { openRef.current = false; setIsOpen(false); };
    const id = useId();
    const dialogRef = useDialog(isOpen, close);
    useEffect(() => {
        const followPassage = ({ transaction }: { transaction: import('@tiptap/pm/state').Transaction }) => {
            if (openRef.current) selectionRef.current = mapEditorEntryTarget(selectionRef.current, transaction);
        };
        editor.on('transaction', followPassage);
        return () => { editor.off('transaction', followPassage); openRef.current = false; };
    }, [editor]);
    const context = useWriterEditorState(editor);
    const inMood = !!context?.hasAtmosphere;
    const currentMood = context?.mood;
    const apply = (action: 'set' | 'remove' | 'end', mood?: string) => {
        if (selectionRef.current.deleted) { setError('The selected passage changed. Close this picker and select the passage again.'); return; }
        const chain = editor.chain().focus().setTextSelection(selectionRef.current).command(({ tr }) => { closeHistory(tr); return true; });
        if (action === 'remove') chain.unsetMoodBlock().run();
        else if (action === 'end') chain.endMoodBlock().run();
        else chain.setMoodBlock(mood!).run();
        close();
        requestAnimationFrame(() => editor.commands.focus());
    };
    return <>
        <button type="button" onPointerDown={preserveEditorSelection} onClick={() => {
            if (openRef.current) { close(); return; }
            selectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to, notePosition: null, deleted: false };
            setError(''); openRef.current = true; setIsOpen(true);
        }}
            className={`rte-toolbar-btn rte-atmosphere-trigger ${inMood || isOpen ? 'rte-toolbar-btn-active' : ''}`} title="Set atmosphere" aria-label={contextual ? 'Set atmosphere for selection' : label === 'Change' ? 'Change atmosphere' : 'Set atmosphere'} aria-haspopup="dialog" aria-expanded={isOpen}><MoodIcon /><span>{label}</span></button>
        {isOpen && createPortal(<div className="rte-mood-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
            <div className="rte-mood-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
                <header><h2 id={`${id}-title`}>Passage atmosphere</h2><button type="button" aria-label="Close atmosphere picker" onClick={close}><X size={20} aria-hidden="true" /></button></header>
                <p>{selectionRef.current.from !== selectionRef.current.to ? 'Apply an atmosphere to the selected paragraphs or story blocks. Partial paragraphs are included in full; surrounding paragraphs keep their atmosphere.' : inMood ? 'Change the atmosphere of this entire passage, or continue writing outside it.' : 'Apply an atmosphere to the paragraph or story block at your cursor. Continue writing inside it for a longer passage.'} Your words and formatting stay unchanged.</p>
                <div className="rte-mood-options">{MOOD_OPTIONS.map(({ mood, Icon: Symbol, label, detail }) => <button key={mood} type="button" className={`rte-mood-option rte-mood-option--${mood}`} aria-label={label} aria-pressed={inMood && currentMood === mood} onClick={() => apply('set', mood)}><Symbol size={24} aria-hidden="true" /><span>{label}</span><small>{detail}</small></button>)}</div>
                {inMood && <div className="rte-mood-section-actions">{selectionRef.current.from === selectionRef.current.to && <button type="button" onClick={() => apply('end')}>Continue without a mood</button>}<button type="button" onClick={() => apply('remove')}>{selectionRef.current.from !== selectionRef.current.to ? 'Remove atmosphere from selection' : 'Remove this atmosphere'}</button></div>}
                {error && <p role="alert" className="rte-tool-error">{error}</p>}
                <p className="rte-mood-help">Lists, tables, and collapsible sections each count as one story block. To finish a passage, press Enter on an empty final paragraph. Check the motion in Reader preview.</p>
            </div>
        </div>, document.body)}
    </>;
};

// ─── Menu Bar ──────────────────────────────────────────────────────
const MenuBar = ({ editor, addImage, imageUploading }: { editor: Editor | null; addImage: () => void; imageUploading: boolean }) => {
    const context = useWriterEditorState(editor);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [overflow, setOverflow] = useState(false);
    const [scrollEnd, setScrollEnd] = useState(false);
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        const update = () => { setOverflow(element.scrollWidth > element.clientWidth + 2); setScrollEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 2); };
        const observer = new ResizeObserver(update);
        observer.observe(element); element.addEventListener('scroll', update); update();
        return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
    }, [editor]);
    if (!editor || !context) return null;

    const currentBlockStyle = context.blockStyle;

    const setBlockStyle = (style: string) => {
        const chain = editor.chain().focus();
        if (style === 'heading-1') chain.setHeading({ level: 1 }).run();
        else if (style === 'heading-2') chain.setHeading({ level: 2 }).run();
        else if (style === 'heading-3') chain.setHeading({ level: 3 }).run();
        else chain.setParagraph().run();
    };

    return (
        <div className="rte-toolbar rte-toolkit" role="toolbar" aria-label="Chapter formatting" onKeyDown={event => {
            if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="dialog"]')) return;
            if (event.key === 'Escape') { setShowMore(false); setShowShortcuts(false); editor.commands.focus(); }
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || (event.target as HTMLElement).tagName !== 'BUTTON') return;
            const row = (event.target as HTMLElement).closest('.rte-toolbar-main, .rte-more-tools');
            if (!row) return;
            const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button:not([disabled])')).filter(button => button.getClientRects().length);
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0 || !buttons.length) return;
            event.preventDefault(); buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
        }}>
            <div className="rte-toolbar-main">
            <div className="rte-toolbar-scroll-wrap">
            <div ref={scrollRef} className="rte-toolbar-scroll" aria-label="Core formatting; scroll for more options">
                <ToolbarGroup label="Text formatting" primary>
                    <label className="rte-block-style-label">
                        <span className="sr-only">Text style</span>
                        <select value={currentBlockStyle} onChange={(event) => setBlockStyle(event.target.value)} aria-label="Text style" disabled={!context.canChangeStyle || currentBlockStyle === 'image'}>
                            {currentBlockStyle === 'image' && <option value="image">Image selected</option>}
                            {currentBlockStyle === 'mixed' && <option value="mixed" disabled>Mixed styles</option>}
                            {currentBlockStyle === 'code-block' && <option value="code-block" disabled>Code block</option>}
                            <option value="paragraph">Paragraph</option>
                            <option value="heading-1">Heading 1</option>
                            <option value="heading-2">Heading 2</option>
                            <option value="heading-3">Heading 3</option>
                        </select>
                    </label>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!context.canBold} isActive={context.bold} title="Bold (Ctrl+B)">
                        <BoldIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!context.canItalic} isActive={context.italic} title="Italic (Ctrl+I)">
                        <ItalicIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!context.canUnderline} isActive={context.underline} title="Underline (Ctrl+U)">
                        <UnderlineIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!context.canStrike} isActive={context.strike} title="Strikethrough">
                        <StrikethroughIcon />
                    </ToolbarButton>
                </ToolbarGroup>

                <MoodPicker editor={editor} />
                <EditorEntryButton editor={editor} kind="link" shortcut><LinkIconSvg /></EditorEntryButton>
            </div>
            {overflow && <button className="rte-scroll-cue" type="button" onPointerDown={preserveEditorSelection} aria-label={scrollEnd ? 'Scroll to first formatting tools' : 'Scroll to more formatting tools'} onClick={() => scrollRef.current?.scrollBy({ left: scrollEnd ? -scrollRef.current.scrollWidth : 180, behavior: 'auto' })}>{scrollEnd ? '‹' : '›'}</button>}
            </div>
            <EditorNavigation editor={editor} />
            <div className="rte-toolbar-pinned" role="group" aria-label="History and more tools">
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl/Cmd+Z)"><UndoIcon /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl/Cmd+Shift+Z)"><RedoIcon /></ToolbarButton>
                <button type="button" onPointerDown={preserveEditorSelection} className="rte-more-trigger" onClick={() => setShowMore(!showMore)} aria-expanded={showMore} aria-controls="rte-more-tools">More <span aria-hidden="true">{showMore ? '−' : '+'}</span></button>
            </div>
            </div>
            {showMore && <div className="rte-more-tools" id="rte-more-tools" onClick={event => {
                if ((event.target as HTMLElement).closest('button[data-editor-command]')) setShowMore(false);
            }}>
                <ToolbarGroup label="More text options">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} disabled={!context.canCode} isActive={context.code} title="Inline code">
                        <CodeIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()} disabled={!context.canSpoiler} isActive={context.spoiler} title="Hidden or spoiler text">
                        <SpoilerIcon />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup label="Lists">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={context.bulletList} title="Bullet list">
                        <ListBulletIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={context.orderedList} title="Numbered list">
                        <ListOrderedIcon />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup label="Story blocks">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={context.blockquote} title="Blockquote">
                        <QuoteIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={context.codeBlock} title="Code block">
                        <CodeBlockIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Scene break">
                        <HorizontalRuleIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => (editor.chain().focus() as any).setDetails().run()} isActive={context.details} title="Collapsible section">
                        <DetailsIcon />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => (editor.chain().focus() as any).insertPullQuote().run()} disabled={!context.canPullQuote} isActive={context.pullQuote} title="Pull quote or epigraph">
                        <PullQuoteIcon />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup label="Insert">
                    {context.link && (
                        <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
                            <UnlinkIcon />
                        </ToolbarButton>
                    )}
                    <ToolbarButton onClick={addImage} disabled={imageUploading} title={imageUploading ? 'Image upload in progress' : 'Insert image'}>
                        <ImageIconSvg />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">
                        <TableIconSvg />
                    </ToolbarButton>
                    <EditorEntryButton editor={editor} kind="footnote"><FootnoteIcon /></EditorEntryButton>
                </ToolbarGroup>

                    <button
                        type="button"
                        className={`rte-toolbar-help ${showShortcuts ? 'active' : ''}`}
                        onClick={() => setShowShortcuts((visible) => !visible)}
                        aria-expanded={showShortcuts}
                        aria-controls="rte-shortcuts-panel"
                        title="Formatting shortcuts"
                    >
                        <span aria-hidden="true">?</span>
                        <span>Shortcuts</span>
                    </button>
            </div>}
            {context.hasAtmosphere && <div className="rte-atmosphere-context" role="group" aria-label="Current passage atmosphere">
                <span>{context.mixedAtmosphere ? 'Mixed atmospheres' : `${MOOD_OPTIONS.find(option => option.mood === context.mood)?.label || 'Passage'} atmosphere`}</span>
                <MoodPicker editor={editor} label="Change" />
                <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().unsetMoodBlock().run()}>Remove atmosphere</button>
                {context.selectionEmpty && <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().endMoodBlock().run()}>Continue without atmosphere</button>}
                <small>{context.selectionEmpty ? 'Whole passage at cursor' : context.passageCount > 1 ? `Selected blocks · ${context.passageCount} passages` : 'Selected blocks only'}</small>
            </div>}
            <EditorBlockActions editor={editor} />
            <EditorFootnoteActions editor={editor} />

            {context.table && (
                <div className="rte-table-toolbar" role="toolbar" aria-label="Table editing">
                    <strong>Table</strong>
                    <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).addRowAfter().run()}>Row below</button>
                    <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).addColumnAfter().run()}>Column right</button>
                    <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).toggleHeaderRow().run()}>Header row</button>
                    <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).deleteRow().run()}>Delete row</button>
                    <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).deleteColumn().run()}>Delete column</button>
                    <button type="button" className="danger" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).deleteTable().run()}>Delete table</button>
                </div>
            )}

            {showShortcuts && (
                <div id="rte-shortcuts-panel" className="rte-shortcuts-panel" role="status">
                    <span>Use Ctrl on Windows/Linux, ⌘ on Mac.</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>B</kbd> Bold</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>I</kbd> Italic</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>U</kbd> Underline</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd> Undo</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> Redo</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>F</kbd> Find / replace</span>
                    <span><kbd>Ctrl/⌘</kbd> + <kbd>K</kbd> Link</span>
                    <span><kbd>Esc</kbd> Close a tool panel</span>
                    <span>Atmosphere: Enter on an empty final paragraph to exit.</span>
                    <span>Select text for quick formatting</span>
                </div>
            )}
        </div>
    );
};

// ─── Bubble Menu Buttons (rendered into a portal element) ──────────
const BubbleMenuContent: React.FC<{ editor: Editor }> = ({ editor }) => {
    const context = useWriterEditorState(editor);
    if (!context) return null;
    return (
        <>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().toggleBold().run()} disabled={!context.canBold} aria-pressed={context.bold} className={context.bold ? 'is-active' : ''} title="Bold" aria-label="Bold">
                <BoldIcon />
            </button>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!context.canItalic} aria-pressed={context.italic} className={context.italic ? 'is-active' : ''} title="Italic" aria-label="Italic">
                <ItalicIcon />
            </button>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!context.canUnderline} aria-pressed={context.underline} className={context.underline ? 'is-active' : ''} title="Underline" aria-label="Underline">
                <UnderlineIcon />
            </button>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!context.canStrike} aria-pressed={context.strike} className={context.strike ? 'is-active' : ''} title="Strikethrough" aria-label="Strikethrough">
                <StrikethroughIcon />
            </button>
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => editor.chain().focus().toggleCode().run()} disabled={!context.canCode} aria-pressed={context.code} className={context.code ? 'is-active' : ''} title="Inline Code" aria-label="Inline Code">
                <CodeIcon />
            </button>
            <EditorEntryButton editor={editor} kind="link"><LinkIconSvg /></EditorEntryButton>
            <MoodPicker editor={editor} contextual />
            <button type="button" onPointerDown={preserveEditorSelection} onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()} disabled={!context.canSpoiler} aria-pressed={context.spoiler} className={context.spoiler ? 'is-active' : ''} title="Spoiler" aria-label="Spoiler">
                <SpoilerIcon />
            </button>
        </>
    );
};

// ─── Component Props ───────────────────────────────────────────────
interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    characters: Character[];
    readOnly?: boolean;
    onLargePaste?: (text: string) => void;
    bookId?: string;
    manuscriptHeader?: React.ReactNode;
    manuscriptFooter?: React.ReactNode;
}

// ─── Main Component ────────────────────────────────────────────────
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    characters,
    readOnly = false,
    onLargePaste,
    bookId,
    manuscriptHeader,
    manuscriptFooter,
}) => {
    const [bubbleMenuElement, setBubbleMenuElement] = useState<HTMLDivElement | null>(null);
    const [rteCropFile, setRteCropFile] = useState<File | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [imageUploadError, setImageUploadError] = useState('');
    const [retryImageFile, setRetryImageFile] = useState<File | null>(null);
    const imageUploadingRef = useRef(false);
    const imageInsertRef = useRef<number | null>(null);
    const externalValueRef = useRef(value);

    // Use a ref so the mention suggestion always sees the *latest* characters,
    // even though useEditor freezes extensions config at mount time.
    const charactersRef = useRef<Character[]>(characters);
    useEffect(() => {
        charactersRef.current = characters;
    }, [characters]);

    const suggestion = {
        items: ({ query }: { query: string }) => {
            return charactersRef.current
                .filter((item) => item.name.toLowerCase().startsWith(query.toLowerCase()))
                .slice(0, 5);
        },
        render: () => {
            let component: any;
            let popup: any;

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(MentionList, {
                        props,
                        editor: props.editor,
                    });
                    if (!props.clientRect) return;
                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                    });
                },
                onUpdate(props: any) {
                    component.updateProps(props);
                    if (!props.clientRect) return;
                    popup[0].setProps({ getReferenceClientRect: props.clientRect });
                },
                onKeyDown(props: any) {
                    if (props.event.key === 'Escape') {
                        popup[0].hide();
                        return true;
                    }
                    return component.ref?.onKeyDown(props);
                },
                onExit() {
                    popup[0].destroy();
                    component.destroy();
                },
            };
        },
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: false,
                underline: false,
                trailingNode: false,
            }),
            WriterTrailingNode,
            Underline,
            ResizableImage,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'rte-link',
                },
            }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Placeholder.configure({
                placeholder: 'Start writing your story…',
            }),
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                // @ opens the picker; it is not part of the author's prose.
                renderText({ node }) { return node.attrs.label ?? node.attrs.id; },
                renderHTML({ node, options }) { return ['span', options.HTMLAttributes, node.attrs.label ?? node.attrs.id]; },
                suggestion,
            }),
            Details,
            DetailsSummary,
            DetailsContent,
            Spoiler,
            Footnote,
            MoodBlock,
            PullQuote,
            PullQuoteText,
            PullQuoteCite,
        ],
        content: value,
        editable: !readOnly,
        onUpdate: ({ editor: ed }) => {
            onChange(ed.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'rte-content',
                'aria-label': 'Chapter manuscript',
                spellcheck: 'true',
                autocapitalize: 'sentences',
            },
            handlePaste: (view, event) => {
                if (onLargePaste) {
                    const pastedText = event.clipboardData?.getData('text/plain') || '';
                    if (pastedText.length >= 200) {
                        onLargePaste(pastedText);
                    }
                }
                return false;
            }
        },
    });

    // The plugin moves its host into an overlay. React owns only the portal's
    // contents, so upload/status renders never insert before a relocated node.
    useEffect(() => {
        const element = document.createElement('div');
        element.className = 'rte-bubble-menu';
        element.style.visibility = 'hidden'; element.style.opacity = '0';
        setBubbleMenuElement(element);
        return () => { element.remove(); };
    }, []);

    // Register BubbleMenu plugin after editor and detached host are ready.
    useEffect(() => {
        if (!editor || !bubbleMenuElement || readOnly) return;

        const pluginKey = new PluginKey('customBubbleMenu');
        const plugin = BubbleMenuPlugin({
            pluginKey,
            editor,
            element: bubbleMenuElement,
            updateDelay: 100,
            shouldShow: ({ view, state, from, to }) => editor.isEditable
                && (view.hasFocus() || bubbleMenuElement.contains(document.activeElement))
                && state.selection instanceof TextSelection && !state.selection.empty
                && state.doc.textBetween(from, to).length > 0,
        });

        editor.registerPlugin(plugin);

        return () => {
            editor.unregisterPlugin(pluginKey);
        };
    }, [editor, readOnly, bubbleMenuElement]);

    useEffect(() => {
        // Tiptap normalizes HTML attributes/classes at its first parse. Reapplying
        // the same server value is not an edit and can activate append plugins.
        if (!editor || externalValueRef.current === value) return;
        externalValueRef.current = value;
        if (editor && editor.getHTML() !== value) {
            if (editor.isEmpty && value === '<p></p>') return;
            if (!editor.isFocused) {
                editor.commands.setContent(value, { emitUpdate: false });
            }
        }
    }, [value, editor]);

    const addImage = useCallback(() => {
        if (imageUploadingRef.current || !editor || editor.isDestroyed) return;
        // Remember the chosen insertion point, not whichever cursor happens to
        // be active when an asynchronous upload finishes. Never replace prose.
        imageInsertRef.current = captureImageInsertion(editor.state);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.oncancel = () => { imageInsertRef.current = null; };
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                setImageUploadError('');
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                    setImageUploadError('Choose a JPG, PNG, or WEBP image.');
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    setImageUploadError('This image is over 5 MB. Choose a smaller file and try again.');
                    return;
                }
                // Open crop modal for inline images (free-form)
                setRteCropFile(file);
            }
        };
        input.click();
    }, [editor]);

    useEffect(() => {
        if (!editor) return;
        const mapInsertion = ({ transaction }: { transaction: import('@tiptap/pm/state').Transaction }) => {
            if (transaction.docChanged && imageInsertRef.current !== null) imageInsertRef.current = mapImageInsertion(imageInsertRef.current, transaction);
        };
        editor.on('transaction', mapInsertion);
        return () => { editor.off('transaction', mapInsertion); imageInsertRef.current = null; };
    }, [editor]);

    const handleRteCropConfirm = useCallback(async (croppedFile: File) => {
        if (imageUploadingRef.current) return;
        setRteCropFile(null);
        imageUploadingRef.current = true;
        setImageUploading(true);
        setImageUploadProgress(5);
        setImageUploadError('');
        setRetryImageFile(croppedFile);
        try {
            // Compress to WebP (< 500KB, max 1920px) before uploading
            const compressed = await imageCompression(croppedFile, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/webp',
            });
            setImageUploadProgress(20);
            const originalBase = (croppedFile.name || 'chapter-image').replace(/\.[^.]+$/, '');
            const uploadFile = new File([compressed], `${originalBase}.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
            });
            let res: { url: string };
            if (bookId) {
                res = await api.uploadChapterImage(bookId, uploadFile, (providerProgress) => {
                    setImageUploadProgress(20 + Math.round(providerProgress * 0.8));
                });
            } else {
                const formData = new FormData();
                formData.append('file', uploadFile);
                res = await api.uploadFile(formData, (providerProgress) => {
                    setImageUploadProgress(20 + Math.round(providerProgress * 0.8));
                });
            }
            if (editor && !editor.isDestroyed && res?.url && imageInsertRef.current !== null) {
                const insertion = imageInsertRef.current;
                const writingCursor = editor.state.selection.getBookmark();
                imageInsertRef.current = null;
                editor.chain().insertContentAt(insertion, { type: 'image', attrs: { src: res.url, width: 75, alignment: 'center' } })
                    .command(({ tr }) => { tr.setSelection(writingCursor.map(tr.mapping).resolve(tr.doc)); return true; }).run();
                setRetryImageFile(null);
                setImageUploadProgress(100);
            }
        } catch (error) {
            console.error('Failed to upload image', error);
            const uploadError = error as Error & { status?: number; diagnostic?: string };
            setImageUploadError(uploadError.message || 'The image could not be uploaded. Please try again.');
        } finally {
            imageUploadingRef.current = false;
            setImageUploading(false);
        }
    }, [editor, bookId]);

    return (
        <>
        <div className="rte-wrapper">
            {!readOnly && <MenuBar editor={editor} addImage={addImage} imageUploading={imageUploading} />}

            {!readOnly && imageUploading && (
                <div className="rte-image-upload-status" role="status" aria-live="polite">
                    <span>Uploading chapter image…</span>
                    <div><i style={{ width: `${imageUploadProgress}%` }} /></div>
                    <strong>{imageUploadProgress}%</strong>
                </div>
            )}
            {!readOnly && imageUploadError && (
                <div className="rte-image-upload-error" role="alert">
                    <span>{imageUploadError}</span>
                    {retryImageFile && (
                        <button type="button" onClick={() => handleRteCropConfirm(retryImageFile)} disabled={imageUploading}>
                            Retry image upload
                        </button>
                    )}
                </div>
            )}

            {editor && !readOnly && bubbleMenuElement && createPortal(<BubbleMenuContent editor={editor} />, bubbleMenuElement)}

            <div className="rte-document">
                {manuscriptHeader}
                <div className="rte-editor-area">
                    <EditorContent editor={editor} />
                </div>
                {manuscriptFooter}
            </div>
        </div>

        {/* Image Crop Modal for in-editor images */}
        {rteCropFile && (
            <ImageCropModal
                file={rteCropFile}
                contextLabel="Chapter Image"
                onConfirm={handleRteCropConfirm}
                onCancel={() => { imageInsertRef.current = null; setRteCropFile(null); }}
            />
        )}
    </>
    );
};
