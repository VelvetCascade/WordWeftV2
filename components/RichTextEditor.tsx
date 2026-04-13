import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { PluginKey } from '@tiptap/pm/state';

import { Character } from '../types';
import { MentionList } from './MentionList';
import { Details, DetailsSummary, DetailsContent } from './extensions/DetailsExtension';
import { Spoiler } from './extensions/SpoilerExtension';
import { Footnote } from './extensions/FootnoteExtension';
import { MoodBlock } from './extensions/MoodExtension';
import { PullQuote, PullQuoteText, PullQuoteCite } from './extensions/PullQuoteExtension';
import * as api from '../api/client';
import { ImageCropModal } from './ImageCropModal';
import imageCompression from 'browser-image-compression';

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
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`rte-toolbar-btn ${isActive ? 'rte-toolbar-btn-active' : ''}`}
    >
        {children}
    </button>
);

const Divider = () => <div className="rte-toolbar-divider" />;

// ─── Mood Picker — Immersive Grid ──────────────────────────────────
const MOOD_OPTIONS = [
    { mood: 'romantic', emoji: '🌹', label: 'Romantic' },
    { mood: 'tense', emoji: '⚡', label: 'Tense' },
    { mood: 'melancholy', emoji: '🌧️', label: 'Melancholy' },
    { mood: 'triumphant', emoji: '🎉', label: 'Triumphant' },
    { mood: 'eerie', emoji: '👻', label: 'Eerie' },
    { mood: 'serene', emoji: '🍃', label: 'Serene' },
] as const;

const MoodPicker: React.FC<{ editor: Editor }> = ({ editor }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    return (
        <div className="relative" ref={panelRef}>
            <ToolbarButton
                onClick={() => setIsOpen(!isOpen)}
                isActive={editor.isActive('moodBlock') || isOpen}
                title="Set Atmosphere / Mood"
            >
                <MoodIcon />
            </ToolbarButton>

            <div className={`mood-picker-panel ${isOpen ? 'mood-picker-panel--open' : ''}`}>
                <div className="mood-picker-panel__title">🎭 Set Atmosphere</div>
                <div className="mood-picker-grid">
                    {MOOD_OPTIONS.map(({ mood, emoji, label }) => (
                        <button
                            key={mood}
                            type="button"
                            className={`mood-picker-card mood-picker-card--${mood}`}
                            onClick={() => {
                                (editor.chain().focus() as any).insertMoodBlock(mood).run();
                                setIsOpen(false);
                            }}
                        >
                            <span className="mood-picker-card__emoji">{emoji}</span>
                            <span className="mood-picker-card__label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Menu Bar ──────────────────────────────────────────────────────
const MenuBar = ({ editor, addImage }: { editor: Editor | null; addImage: () => void }) => {
    if (!editor) return null;

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter URL:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="rte-toolbar">
            {/* Text Formatting */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Ctrl+B)">
                <BoldIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Ctrl+I)">
                <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)">
                <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
                <StrikethroughIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Inline Code">
                <CodeIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()} isActive={editor.isActive('spoiler')} title="Hidden/Spoiler Text">
                <SpoilerIcon />
            </ToolbarButton>

            <Divider />

            {/* Headings */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
                <Heading1Icon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
                <Heading2Icon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
                <Heading3Icon />
            </ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                <ListBulletIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
                <ListOrderedIcon />
            </ToolbarButton>

            <Divider />

            {/* Block Elements */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
                <QuoteIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
                <CodeBlockIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
                <HorizontalRuleIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => (editor.chain().focus() as any).setDetails().run()} isActive={editor.isActive('details')} title="Collapsible Block">
                <DetailsIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => (editor.chain().focus() as any).insertPullQuote().run()} isActive={editor.isActive('pullQuote')} title="Pull Quote / Epigraph">
                <PullQuoteIcon />
            </ToolbarButton>

            <Divider />

            {/* Mood Atmosphere — Immersive Picker */}
            <MoodPicker editor={editor} />

            <Divider />

            {/* Inserts */}
            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Add Link">
                <LinkIconSvg />
            </ToolbarButton>
            {editor.isActive('link') && (
                <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
                    <UnlinkIcon />
                </ToolbarButton>
            )}
            <ToolbarButton onClick={addImage} title="Insert Image">
                <ImageIconSvg />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
                <TableIconSvg />
            </ToolbarButton>
            <ToolbarButton onClick={() => {
                const note = window.prompt('Enter footnote / author\'s note:');
                if (note) (editor.chain().focus() as any).insertFootnote({ note }).run();
            }} title="Add Footnote">
                <FootnoteIcon />
            </ToolbarButton>

            <Divider />

            {/* History */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
                <UndoIcon />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
                <RedoIcon />
            </ToolbarButton>
        </div>
    );
};

// ─── Bubble Menu Buttons (rendered into a portal element) ──────────
const BubbleMenuContent: React.FC<{ editor: Editor }> = ({ editor }) => {
    return (
        <>
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold">
                <BoldIcon />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic">
                <ItalicIcon />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} title="Underline">
                <UnderlineIcon />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
                <StrikethroughIcon />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Inline Code">
                <CodeIcon />
            </button>
            <button type="button" onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
            }} className={editor.isActive('link') ? 'is-active' : ''} title="Link">
                <LinkIconSvg />
            </button>
            <button type="button" onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()} className={editor.isActive('spoiler') ? 'is-active' : ''} title="Spoiler">
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
}

// ─── Main Component ────────────────────────────────────────────────
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    characters,
    readOnly = false,
    onLargePaste,
}) => {
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const [rteCropFile, setRteCropFile] = useState<File | null>(null);

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
            }),
            Underline,
            Image,
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
                renderLabel({ options, node }) {
                    return `${options.suggestion.char || '@'}${node.attrs.label ?? node.attrs.id}`;
                },
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

    // Register BubbleMenu plugin after editor is ready
    useEffect(() => {
        if (!editor || !bubbleMenuRef.current || readOnly) return;

        const pluginKey = new PluginKey('customBubbleMenu');
        const plugin = BubbleMenuPlugin({
            pluginKey,
            editor,
            element: bubbleMenuRef.current,
            updateDelay: 100,
        });

        editor.registerPlugin(plugin);

        return () => {
            editor.unregisterPlugin(pluginKey);
        };
    }, [editor, readOnly]);

    useEffect(() => {
        if (editor && value && editor.getHTML() !== value) {
            if (editor.isEmpty && value === '<p></p>') return;
            if (!editor.isFocused) {
                editor.commands.setContent(value);
            }
        }
    }, [value, editor]);

    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                // Open crop modal for inline images (free-form)
                setRteCropFile(file);
            }
        };
        input.click();
    }, [editor]);

    const handleRteCropConfirm = useCallback(async (croppedFile: File) => {
        setRteCropFile(null);
        try {
            // Compress before uploading
            const compressed = await imageCompression(croppedFile, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            });
            const formData = new FormData();
            formData.append('file', compressed);
            const res = await api.uploadFile(formData);
            if (editor) {
                editor.chain().focus().setImage({ src: res.url }).run();
            }
        } catch (error) {
            console.error('Failed to upload image', error);
            alert('Failed to upload image. Please try again.');
        }
    }, [editor]);

    return (
        <>
        <div className="rte-wrapper">
            {!readOnly && <MenuBar editor={editor} addImage={addImage} />}

            {/* BubbleMenu element — positioned by BubbleMenuPlugin */}
            {editor && !readOnly && (
                <div ref={bubbleMenuRef} className="rte-bubble-menu" style={{ visibility: 'hidden', opacity: 0 }}>
                    <BubbleMenuContent editor={editor} />
                </div>
            )}

            <div className="rte-editor-area">
                <EditorContent editor={editor} />
            </div>
        </div>

        {/* Image Crop Modal for in-editor images */}
        {rteCropFile && (
            <ImageCropModal
                file={rteCropFile}
                contextLabel="Chapter Image"
                onConfirm={handleRteCropConfirm}
                onCancel={() => setRteCropFile(null)}
            />
        )}
    </>
    );
};
