import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * Spoiler Mark — wraps selected text in a hidden/blurred span.
 *
 * Writer: sees text with a subtle dashed indicator so they know what's hidden.
 * Reader: sees a blurred/hazy block; clicking reveals the text with animation.
 *
 * HTML output: <span data-spoiler="true">hidden text</span>
 */
export const Spoiler = Mark.create({
    name: 'spoiler',

    addAttributes() {
        return {
            'data-spoiler': {
                default: 'true',
                parseHTML: () => 'true',
                renderHTML: () => ({ 'data-spoiler': 'true' }),
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span[data-spoiler]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-spoiler': 'true',
                class: 'spoiler-text',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            toggleSpoiler: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            },
        };
    },
});
