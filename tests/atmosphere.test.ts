import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moodAtReadingLine, readAtmosphereIntensity } from '../utils/atmosphere.ts';
test('long passages keep their mood at the reading line regardless of visible ratio', () => {
    assert.equal(moodAtReadingLine([{ mood: 'melancholy', top: -1200, bottom: 600 }, { mood: 'romantic', top: 620, bottom: 800 }], 260), 'melancholy');
});
test('passage boundaries switch once and untagged space stays neutral', () => {
    const blocks = [{ mood: 'melancholy', top: 0, bottom: 300 }, { mood: 'romantic', top: 300, bottom: 600 }];
    assert.equal(moodAtReadingLine(blocks, 299), 'melancholy');
    assert.equal(moodAtReadingLine(blocks, 300), 'romantic');
    assert.equal(moodAtReadingLine(blocks, 650), null);
});
test('invalid historical mood attributes do not crash the renderer', () => {
    assert.equal(moodAtReadingLine([{ mood: 'unknown', top: 0, bottom: 500 }], 100), null);
});
test('nested historical sections use the innermost passage', () => {
    assert.equal(moodAtReadingLine([{ mood: 'eerie', top: 0, bottom: 900 }, { mood: 'serene', top: 100, bottom: 300 }], 200), 'serene');
});
test('atmosphere preferences tolerate missing or corrupt stored values', () => {
    assert.equal(readAtmosphereIntensity(null), 'full'); assert.equal(readAtmosphereIntensity('corrupt'), 'full');
    assert.equal(readAtmosphereIntensity('off'), 'off'); assert.equal(readAtmosphereIntensity('subtle'), 'subtle');
});
