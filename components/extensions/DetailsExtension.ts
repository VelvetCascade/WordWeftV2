import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom Details node - wraps content in a collapsible <details> element.
 * Renders: <details><summary>…</summary><div data-details-content>…</div></details>
 */

// ─── DetailsSummary Node ────────────────────────────────────────────
export const DetailsSummary = Node.create({
    name: 'detailsSummary',
    content: 'inline*',
    defining: true,
    selectable: false,
    isolating: true,

    parseHTML() {
        return [{ tag: 'summary' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['summary', mergeAttributes(HTMLAttributes), 0];
    },
});

// ─── DetailsContent Node ────────────────────────────────────────────
export const DetailsContent = Node.create({
    name: 'detailsContent',
    content: 'block+',
    defining: true,
    selectable: false,

    parseHTML() {
        return [{ tag: 'div[data-details-content]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-details-content': '' }), 0];
    },
});

// ─── Details Node ───────────────────────────────────────────────────
export const Details = Node.create({
    name: 'details',
    group: 'block',
    content: 'detailsSummary detailsContent',
    defining: true,

    addAttributes() {
        return {
            open: {
                default: true,
                parseHTML: (element) => element.hasAttribute('open'),
                renderHTML: (attributes) => {
                    if (!attributes.open) return {};
                    return { open: 'open' };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'details' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['details', mergeAttributes(HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setDetails: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { open: true },
                    content: [
                        {
                            type: 'detailsSummary',
                            content: [{ type: 'text', text: 'Click to expand' }],
                        },
                        {
                            type: 'detailsContent',
                            content: [{ type: 'paragraph' }],
                        },
                    ],
                });
            },
            unsetDetails: () => ({ commands }) => {
                return commands.lift(this.name);
            },
        };
    },
});
