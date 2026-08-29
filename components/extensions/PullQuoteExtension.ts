import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Pull Quote / Epigraph Extension — decorative typography block.
 * 
 * Beautiful center-aligned block with oversized decorative quotation marks
 * and optional attribution line. Uses two child nodes: quote content + citation.
 *
 * HTML output: <blockquote data-pullquote="true"><p>quote</p><cite>attribution</cite></blockquote>
 */
export const PullQuote = Node.create({
    name: 'pullQuote',
    group: 'block',
    content: 'pullQuoteText pullQuoteCite',
    defining: false,
    isolating: false,
    allowGapCursor: true,

    parseHTML() {
        return [{ tag: 'blockquote[data-pullquote]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'blockquote',
            mergeAttributes(HTMLAttributes, {
                'data-pullquote': 'true',
                class: 'pull-quote',
            }),
            0,
        ];
    },

    addKeyboardShortcuts() {
        return {
            // Enter inside the cite → exit the pull quote, create paragraph after
            'Enter': ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                // Check if we're in a pullQuoteCite
                let inCite = false;
                let pullQuoteDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === 'pullQuoteCite') {
                        inCite = true;
                    }
                    if ($from.node(d).type.name === this.name) {
                        pullQuoteDepth = d;
                        break;
                    }
                }

                // If in the cite node, Enter creates a paragraph after the pull quote
                if (inCite && pullQuoteDepth > 0) {
                    const endPos = $from.end(pullQuoteDepth) + 1;
                    const { tr } = state;
                    tr.insert(endPos, state.schema.nodes.paragraph.create());
                    tr.setSelection(TextSelection.near(tr.doc.resolve(endPos + 1)));
                    editor.view.dispatch(tr);
                    return true;
                }

                return false;
            },

            // Backspace at start of pullQuoteText → delete the entire pull quote block
            'Backspace': ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                let inQuoteText = false;
                let pullQuoteDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === 'pullQuoteText') {
                        inQuoteText = true;
                    }
                    if ($from.node(d).type.name === this.name) {
                        pullQuoteDepth = d;
                        break;
                    }
                }

                if (!inQuoteText || pullQuoteDepth < 0) return false;

                // If at start of pullQuoteText and text is empty or at pos 0
                const startOfPQ = $from.start(pullQuoteDepth);
                if ($from.pos <= startOfPQ + 1 && $from.parent.textContent.length === 0) {
                    // Delete the entire pull quote and insert an empty paragraph
                    const { tr } = state;
                    const from = $from.before(pullQuoteDepth);
                    const to = $from.after(pullQuoteDepth);
                    tr.replaceWith(from, to, state.schema.nodes.paragraph.create());
                    tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1)));
                    editor.view.dispatch(tr);
                    return true;
                }

                return false;
            },

            // Delete at end of cite → do nothing (prevent merging with the next block)
            'Delete': ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                let inCite = false;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === 'pullQuoteCite') {
                        inCite = true;
                        break;
                    }
                }

                if (inCite) {
                    const endOfParent = $from.end($from.depth);
                    if ($from.pos === endOfParent) {
                        return true; // Consume Delete at end of cite to prevent corruption
                    }
                }

                return false;
            },
        };
    },

    addCommands() {
        return {
            insertPullQuote: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    content: [
                        {
                            type: 'pullQuoteText',
                            content: [{ type: 'text', text: 'Enter your quote here...' }],
                        },
                        {
                            type: 'pullQuoteCite',
                            content: [{ type: 'text', text: '— Attribution' }],
                        },
                    ],
                });
            },
        };
    },
});

export const PullQuoteText = Node.create({
    name: 'pullQuoteText',
    group: '',
    content: 'inline*',
    isolating: true,

    parseHTML() {
        return [{ tag: 'blockquote[data-pullquote] > p' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['p', mergeAttributes(HTMLAttributes, { class: 'pull-quote-text' }), 0];
    },
});

export const PullQuoteCite = Node.create({
    name: 'pullQuoteCite',
    group: '',
    content: 'inline*',
    isolating: true,

    parseHTML() {
        return [{ tag: 'blockquote[data-pullquote] > cite' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['cite', mergeAttributes(HTMLAttributes, { class: 'pull-quote-cite' }), 0];
    },
});
