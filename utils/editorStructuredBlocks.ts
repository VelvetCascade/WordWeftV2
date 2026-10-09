import { Fragment } from '@tiptap/pm/model';
import { TextSelection, type EditorState } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';

/** Quotes accept prose, not artwork or whole tables. Refuse a destructive conversion. */
export function canMakePullQuote(state: EditorState) {
    let supported = true;
    const { from, to } = state.selection;
    if (from === to) return true;
    state.doc.nodesBetween(from, to, node => {
        if (['image', 'table', 'details', 'pullQuote', 'horizontalRule'].includes(node.type.name)) supported = false;
    });
    return supported;
}

/** Preserve selected content and marks rather than replacing it with example prose. */
export function insertStructuredBlock(state: EditorState, kind: 'details' | 'pullQuote') {
    const { from, to, empty } = state.selection;
    let block;
    let cursorOffset;
    if (kind === 'details') {
        let content = empty ? Fragment.from(state.schema.nodes.paragraph.create()) : state.doc.slice(from, to).content;
        if (content.firstChild?.isInline) content = Fragment.from(state.schema.nodes.paragraph.create(null, content));
        if (!state.schema.nodes.detailsContent.validContent(content)) content = state.selection.content().content;
        // Open slices may contain part of a quote, list or disclosure. Restore
        // required empty children before nesting them as complete nodes.
        const closeNode = (node: import('@tiptap/pm/model').Node): import('@tiptap/pm/model').Node | null => {
            if (node.isLeaf) return node;
            const children: import('@tiptap/pm/model').Node[] = [];
            for (let index = 0; index < node.childCount; index++) {
                const child = closeNode(node.child(index));
                if (!child) return null;
                children.push(child);
            }
            return node.type.createAndFill(node.attrs, children, node.marks);
        };
        const children: import('@tiptap/pm/model').Node[] = [];
        for (let index = 0; index < content.childCount; index++) {
            const child = closeNode(content.child(index));
            if (!child) return null;
            children.push(child);
        }
        content = Fragment.from(children);
        if (!state.schema.nodes.detailsContent.validContent(content)) return null;
        const summary = state.schema.nodes.detailsSummary.create(null, state.schema.text('Click to expand'));
        block = state.schema.nodes.details.create({ open: true }, [summary, state.schema.nodes.detailsContent.create(null, content)]);
        cursorOffset = summary.nodeSize + 3;
    } else {
        if (!canMakePullQuote(state)) return null;
        let content = Fragment.empty;
        if (!empty) state.doc.nodesBetween(from, to, (node, position) => {
            if (node.isTextblock) {
                const start = Math.max(from, position + 1), end = Math.min(to, position + node.nodeSize - 1);
                if (start >= end) return false;
                if (content.size) content = content.append(Fragment.from(state.schema.nodes.hardBreak.create()));
                content = content.append(node.content.cut(start - position - 1, end - position - 1));
                return false;
            }
            if (node.isInline) content = content.append(Fragment.from(node));
        });
        block = state.schema.nodes.pullQuote.create(null, [state.schema.nodes.pullQuoteText.create(null, content), state.schema.nodes.pullQuoteCite.create()]);
        cursorOffset = 2;
    }
    const tr = closeHistory(state.tr);
    const range = state.selection.$from.blockRange(state.selection.$to);
    // Keep complete selected blocks inside their existing parent. Range fitting
    // may otherwise drop a non-defining atmosphere around the selected prose.
    if (!empty && range && state.selection.$from.parentOffset === 0
        && state.selection.$to.parentOffset === state.selection.$to.parent.content.size
        && state.selection.$from.depth > 0 && state.selection.$to.depth > 0
        && state.selection.$from.before(state.selection.$from.depth) === range.start
        && state.selection.$to.after(state.selection.$to.depth) === range.end
        && range.parent.canReplace(range.startIndex, range.endIndex, Fragment.from(block))) {
        tr.replaceWith(range.start, range.end, block);
    } else tr.replaceRangeWith(from, to, block);
    // Fitting a block into part of a paragraph can split it. Find the actual
    // inserted node rather than assuming its position is the old text offset.
    tr.doc.descendants((node, position) => {
        if (node === block) tr.setSelection(TextSelection.near(tr.doc.resolve(position + cursorOffset)));
    });
    return tr.scrollIntoView();
}
