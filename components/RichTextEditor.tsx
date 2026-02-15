import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Character } from '../types';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    characters: Character[];
    onMentionQuery: (query: string, rect: DOMRect) => void;
    onMentionClose: () => void;
    readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder,
    characters,
    onMentionQuery,
    onMentionClose,
    readOnly = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastValueRef = useRef(value);

    // Convert Markdown to HTML: @[Name](id) -> <span ...>@Name</span>
    const markdownToHtml = useCallback((markdown: string) => {
        let html = markdown
            // Escape HTML characters to prevent XSS and rendering issues
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            // Convert mentions
            .replace(/@\[(.*?)\]\((.*?)\)/g, (match, name, id) => {
                return `<span class="mention" data-id="${id}" contenteditable="false">@${name}</span>`;
            })
            // Convert newlines to br for contenteditable
            .replace(/\n/g, '<br>');

        return html;
    }, []);

    // Convert HTML to Markdown: <span ...>@Name</span> -> @[Name](id)
    const htmlToMarkdown = useCallback((html: string) => {
        // Create a temporary DOM element to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Replace mention spans with markdown format
        const mentions = temp.querySelectorAll('.mention');
        mentions.forEach(span => {
            const id = span.getAttribute('data-id');
            const name = span.textContent?.replace(/^@/, '') || '';
            const textNode = document.createTextNode(`@[${name}](${id})`);
            span.parentNode?.replaceChild(textNode, span);
        });

        // Get text content (handles HTML entities) and convert invisible newlines back
        let markdown = temp.innerText;

        // Fix newline handling if needed (browsers vary on div vs br)
        // temp.innerText usually handles <br> -> \n correctly
        return markdown;
    }, []);

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && value !== lastValueRef.current) {
            // Only update if the value is significantly different to avoid cursor jumps
            // This is a naive check; real robust implementation needs cursor tracking
            const newHtml = markdownToHtml(value);

            if (document.activeElement !== editorRef.current || value === '') {
                editorRef.current.innerHTML = newHtml;
            }
            lastValueRef.current = value;
        }
    }, [value, markdownToHtml]);

    const handleInput = () => {
        if (!editorRef.current) return;

        const html = editorRef.current.innerHTML;
        const markdown = htmlToMarkdown(html);

        lastValueRef.current = markdown;
        onChange(markdown);

        checkForMention(window.getSelection());
    };

    const checkForMention = (selection: Selection | null) => {
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const text = range.startContainer.textContent || '';
        const offset = range.startOffset;

        // Look for @ backwards from cursor
        const textBefore = text.slice(0, offset);
        const lastAt = textBefore.lastIndexOf('@');

        if (lastAt !== -1) {
            const query = textBefore.slice(lastAt + 1);
            // Simple validation: no spaces (start of name), max length
            if (!/\s/.test(query) && query.length < 20) {
                const rect = range.getBoundingClientRect();
                onMentionQuery(query, rect);
                return;
            }
        }
        onMentionClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow default behavior
    };

    return (
        <div
            ref={editorRef}
            contentEditable={!readOnly}
            className="w-full h-full min-h-[50vh] outline-none prose prose-lg lg:prose-xl dark:prose-invert max-w-none whitespace-pre-wrap"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
            style={{ whiteSpace: 'pre-wrap' }}
        />
    );
};
