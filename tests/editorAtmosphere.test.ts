import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { history, undo } from '@tiptap/pm/history';
import { atmosphereTransaction } from '../utils/editorAtmosphere.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: { group: 'block', content: 'inline*', attrs: { level: { default: 2 } } },
    moodBlock: { group: 'block', content: 'block+', attrs: { mood: { default: 'serene' } } },
    horizontalRule: { group: 'block' },
    footnote: { group: 'inline', inline: true, atom: true, attrs: { note: {} } },
}, marks: { bold: {}, link: { attrs: { href: {} } } } });
const p = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const mood = (value: string, blocks: any[]) => schema.nodes.moodBlock.create({ mood: value }, blocks);
const stateFor = (blocks: any[], from: number, to = from) => {
    const doc = schema.nodes.doc.create(null, blocks);
    return EditorState.create({ doc, selection: TextSelection.create(doc, from, to), plugins: [history()] });
};
const depth = (doc: any) => { let maximum = 0; doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'moodBlock') { const resolved = doc.resolve(pos + 1); let count = 0;
        for (let d = 1; d <= resolved.depth; d++) if (resolved.node(d).type.name === 'moodBlock') count++;
        maximum = Math.max(maximum, count); }
}); return maximum; };

test('a mixed plain and atmosphere selection becomes a flat passage with identical prose', () => {
    const state = stateFor([p('First'), mood('tense', [p('Second'), p('Third')]), p('Last')], 2, 15);
    const tr = atmosphereTransaction(state, 'romantic')!;
    assert.ok(tr);
    assert.equal(depth(tr.doc), 1);
    assert.equal(tr.doc.textContent, state.doc.textContent);
    assert.equal(tr.doc.firstChild?.attrs.mood, 'romantic');
    assert.equal(tr.doc.lastChild?.textContent, 'Last');
    assert.equal(tr.doc.textBetween(tr.selection.from, tr.selection.to), state.doc.textBetween(2, 15));
});

test('a ranged change splits only the selected paragraph out of an existing passage', () => {
    const state = stateFor([mood('tense', [p('Alpha'), p('Beta'), p('Gamma')])], 9, 12);
    const doc = atmosphereTransaction(state, 'serene')!.doc;
    assert.deepEqual(Array.from({ length: doc.childCount }, (_, i) => [doc.child(i).attrs.mood, doc.child(i).textContent]), [
        ['tense', 'Alpha'], ['serene', 'Beta'], ['tense', 'Gamma'],
    ]);
});

test('collapsed removal removes the entire active passage and keeps marked prose and notes', () => {
    const marked = schema.nodes.paragraph.create(null, [schema.text('Keep me', [schema.marks.bold.create(), schema.marks.link.create({ href: 'https://example.com' })]), schema.nodes.footnote.create({ note: 'Source' })]);
    const state = stateFor([mood('tense', [marked, p('Also keep')]), p('Outside')], 4);
    const tr = atmosphereTransaction(state, null)!;
    assert.deepEqual(tr.doc.child(0).toJSON(), marked.toJSON());
    assert.equal(tr.doc.child(1).textContent, 'Also keep');
    assert.equal(depth(tr.doc), 0);
    let next = state.apply(tr);
    assert.equal(undo(next, transaction => { next = next.apply(transaction); }), true);
    assert.deepEqual(next.doc.toJSON(), state.doc.toJSON());
});

test('historical nested atmosphere uses the innermost mood when normalizing a different passage', () => {
    const state = stateFor([mood('eerie', [p('Outer'), mood('serene', [p('Inner')]), p('Outer again')]), p('New')], 34);
    const doc = atmosphereTransaction(state, 'romantic')!.doc;
    assert.equal(depth(doc), 1);
    assert.equal(doc.child(1).attrs.mood, 'serene');
    assert.equal(doc.textContent, state.doc.textContent);
});
