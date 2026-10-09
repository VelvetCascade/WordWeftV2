import { NodeSelection, type EditorState } from '@tiptap/pm/state';

/** Read only the selected blocks; never keep a second, stale copy of the cursor. */
export function editorSelectionContext(state: EditorState) {
    const { selection, doc } = state;
    const styles = new Set<string>();
    const passages = new Map<number, string>();
    let includesPlain = false;
    const inspect = (position: number, style?: string) => {
        const resolved = doc.resolve(position);
        if (style) styles.add(style);
        for (let depth = resolved.depth; depth > 0; depth--) {
            if (resolved.node(depth).type.name === 'moodBlock') {
                passages.set(resolved.before(depth), resolved.node(depth).attrs.mood);
                return;
            }
        }
        includesPlain = true;
    };
    const styleFor = (name: string, level: number) => name === 'heading' ? `heading-${level}` : name === 'codeBlock' ? 'code-block' : 'paragraph';
    if (selection.empty) {
        inspect(selection.from, styleFor(selection.$from.parent.type.name, selection.$from.parent.attrs.level));
    } else {
        doc.nodesBetween(selection.from, selection.to, (node, position) => {
            if (!node.isTextblock && !node.isLeaf) return;
            const start = position + (node.isTextblock ? 1 : 0);
            const end = position + node.nodeSize - (node.isTextblock ? 1 : 0);
            if (selection.from >= end || selection.to <= start) return;
            inspect(start, node.isTextblock ? styleFor(node.type.name, node.attrs.level) : undefined);
        });
    }
    // A context action may target one container only when both ends are inside it.
    let block: string | null = null;
    for (let depth = selection.$from.depth; depth > 0; depth--) {
        const node = selection.$from.node(depth);
        if (!['table', 'details', 'pullQuote', 'codeBlock', 'blockquote'].includes(node.type.name)) continue;
        if (selection.to <= selection.$from.end(depth)) { block = node.type.name; break; }
    }
    const moods = [...new Set(passages.values())];
    return {
        blockStyle: selection instanceof NodeSelection && selection.node.type.name === 'image'
            ? 'image' : styles.size > 1 ? 'mixed' : [...styles][0] || 'paragraph',
        block,
        footnote: selection instanceof NodeSelection && selection.node.type.name === 'footnote'
            ? { index: selection.node.attrs.index, note: selection.node.attrs.note } : null,
        selectionEmpty: selection.empty,
        hasAtmosphere: passages.size > 0,
        // No selected mood is claimed as active when plain text is also included.
        mood: !includesPlain && moods.length === 1 ? moods[0] : null,
        passageCount: passages.size,
        mixedAtmosphere: passages.size > 0 && (includesPlain || moods.length > 1),
    };
}
