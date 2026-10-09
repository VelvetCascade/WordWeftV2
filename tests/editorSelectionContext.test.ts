import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { editorSelectionContext } from '../utils/editorSelectionContext.ts';

const schema = new Schema({ nodes: {
    doc: { content: 'block+' }, text: {}, paragraph: { group: 'block', content: 'text*' },
    heading: { group: 'block', content: 'text*', attrs: { level: { default: 2 } } },
    codeBlock: { group: 'block', content: 'text*' },
    moodBlock: { group: 'block', content: 'block+', attrs: { mood: {} } },
    blockquote: { group: 'block', content: 'block+' },
} });
const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
const mood = (value: string, text: string) => schema.nodes.moodBlock.create({ mood: value }, p(text));
const doc = schema.nodes.doc.create(null, [schema.nodes.heading.create({ level: 2 }, schema.text('Heading')), mood('tense', 'Storm'), p('Plain'), mood('romantic', 'Petals'), schema.nodes.blockquote.create(null, p('Quote')), schema.nodes.codeBlock.create(null, schema.text('Code'))]);
const positionOf = (text: string) => { let result = 0; doc.descendants((node, pos) => { if (node.isText && node.text === text) result = pos; }); return result; };
const context = (from: number, to = from) => editorSelectionContext(EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }));

test('cursor context follows each real paragraph, mood and special block', () => {
    assert.equal(context(positionOf('Heading')).blockStyle, 'heading-2');
    assert.equal(context(positionOf('Storm')).mood, 'tense');
    assert.equal(context(positionOf('Plain')).hasAtmosphere, false);
    assert.equal(context(positionOf('Petals')).mood, 'romantic');
    assert.equal(context(positionOf('Quote')).block, 'blockquote');
    assert.equal(context(positionOf('Code')).blockStyle, 'code-block');
});
test('mixed selections describe the selected moods rather than an arbitrary passage', () => {
    const selected = context(positionOf('Storm'), positionOf('Petals') + 6);
    assert.equal(selected.mood, null); assert.equal(selected.passageCount, 2);
    assert.equal(selected.mixedAtmosphere, true); assert.equal(selected.selectionEmpty, false);
    assert.equal(context(positionOf('Heading'), positionOf('Plain') + 5).blockStyle, 'mixed');
});
test('a selection ending at a mood boundary excludes the following plain paragraph', () => {
    const selected = context(positionOf('Storm'), positionOf('Storm') + 5);
    assert.equal(selected.mood, 'tense'); assert.equal(selected.passageCount, 1);
    assert.equal(selected.mixedAtmosphere, false);
    assert.equal(context(positionOf('Plain'), positionOf('Plain') + 5).hasAtmosphere, false);
});
test('selection across a container boundary hides whole-block actions', () => {
    assert.equal(context(positionOf('Quote'), positionOf('Code') + 4).block, null);
    assert.equal(context(positionOf('Quote'), positionOf('Quote') + 5).block, 'blockquote');
});
