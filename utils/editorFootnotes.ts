import { Plugin, NodeSelection } from '@tiptap/pm/state';

export const FOOTNOTE_NUMBERING_META = 'writerFootnoteNumbering';

/** Number markers in document order after edits, never on read-only navigation. */
export function createFootnoteNumberingPlugin() {
    return new Plugin({ appendTransaction(transactions, _oldState, state) {
        if (!transactions.some(transaction => transaction.docChanged)) return null;
        const tr = state.tr;
        let index = 0;
        state.doc.descendants((node, position) => {
            if (node.type.name !== 'footnote') return;
            index++;
            if (node.attrs.index !== index) tr.setNodeMarkup(position, undefined, { ...node.attrs, index });
        });
        if (!tr.docChanged) return null;
        // setNodeMarkup replaces an atom and can otherwise collapse its node
        // selection. Attribute-only renumbering does not change any positions.
        if (state.selection instanceof NodeSelection && state.selection.node.type.name === 'footnote') {
            tr.setSelection(NodeSelection.create(tr.doc, state.selection.from));
        }
        return tr.setMeta('addToHistory', false).setMeta(FOOTNOTE_NUMBERING_META, true);
    } });
}
