import test from 'node:test';
import assert from 'node:assert/strict';
import { manuscriptPlainText, manuscriptWordCount } from '../utils/manuscriptText.ts';

test('copying preserves paragraphs, headings, line breaks and scene breaks', () => {
    assert.equal(manuscriptPlainText('<h2>The letter</h2><p>She waited.<br>Then she left.</p><hr><div data-mood="eerie"><p>A door opened.</p></div>'), 'The letter\n\nShe waited.\nThen she left.\n\n* * *\n\nA door opened.');
});
test('inline marks do not add words and entities become readable text', () => {
    const html = '<p>un<strong>broken</strong> words &amp; rain&nbsp;fall.</p><p>One more.</p>';
    assert.equal(manuscriptWordCount(html), 7);
    assert.equal(manuscriptWordCount('<p>un<strong>broken</strong></p><p>Second</p>'), 2);
    assert.equal(manuscriptPlainText(html), 'unbroken words & rain fall.\n\nOne more.');
});
test('list and scene-break decoration is not counted as manuscript words', () => {
    assert.equal(manuscriptWordCount('<ul><li>First thought</li><li>Second thought</li></ul><hr><p>Final words.</p>'), 6);
});
test('non-manuscript markup and annotation metadata cannot become prose', () => {
    assert.equal(manuscriptPlainText('<style>hidden</style><script>alert(1)</script><p>Quiet<span data-footnote="Secret note"></span> light.</p>'), 'Quiet light.');
    assert.equal(manuscriptWordCount('<p></p><hr><p>&nbsp;</p>'), 0);
});
