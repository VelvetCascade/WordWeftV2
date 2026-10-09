import type { Node as ProseNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';

interface PassageBlock { node: ProseNode; oldPosition: number; mood: string | null; passage: number | null; newPosition?: number }

/** Move only atmosphere boundaries. Reuse original block nodes, including marks,
 * images, notes, lists and tables; never round-trip the author's prose through HTML. */
export function atmosphereTransaction(state: EditorState, mood: string | null): Transaction | null {
    const type = state.schema.nodes.moodBlock;
    if (!type) return null;
    const blocks: PassageBlock[] = [];
    const collect = (node: ProseNode, position: number, inherited: string | null, passage: number | null) => {
        if (node.type === type) {
            node.forEach((child, offset) => collect(child, position + 1 + offset, node.attrs.mood, position));
        } else blocks.push({ node, oldPosition: position, mood: inherited, passage });
    };
    state.doc.forEach((node, position) => collect(node, position, null, null));
    const { from, to, empty } = state.selection;
    const current = blocks.find(block => from >= block.oldPosition && from < block.oldPosition + block.node.nodeSize);
    let changed = false;
    for (const block of blocks) {
        const selected = empty
            ? current?.passage != null ? block.passage === current.passage : block === current
            : from < block.oldPosition + block.node.nodeSize - (block.node.isTextblock ? 1 : 0)
                && to > block.oldPosition + (block.node.isTextblock ? 1 : 0);
        if (selected) { block.mood = mood; changed = true; }
    }
    if (!changed) return null;
    const result: ProseNode[] = [];
    let position = 0;
    for (let i = 0; i < blocks.length;) {
        const block = blocks[i];
        if (!block.mood) {
            block.newPosition = position;
            result.push(block.node); position += block.node.nodeSize; i++; continue;
        }
        const grouped: ProseNode[] = [];
        const groupMood = block.mood;
        let innerPosition = position + 1;
        while (i < blocks.length && blocks[i].mood === groupMood) {
            blocks[i].newPosition = innerPosition;
            grouped.push(blocks[i].node); innerPosition += blocks[i].node.nodeSize; i++;
        }
        const wrapped = type.create({ mood: groupMood }, grouped);
        result.push(wrapped); position += wrapped.nodeSize;
    }
    const mapPosition = (oldPosition: number) => {
        const block = blocks.find(item => oldPosition >= item.oldPosition && oldPosition < item.oldPosition + item.node.nodeSize)
            || blocks[blocks.length - 1];
        return block ? Math.max(0, Math.min(position, block.newPosition! + oldPosition - block.oldPosition)) : 0;
    };
    const tr = closeHistory(state.tr).replaceWith(0, state.doc.content.size, result);
    tr.setSelection(TextSelection.between(tr.doc.resolve(mapPosition(state.selection.anchor)), tr.doc.resolve(mapPosition(state.selection.head))));
    return tr.scrollIntoView();
}
