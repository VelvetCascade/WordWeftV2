import { Plugin } from '@tiptap/pm/state';

export function appendAfterDocumentEdit(plugin: Plugin): Plugin {
    return new Plugin({
        ...plugin.spec,
        appendTransaction(transactions, oldState, newState) {
            if (!transactions.some(transaction => transaction.docChanged)) return null;
            return plugin.spec.appendTransaction?.call(this, transactions, oldState, newState) || null;
        },
    });
}
