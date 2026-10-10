import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterDiff, changedWords, diffGroups, manuscriptLines, chapterMetadataChanges } from '../utils/chapterComparison.ts';

test('paragraph edits retain numbered context, additions and deletions in order', () => {
    const diff = chapterDiff('<p>First</p><p>Old words</p><p>Last</p>', '<p>First</p><p>New words</p><p>Last</p><p>After</p>');
    assert.deepEqual(diff.rows.map(row => [row.kind, row.before, row.after, row.line.text]), [
        ['equal', 1, 1, 'First'], ['delete', 2, undefined, 'Old words'], ['add', undefined, 2, 'New words'], ['equal', 3, 3, 'Last'], ['add', undefined, 4, 'After'],
    ]);
    assert.equal(diff.added, 2); assert.equal(diff.deleted, 1);
    const words = changedWords('Mara waited for home.', 'Mara waited for dawn.');
    assert.equal(words.before.filter(word => word.changed).map(word => word.text).join(''), 'home');
    assert.equal(words.after.filter(word => word.changed).map(word => word.text).join(''), 'dawn');
});

test('formatting, atmospheres, annotations, images, and cast links remain visible while editor IDs are ignored', () => {
    assert.equal(chapterDiff('<p data-paragraph-id="old">Text</p>', '<p data-paragraph-id="new">Text</p>').added, 0);
    for (const changed of ['<h2>Text</h2>', '<p><strong>Text</strong></p>', '<div data-mood="tense"><p>Text</p></div>', '<p style="text-align:right">Text</p>']) {
        assert.equal(chapterDiff('<p>Text</p>', changed).added, 1);
    }
    assert.equal(chapterDiff('<p>A<span data-footnote="Before">1</span></p>', '<p>A<span data-footnote="After">1</span></p>').deleted, 1);
    assert.equal(chapterDiff('<p>A<span data-footnote="Note" data-footnote-index="1">1</span></p>', '<p>A<span data-footnote="Note" data-footnote-index="2">2</span></p>').deleted, 0);
    assert.equal(chapterDiff('<p>Text</p>', '<p><span class="spoiler-text">Text</span></p>').added, 1);
    assert.ok(manuscriptLines('<p><a href="/book/new">A link</a></p>')[0].annotations.includes('Link: /book/new'));
    assert.equal(chapterDiff('<img src="old.jpg">', '<img src="new.jpg">').added, 1);
    assert.equal(chapterDiff('<p><span data-type="mention" data-id="a">Mara</span></p>', '<p><span data-type="mention" data-id="b">Mara</span></p>').added, 1);
    const lines = manuscriptLines('<table><tr><td><p>Cell one</p></td><td><p>Cell two</p></td></tr></table><script>bad()</script>');
    assert.deepEqual(lines.map(line => line.text), ['Cell one', 'Cell two']);
    assert.equal(lines[0].annotations[0], 'Table');
});

test('empty baselines and complete deletion produce honest differences', () => {
    assert.equal(chapterDiff('', '<p>New chapter</p>').added, 1);
    assert.equal(chapterDiff('<p>Deleted chapter</p>', '').deleted, 1);
    assert.deepEqual(chapterDiff('', '').rows, []);
});

test('large mostly unchanged manuscripts stay precise and large rewrites bound work', () => {
    const manuscript = Array.from({ length: 5000 }, (_, i) => `<p>Paragraph ${i}</p>`).join('');
    const diff = chapterDiff(manuscript, manuscript.replace('Paragraph 2500', 'Edited 2500'));
    assert.equal(diff.added, 1); assert.equal(diff.deleted, 1); assert.equal(diff.simplified, false);
    assert.ok(diffGroups(diff.rows).some(group => group.kind === 'context' && group.rows.length > 2000));
    const rewrite = chapterDiff(Array.from({ length: 1100 }, (_, i) => `<p>Old ${i}</p>`).join(''), Array.from({ length: 1100 }, (_, i) => `<p>New ${i}</p>`).join(''));
    assert.equal(rewrite.simplified, true); assert.equal(rewrite.added, 1100); assert.equal(rewrite.deleted, 1100);
});

test('metadata comparisons include removals and ignore warning order', () => {
    const before = { title: 'Old', content: '', contentWarnings: ['GRIEF', 'VIOLENCE'], disclaimerNote: 'A note' };
    assert.deepEqual(chapterMetadataChanges(before, { ...before, contentWarnings: ['VIOLENCE', 'GRIEF'] }), []);
    assert.deepEqual(chapterMetadataChanges(before, { title: 'New', content: '', contentWarnings: [], disclaimerNote: '' }).map(item => item.label), ['Title', 'Content warnings', 'Author note']);
});
