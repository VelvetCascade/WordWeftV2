import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { TrailingNode } from '@tiptap/extensions';
import { appendAfterDocumentEdit } from '../utils/editorPluginGuards.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, paragraph: { group: 'block', content: 'text*' },
    horizontalRule: { group: 'block' }, text: {},
} });
function state() {
    const plugins = (TrailingNode.config.addProseMirrorPlugins as any).call({ options: { node: 'paragraph', notAfter: [] }, editor: { schema } });
    return EditorState.create({ doc: schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, schema.text('Saved words')), schema.nodes.horizontalRule.create()]), plugins: plugins.map(appendAfterDocumentEdit) });
}
test('real Tiptap trailing-node plugin ignores focus, selection and find metadata without changing saved prose', () => {
    const original = state();
    for (const meta of ['focus', 'blur', 'manuscriptFind']) {
        const result = original.applyTransaction(original.tr.setMeta(meta, true));
        assert.equal(result.transactions.length, 1);
        assert.deepEqual(result.state.doc.toJSON(), original.doc.toJSON());
    }
});
test('real content edits retain Tiptap trailing-paragraph behavior', () => {
    const original = state();
    const result = original.applyTransaction(original.tr.insertText(' more', 6));
    assert.equal(result.transactions.length, 2);
    assert.equal(result.state.doc.lastChild?.type.name, 'paragraph');
    assert.equal(result.state.doc.lastChild?.content.size, 0);
    assert.equal(result.state.doc.textContent, 'Saved more words');
});
