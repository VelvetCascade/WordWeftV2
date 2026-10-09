import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection, NodeSelection, AllSelection } from '@tiptap/pm/state';
import { history, undo, redo } from '@tiptap/pm/history';
import { insertStructuredBlock, canMakePullQuote } from '../utils/editorStructuredBlocks.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, paragraph: { group: 'block', content: 'inline*' }, text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true }, image: { group: 'block', atom: true, attrs: { src: {} } },
    bulletList: { group: 'block', content: 'listItem+' }, listItem: { content: 'paragraph block*' },
    footnote: { group: 'inline', inline: true, atom: true, attrs: { note: {} } },
    moodBlock: { group: 'block', content: 'block+', attrs: { mood: {} } },
    pullQuote: { group: 'block', content: 'pullQuoteText pullQuoteCite' },
    pullQuoteText: { content: 'inline*' }, pullQuoteCite: { content: 'inline*' },
    details: { group: 'block', content: 'detailsSummary detailsContent', attrs: { open: { default: true } } },
    detailsSummary: { content: 'inline*' }, detailsContent: { content: 'block+' },
}, marks: { bold: {} } });
const p = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const selectedProse = schema.nodes.paragraph.create(null, [schema.text('Chosen ', [schema.marks.bold.create()]), schema.nodes.footnote.create({ note: 'Keep this source' }), schema.text('words')]);

for (const kind of ['details', 'pullQuote'] as const) test(`${kind} retains selected marks and footnotes and restores the exact draft on undo`, () => {
    const before = p('Before'), after = p('After');
    const doc = schema.nodes.doc.create(null, [before, selectedProse, after]);
    let state = EditorState.create({ doc, selection: TextSelection.create(doc, before.nodeSize + 1, before.nodeSize + selectedProse.nodeSize - 1), plugins: [history()] });
    const tr = insertStructuredBlock(state, kind)!;
    assert.ok(tr);
    state = state.apply(tr);
    const block = state.doc.child(1);
    assert.equal(block.type.name, kind);
    const body = kind === 'details' ? block.child(1).child(0) : block.child(0);
    assert.deepEqual(body.content.toJSON(), selectedProse.content.toJSON());
    assert.equal(state.selection.$from.parent.type.name, kind === 'details' ? 'paragraph' : 'pullQuoteText');
    assert.equal(state.doc.child(0).textContent, 'Before'); assert.equal(state.doc.lastChild!.textContent, 'After');
    assert.equal(undo(state, transaction => { state = state.apply(transaction); }), true);
    assert.deepEqual(state.doc.toJSON(), doc.toJSON());
    assert.equal(redo(state, transaction => { state = state.apply(transaction); }), true);
    assert.equal(state.doc.child(1).type.name, kind);
});

test('quoting a partial paragraph retains the unselected beginning and ending', () => {
    const doc = schema.nodes.doc.create(null, p('Before chosen after'));
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 8, 14) });
    const tr = insertStructuredBlock(state, 'pullQuote')!;
    assert.equal(tr.doc.textContent, doc.textContent);
    assert.equal(tr.doc.child(1).child(0).textContent, 'chosen');
    assert.equal(tr.selection.$from.parent.type.name, 'pullQuoteText');
});

test('selected paragraphs become separate lines in a quote without flattening marks', () => {
    const first = p('First'), second = selectedProse;
    const doc = schema.nodes.doc.create(null, [first, second]);
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, 1, doc.content.size - 1) }), 'pullQuote')!;
    const quote = tr.doc.firstChild!.firstChild!;
    assert.equal(quote.child(1).type.name, 'hardBreak');
    assert.equal(quote.textContent, doc.textContent);
    assert.equal(quote.child(2).marks[0].type.name, 'bold');
});

test('quote conversion rejects selected artwork while a collapsible section preserves it', () => {
    const image = schema.nodes.image.create({ src: 'original-artwork.png' });
    const doc = schema.nodes.doc.create(null, [image, p('After')]);
    const state = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) });
    assert.equal(canMakePullQuote(state), false);
    assert.equal(insertStructuredBlock(state, 'pullQuote'), null);
    const tr = insertStructuredBlock(state, 'details')!;
    assert.deepEqual(tr.doc.firstChild!.child(1).firstChild!.toJSON(), image.toJSON());
});

test('converting selected words inside a mood retains one original mood boundary', () => {
    const mood = schema.nodes.moodBlock.create({ mood: 'tense' }, selectedProse);
    const doc = schema.nodes.doc.create(null, [mood, p('Outside')]);
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, 2, mood.nodeSize - 2) }), 'details')!;
    let count = 0; tr.doc.descendants(node => { if (node.type.name === 'moodBlock') count++; });
    assert.equal(count, 1);
    assert.equal(tr.doc.firstChild!.attrs.mood, 'tense');
    assert.deepEqual(tr.doc.firstChild!.firstChild!.child(1).firstChild!.content.toJSON(), selectedProse.content.toJSON());
});

for (const kind of ['details', 'pullQuote'] as const) for (const direction of ['into', 'out of']) test(`${kind} across ${direction} a mood preserves its unselected paragraphs`, () => {
    const before = p('Before words'), storm = p('Storm words'), rain = p('Rain words'), after = p('After words');
    const mood = schema.nodes.moodBlock.create({ mood: 'tense' }, [storm, rain]);
    const doc = schema.nodes.doc.create(null, [before, mood, after]);
    const from = direction === 'into' ? 1 : before.nodeSize + 1 + storm.nodeSize + 1;
    const to = direction === 'into' ? before.nodeSize + 1 + storm.nodeSize - 1 : doc.content.size - 1;
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }), kind)!;
    assert.equal(kind === 'details' ? tr.doc.textContent.replace('Click to expand', '') : tr.doc.textContent, doc.textContent);
    const untouched = direction === 'into' ? 'Rain words' : 'Storm words';
    let keptInMood = false;
    tr.doc.descendants(node => { if (node.type.name === 'moodBlock' && node.attrs.mood === 'tense' && node.textContent.includes(untouched)) keptInMood = true; });
    assert.equal(keptInMood, true);
    tr.doc.check();
});

test('a collapsible section crossing part of a quote retains valid quote structure and unselected citation', () => {
    const before = p('Before words'), after = p('After words');
    const quote = schema.nodes.pullQuote.create(null, [schema.nodes.pullQuoteText.create(null, schema.text('Quoted words')), schema.nodes.pullQuoteCite.create(null, schema.text('Citation words'))]);
    const doc = schema.nodes.doc.create(null, [before, quote, after]);
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, 1, before.nodeSize + 3) }), 'details')!;
    tr.doc.check();
    assert.equal(tr.doc.textContent.replace('Click to expand', ''), doc.textContent);
});

for (const container of ['list', 'details', 'quote']) test(`a selection ending in a ${container} keeps its unselected content`, () => {
    const first = p('First words'), second = p('Second words');
    const node = container === 'list' ? schema.nodes.bulletList.create(null, [schema.nodes.listItem.create(null, first), schema.nodes.listItem.create(null, second)])
        : container === 'details' ? schema.nodes.details.create(null, [schema.nodes.detailsSummary.create(null, schema.text('Summary')), schema.nodes.detailsContent.create(null, [first, second])])
            : schema.nodes.pullQuote.create(null, [schema.nodes.pullQuoteText.create(null, first.content), schema.nodes.pullQuoteCite.create(null, second.content)]);
    const doc = schema.nodes.doc.create(null, [p('Before words'), node, p('After words')]);
    let end = 0; doc.descendants((node, position) => { if (node.isText && node.text === 'First words') end = position + node.nodeSize; });
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, 1, end) }), 'details')!;
    tr.doc.check();
    assert.equal(tr.doc.textContent.replace('Click to expand', ''), doc.textContent);
});

test('an image-only chapter converts to a section without top-level selection errors', () => {
    const image = schema.nodes.image.create({ src: 'original-artwork.png' });
    const doc = schema.nodes.doc.create(null, image);
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: NodeSelection.create(doc, 0) }), 'details')!;
    tr.doc.check();
    assert.deepEqual(tr.doc.firstChild!.child(1).firstChild!.toJSON(), image.toJSON());
});

for (const kind of ['details', 'pullQuote'] as const) test(`Select All converts to ${kind} without top-level selection errors`, () => {
    const doc = schema.nodes.doc.create(null, [selectedProse, p('Another paragraph')]);
    const tr = insertStructuredBlock(EditorState.create({ doc, selection: new AllSelection(doc) }), kind)!;
    tr.doc.check();
    assert.equal(kind === 'details' ? tr.doc.textContent.replace('Click to expand', '') : tr.doc.textContent, doc.textContent);
    assert.equal(tr.doc.firstChild!.type.name, kind);
});

test('mixed-block selection boundaries preserve all manuscript words and footnotes', () => {
    const quote = schema.nodes.pullQuote.create(null, [schema.nodes.pullQuoteText.create(null, schema.text('Quotation')), schema.nodes.pullQuoteCite.create(null, schema.text('Citation'))]);
    const details = schema.nodes.details.create(null, [schema.nodes.detailsSummary.create(null, schema.text('Summary')), schema.nodes.detailsContent.create(null, [p('Hidden prose'), selectedProse])]);
    const list = schema.nodes.bulletList.create(null, [schema.nodes.listItem.create(null, p('First item')), schema.nodes.listItem.create(null, p('Second item'))]);
    const doc = schema.nodes.doc.create(null, [p('Opening'), schema.nodes.moodBlock.create({ mood: 'tense' }, [p('Storm'), selectedProse]), list, quote, details, p('Ending')]);
    const points: number[] = [];
    doc.descendants((node, position) => {
        if (node.isTextblock) { points.push(position + 1, position + 1 + Math.floor(node.content.size / 2), position + node.nodeSize - 1); return false; }
    });
    const sources = (document: typeof doc) => { const notes: string[] = []; document.descendants(node => { if (node.type.name === 'footnote') notes.push(node.attrs.note); }); return notes; };
    for (const from of points) for (const to of points) {
        if (from >= to) continue;
        for (const kind of ['details', 'pullQuote'] as const) {
            const tr = insertStructuredBlock(EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }), kind);
            if (!tr) continue;
            const boundary = `${kind} at ${from}..${to}`;
            assert.doesNotThrow(() => tr.doc.check(), boundary);
            assert.equal(kind === 'details' ? tr.doc.textContent.replace('Click to expand', '') : tr.doc.textContent, doc.textContent, boundary);
            assert.deepEqual(sources(tr.doc), sources(doc), boundary);
        }
    }
});
