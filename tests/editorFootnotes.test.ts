import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection } from '@tiptap/pm/state';
import { history, undo } from '@tiptap/pm/history';
import { createFootnoteNumberingPlugin } from '../utils/editorFootnotes.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'paragraph+' }, paragraph: { content: 'inline*' }, text: { group: 'inline' },
    footnote: { group: 'inline', inline: true, atom: true, attrs: { index: { default: 1 }, note: { default: '' } } },
} });
const note = (index: number, text: string) => schema.nodes.footnote.create({ index, note: text });
const state = () => EditorState.create({ doc: schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, [schema.text('Words'), note(1, 'First'), note(2, 'Second')])), plugins: [history(), createFootnoteNumberingPlugin()] });
const notes = (state: EditorState) => { const values: unknown[] = []; state.doc.descendants(node => { if (node.type.name === 'footnote') values.push([node.attrs.index, node.attrs.note]); }); return values; };

test('inserting before existing footnotes renumbers markers without altering notes or prose', () => {
    const original = state();
    const result = original.applyTransaction(original.tr.insert(1, note(3, 'New'))).state;
    assert.deepEqual(notes(result), [[1, 'New'], [2, 'First'], [3, 'Second']]);
    assert.equal(result.doc.textContent, original.doc.textContent);
});
test('removing a note keeps numbering unique and undo restores the note and its number', () => {
    const original = state();
    let result = original.applyTransaction(original.tr.delete(6, 7)).state;
    assert.deepEqual(notes(result), [[1, 'Second']]);
    assert.equal(undo(result, tr => { result = result.applyTransaction(tr).state; }), true);
    assert.deepEqual(notes(result), [[1, 'First'], [2, 'Second']]);
});
test('cursor and focus metadata do not rewrite historical footnotes', () => {
    const original = state();
    const result = original.applyTransaction(original.tr.setMeta('focus', true));
    assert.equal(result.transactions.length, 1); assert.deepEqual(result.state.doc.toJSON(), original.doc.toJSON());
});
test('renumbering preserves the selected marker for its context actions', () => {
    const original = state();
    const selected = original.apply(original.tr.setSelection(NodeSelection.create(original.doc, 7)));
    const result = selected.applyTransaction(selected.tr.insert(1, note(3, 'New'))).state;
    assert.ok(result.selection instanceof NodeSelection);
    assert.equal(result.selection.node.attrs.note, 'Second');
    assert.equal(result.selection.node.attrs.index, 3);
});
