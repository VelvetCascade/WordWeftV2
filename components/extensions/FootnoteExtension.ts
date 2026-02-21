import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Footnote Extension — inline node that creates superscript footnote markers.
 * 
 * Stores the note text in a data attribute. Renders as a superscript number.
 * In the editor, shows the number with a tooltip.
 * In reader/preview, renders as an interactive popup.
 *
 * HTML output: <span data-footnote="note text" class="footnote-marker">1</span>
 */
export const Footnote = Node.create({
    name: 'footnote',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            note: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-footnote') || '',
                renderHTML: (attributes) => ({
                    'data-footnote': attributes.note,
                }),
            },
            index: {
                default: 1,
                parseHTML: (element) => parseInt(element.getAttribute('data-footnote-index') || '1'),
                renderHTML: (attributes) => ({
                    'data-footnote-index': attributes.index,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-footnote]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'footnote-marker',
                title: node.attrs.note,
            }),
            `${node.attrs.index}`,
        ];
    },

    addCommands() {
        return {
            insertFootnote: (attrs: { note: string }) => ({ chain, state }) => {
                // Count existing footnotes to auto-number
                let count = 0;
                state.doc.descendants((node) => {
                    if (node.type.name === 'footnote') count++;
                });
                return chain().insertContent({
                    type: this.name,
                    attrs: { note: attrs.note, index: count + 1 },
                }).run();
            },
        };
    },
});
