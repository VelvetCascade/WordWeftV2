import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { findEditorMatches, editorOutline, replaceEditorMatches, removeEditorBlockFormatting, continueAfterEditorBlock } from '../utils/editorTools.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, paragraph: { group: 'block', content: 'inline*' },
    heading: { group: 'block', content: 'inline*', attrs: { level: { default: 2 } } },
    horizontalRule: { group: 'block' }, text: { group: 'inline' },
    footnote: { group: 'inline', inline: true, atom: true },
    details: { group: 'block', content: 'detailsSummary detailsContent' },
    detailsSummary: { content: 'inline*' }, detailsContent: { content: 'block+' },
    blockquote: { group: 'block', content: 'block+' },
    codeBlock: { group: 'block', content: 'text*', marks: '' },
}, marks: { bold: {} } });
const paragraph = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
test('find spans inline formatting but does not cross paragraphs or footnotes', () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, [schema.text('Moon'), schema.text('light', [schema.marks.bold.create()]), schema.nodes.footnote.create(), schema.text('light')]), paragraph('MOONLIGHT')]);
    assert.equal(findEditorMatches(doc, 'moonlight').length, 2);
    assert.equal(findEditorMatches(doc, 'moonlight', true).length, 0);
    assert.equal(findEditorMatches(doc, 'lightlight').length, 0);
    assert.equal(findEditorMatches(doc, '').length, 0);
});
test('replace all uses original positions without disturbing unrelated formatting or blocks', () => {
    const marked = schema.nodes.paragraph.create(null, schema.text('Keep bold', [schema.marks.bold.create()]));
    const doc = schema.nodes.doc.create(null, [paragraph('moon moon'), marked, paragraph('moon')]);
    const state = EditorState.create({ doc });
    const tr = replaceEditorMatches(state, findEditorMatches(doc, 'moon'), 'sunshine');
    assert.equal(tr.doc.child(0).textContent, 'sunshine sunshine');
    assert.deepEqual(tr.doc.child(1).toJSON(), marked.toJSON());
    assert.equal(tr.doc.child(2).textContent, 'sunshine');
});
test('outline includes nested headings and sequential scene breaks with manuscript positions', () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.heading.create({ level: 2 }, schema.text('Arrival')), paragraph('Prose'), schema.nodes.horizontalRule.create(), paragraph('More prose')]);
    assert.deepEqual(editorOutline(doc).map(item => [item.label, item.kind]), [['Arrival', 'heading'], ['Scene 2', 'scene']]);
});
test('removing a collapsible block keeps its summary, marked prose, footnotes, and cursor position', () => {
    const summary = schema.nodes.detailsSummary.create(null, schema.text('Summary'));
    const prose = schema.nodes.paragraph.create(null, [schema.text('Marked prose', [schema.marks.bold.create()]), schema.nodes.footnote.create()]);
    const block = schema.nodes.details.create(null, [summary, schema.nodes.detailsContent.create(null, prose)]);
    const doc = schema.nodes.doc.create(null, [block, paragraph('Outside')]);
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 15) });
    const tr = removeEditorBlockFormatting(state, 'details')!;
    assert.ok(tr);
    assert.equal(tr.doc.textContent, doc.textContent);
    assert.deepEqual(tr.doc.child(1).toJSON(), prose.toJSON());
    assert.equal(tr.doc.resolve(tr.selection.from).parent.type.name, 'paragraph');
    assert.equal(tr.doc.resolve(tr.selection.from).parentOffset, state.selection.$from.parentOffset);
});
test('continuing after a story block preserves every child and reuses an existing empty paragraph', () => {
    const block = schema.nodes.blockquote.create(null, [paragraph('Keep this quote'), paragraph('And its second paragraph')]);
    const doc = schema.nodes.doc.create(null, [block, schema.nodes.paragraph.create(), paragraph('Outside')]);
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 4) });
    const tr = continueAfterEditorBlock(state, 'blockquote')!;
    assert.deepEqual(tr.doc.toJSON(), doc.toJSON());
    assert.equal(tr.selection.from, block.nodeSize + 1);
    const withoutEmpty = schema.nodes.doc.create(null, [block, paragraph('Outside')]);
    const inserted = continueAfterEditorBlock(EditorState.create({ doc: withoutEmpty, selection: TextSelection.create(withoutEmpty, 4) }), 'blockquote')!;
    assert.deepEqual(inserted.doc.child(0).toJSON(), block.toJSON());
    assert.equal(inserted.doc.child(1).textContent, '');
    assert.equal(inserted.doc.child(2).textContent, 'Outside');
});
test('removing a code block retains literal newlines and text', () => {
    const code = schema.nodes.codeBlock.create(null, schema.text('first line\nsecond line'));
    const doc = schema.nodes.doc.create(null, [code]);
    const tr = removeEditorBlockFormatting(EditorState.create({ doc, selection: TextSelection.create(doc, 8) }), 'codeBlock')!;
    assert.equal(tr.doc.firstChild?.type.name, 'paragraph');
    assert.equal(tr.doc.textContent, doc.textContent);
});
