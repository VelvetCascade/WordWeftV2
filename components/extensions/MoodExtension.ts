import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Mood Block Extension — wraps content in an atmosphere/mood container.
 * 
 * Writers tag sections with moods: romantic, tense, melancholy, triumphant, eerie, serene.
 * Readers experience subtle background/color shifts that match the mood.
 *
 * HTML output: <div data-mood="tense" class="mood-block">content</div>
 */
export const MoodBlock = Node.create({
    name: 'moodBlock',
    group: 'block',
    content: 'block+',
    defining: false,
    isolating: false,
    allowGapCursor: true,

    addAttributes() {
        return {
            mood: {
                default: 'serene',
                parseHTML: (element) => element.getAttribute('data-mood') || 'serene',
                renderHTML: (attributes) => ({
                    'data-mood': attributes.mood,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-mood]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                class: `mood-block mood-${HTMLAttributes['data-mood'] || 'serene'}`,
            }),
            0,
        ];
    },

    addKeyboardShortcuts() {
        return {
            // Enter at end of last child → create paragraph after the mood block
            'Enter': ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                // Check if we're in a mood block
                let moodDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === this.name) {
                        moodDepth = d;
                        break;
                    }
                }
                if (moodDepth < 0) return false;

                // Only handle if at the end of the block and current paragraph is empty
                const parentNode = $from.parent;
                if (parentNode.textContent.length === 0 && parentNode.type.name === 'paragraph') {
                    // Delete the empty paragraph and insert one after the mood block
                    const endPos = $from.end(moodDepth) + 1;
                    const { tr } = state;
                    // Delete current empty paragraph
                    tr.delete($from.before($from.depth), $from.after($from.depth));
                    // Insert paragraph after the mood block
                    const newEndPos = tr.mapping.map(endPos);
                    tr.insert(newEndPos, state.schema.nodes.paragraph.create());
                    tr.setSelection(TextSelection.near(tr.doc.resolve(newEndPos + 1)));
                    editor.view.dispatch(tr);
                    return true;
                }

                return false;
            },

            // Backspace at start of first child → lift content out
            'Backspace': ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                // Check if we're at the very start of content inside a mood block
                let moodDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === this.name) {
                        moodDepth = d;
                        break;
                    }
                }
                if (moodDepth < 0) return false;

                // Only act if cursor is at the very beginning of the mood block's content
                const startOfMood = $from.start(moodDepth);
                if ($from.pos === startOfMood) {
                    return editor.commands.lift(this.name);
                }

                return false;
            },
        };
    },

    addCommands() {
        return {
            setMoodBlock: (mood: string) => ({ commands }) => {
                return commands.wrapIn(this.name, { mood });
            },
            insertMoodBlock: (mood: string) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { mood },
                    content: [{ type: 'paragraph' }],
                });
            },
        };
    },
});
