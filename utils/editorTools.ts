import type { Node as ProseNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';

export interface EditorMatch { from: number; to: number }
export interface OutlineEntry { position: number; label: string; kind: 'heading' | 'scene'; level?: number }
export function findEditorMatches(doc: ProseNode, query: string, caseSensitive = false): EditorMatch[] {
    if (!query) return [];
    const matches: EditorMatch[] = [];
    // Unicode-aware regex retains original UTF-16 positions even when a character's
    // lower-case representation has a different length. The query is always literal.
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'gu' : 'giu');
    doc.descendants((node, position) => {
        if (!node.isTextblock) return;
        const text = node.textBetween(0, node.content.size, '', '\uFFFC');
        for (const match of text.matchAll(pattern)) {
            matches.push({ from: position + 1 + match.index!, to: position + 1 + match.index! + match[0].length });
        }
        return false;
    });
    return matches;
}
export function editorOutline(doc: ProseNode): OutlineEntry[] {
    const outline: OutlineEntry[] = [];
    let scene = 1;
    doc.descendants((node, position) => {
        if (node.type.name === 'heading') outline.push({ position: position + 1, label: node.textContent || 'Untitled heading', kind: 'heading', level: node.attrs.level });
        if (node.type.name === 'horizontalRule') outline.push({ position, label: `Scene ${++scene}`, kind: 'scene' });
    });
    return outline;
}
export function replaceEditorMatches(state: EditorState, matches: EditorMatch[], replacement: string) {
    const tr = closeHistory(state.tr);
    for (const match of [...matches].sort((a, b) => b.from - a.from)) tr.insertText(replacement, match.from, match.to);
    return tr;
}
export function removeEditorBlockFormatting(state: EditorState, name: string) {
    if (!['details', 'pullQuote', 'blockquote', 'codeBlock', 'table'].includes(name)) return null;
    const { $from } = state.selection;
    let depth = $from.depth;
    while (depth > 0 && $from.node(depth).type.name !== name) depth--;
    if (!depth) return null;
    const from = $from.before(depth), to = $from.after(depth);
    const parts: { node: ProseNode; oldPosition: number; newPosition: number }[] = [];
    let position = from;
    const collect = (node: ProseNode, oldPosition: number) => {
        if (node.isTextblock && (node.type.name === name || !node.type.isInGroup('block'))) {
            const paragraph = state.schema.nodes.paragraph.create(null, node.content);
            parts.push({ node: paragraph, oldPosition, newPosition: position }); position += paragraph.nodeSize;
        } else if (node.type.isInGroup('block') && node.type.name !== name) {
            parts.push({ node, oldPosition, newPosition: position }); position += node.nodeSize;
        } else node.forEach((child, offset) => collect(child, oldPosition + 1 + offset));
    };
    collect($from.node(depth), from);
    if (!parts.length) parts.push({ node: state.schema.nodes.paragraph.create(), oldPosition: from, newPosition: from });
    const tr = closeHistory(state.tr).replaceWith(from, to, parts.map(part => part.node));
    const map = (oldPosition: number) => {
        if (oldPosition < from || oldPosition >= to) return tr.mapping.map(oldPosition);
        const part = parts.find(item => oldPosition >= item.oldPosition && oldPosition < item.oldPosition + item.node.nodeSize);
        return part ? part.newPosition + oldPosition - part.oldPosition : from + 1;
    };
    tr.setSelection(TextSelection.between(tr.doc.resolve(map(state.selection.anchor)), tr.doc.resolve(map(state.selection.head))));
    return tr.scrollIntoView();
}

export function continueAfterEditorBlock(state: EditorState, name: string) {
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name !== name) continue;
        const position = $from.after(depth);
        const next = state.doc.nodeAt(position);
        const tr = closeHistory(state.tr);
        if (!next || next.type.name !== 'paragraph' || next.content.size) tr.insert(position, state.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.near(tr.doc.resolve(position + 1)));
        return tr.scrollIntoView();
    }
    return null;
}
