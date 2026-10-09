import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection } from '@tiptap/pm/state';
import { captureImageInsertion, mapImageInsertion } from '../utils/editorInsertionPoint.ts';
import { mapEditorEntryTarget } from '../utils/editorEntryTarget.ts';
import { FOOTNOTE_NUMBERING_META } from '../utils/editorFootnotes.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, paragraph: { group: 'block', content: 'inline*' }, text: { group: 'inline' },
    image: { group: 'block', atom: true, attrs: { src: {} } },
    footnote: { group: 'inline', inline: true, atom: true, attrs: { note: {}, index: { default: 1 } } },
} });
const image = (src: string) => schema.nodes.image.create({ src });
const doc = schema.nodes.doc.create(null, [image('old'), schema.nodes.paragraph.create(null, ['One', 'Two', 'Three', 'Four'].map(note => schema.nodes.footnote.create({ note })))]);
const state = EditorState.create({ doc });

test('an atom-only manuscript captures a zero-width insertion after the selected image', () => {
    const lone = schema.nodes.doc.create(null, image('old'));
    const selected = EditorState.create({ doc: lone, selection: NodeSelection.create(lone, 0) });
    const point = captureImageInsertion(selected);
    assert.equal(point, 1);
    const result = selected.apply(selected.tr.insert(point, image('new')));
    assert.equal(result.doc.childCount, 2);
    assert.equal(result.doc.firstChild?.attrs.src, 'old');
});
test('background image insertion maps the original fourth note rather than editing its neighbour', () => {
    const target = { from: 5, to: 6, notePosition: 5, deleted: false };
    const tr = state.tr.insert(1, image('new'));
    assert.equal(tr.doc.nodeAt(5)?.attrs.note, 'Three');
    const mapped = mapEditorEntryTarget(target, tr);
    assert.equal(mapped.notePosition, 6);
    assert.equal(tr.doc.nodeAt(mapped.notePosition!)?.attrs.note, 'Four');
    assert.equal(mapped.deleted, false);
});
test('deleting a target rejects its replacement even when another note occupies its old position', () => {
    const mapped = mapEditorEntryTarget({ from: 3, to: 4, notePosition: 3, deleted: false }, state.tr.delete(3, 4));
    assert.equal(mapped.deleted, true);
});
test('attribute-only numbering does not invalidate a note form target', () => {
    const target = { from: 5, to: 6, notePosition: 5, deleted: false };
    const tr = state.tr.setNodeMarkup(5, undefined, { note: 'Four', index: 4 }).setMeta(FOOTNOTE_NUMBERING_META, true);
    assert.deepEqual(mapEditorEntryTarget(target, tr), target);
});
test('text and insertion targets follow preceding edits without growing across inserted blocks', () => {
    const point = captureImageInsertion(state);
    const tr = state.tr.insert(0, image('new'));
    assert.equal(mapImageInsertion(point, tr), point + 1);
    const mapped = mapEditorEntryTarget({ from: 2, to: 5, notePosition: null, deleted: false }, tr);
    assert.equal(mapped.from, 3); assert.equal(mapped.to, 6);
});
