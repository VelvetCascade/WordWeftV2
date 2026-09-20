import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
    getSeedIndex,
    normalizeCipherStyle,
    getCipherFontFamily,
    getCipherFontUrl,
} from '../utils/cipherFont.ts';

test('cipherFont utility extracts and normalizes font configurations correctly', () => {
    assert.equal(getSeedIndex('ww-cipher-1'), '1');
    assert.equal(getSeedIndex('ww-cipher-3'), '3');
    assert.equal(getSeedIndex('ww-cipher-5'), '5');
    assert.equal(getSeedIndex(undefined), '1');
    assert.equal(getSeedIndex('invalid-seed'), '1');

    assert.equal(normalizeCipherStyle('literary'), 'serif');
    assert.equal(normalizeCipherStyle('serif'), 'serif');
    assert.equal(normalizeCipherStyle('modern'), 'sans');
    assert.equal(normalizeCipherStyle('sans'), 'sans');

    assert.equal(getCipherFontFamily('ww-cipher-1', 'literary'), 'WW-Cipher-Serif-1');
    assert.equal(getCipherFontFamily('ww-cipher-1', 'modern'), 'WW-Cipher-Sans-1');
    assert.equal(getCipherFontFamily('ww-cipher-4', 'literary'), 'WW-Cipher-Serif-4');
    assert.equal(getCipherFontFamily('ww-cipher-4', 'modern'), 'WW-Cipher-Sans-4');

    assert.equal(getCipherFontUrl('ww-cipher-2', 'literary'), '/fonts/ww-cipher-serif-2.ttf');
    assert.equal(getCipherFontUrl('ww-cipher-2', 'modern'), '/fonts/ww-cipher-sans-2.ttf');
});

test('TrueType cipher font binary assets exist for all 5 seeds (serif and sans)', () => {
    for (let i = 1; i <= 5; i++) {
        const serifPath = new URL(`../public/fonts/ww-cipher-serif-${i}.ttf`, import.meta.url);
        const sansPath = new URL(`../public/fonts/ww-cipher-sans-${i}.ttf`, import.meta.url);

        assert.ok(existsSync(serifPath), `Serif font ww-cipher-serif-${i}.ttf must exist`);
        assert.ok(existsSync(sansPath), `Sans font ww-cipher-sans-${i}.ttf must exist`);

        const serifBytes = readFileSync(serifPath);
        const sansBytes = readFileSync(sansPath);

        assert.ok(serifBytes.length > 20000, `Serif font ${i} must have valid TrueType binary size`);
        assert.ok(sansBytes.length > 20000, `Sans font ${i} must have valid TrueType binary size`);
    }
});

test('cipherMappings.json defines valid 1:1 PUA mapping tables for all 5 seeds', () => {
    const jsonPath = new URL('../constants/cipherMappings.json', import.meta.url);
    assert.ok(existsSync(jsonPath), 'constants/cipherMappings.json must exist');

    const raw = readFileSync(jsonPath, 'utf8');
    const mappings = JSON.parse(raw);

    for (let i = 1; i <= 5; i++) {
        const key = `ww-cipher-${i}`;
        assert.ok(mappings[key], `Mapping for ${key} must exist`);
        assert.ok(mappings[key].encodeMap, `${key} must have encodeMap`);
        assert.ok(mappings[key].decodeMap, `${key} must have decodeMap`);

        const encodeKeys = Object.keys(mappings[key].encodeMap);
        assert.equal(encodeKeys.length, 62, 'Encode map must cover all 62 alphanumeric chars (a-z, A-Z, 0-9)');

        // Verify all mapped values are in Private Use Area (0xE100 - 0xE13D)
        for (const [char, puaChar] of Object.entries(mappings[key].encodeMap)) {
            const puaCode = (puaChar as string).charCodeAt(0);
            assert.ok(
                puaCode >= 0xE100 && puaCode <= 0xE13D,
                `PUA code ${puaCode.toString(16)} for '${char}' must be within 0xE100 - 0xE13D`
            );
            // Verify 1:1 reversibility
            assert.equal(mappings[key].decodeMap[puaChar as string], char, `Decode map must reverse '${char}'`);
        }
    }
});

test('chapter content contract models font obfuscation fields', () => {
    const types = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
    assert.match(types, /obfuscated\?:\s*boolean/);
    assert.match(types, /obfuscationSeed\?:\s*string/);
    assert.match(types, /fontFamily\?:\s*string/);
});

test('client and editor enforce pristine edit mode for authors', () => {
    const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8');
    const editor = readFileSync(new URL('../pages/ChapterEditorPage.tsx', import.meta.url), 'utf8');

    assert.match(client, /getChapterContent\([^)]*mode:\s*'read'\s*\|\s*'edit'/);
    assert.match(client, /mode\s*===\s*'edit'\s*\?\s*'\?mode=edit'\s*:\s*''/);
    assert.match(editor, /api\.getChapterContent\(bookId,\s*chapterId,\s*'edit'\)/);
});

test('reader page integrates cipher font preloading and prose font family assignment', () => {
    const reader = readFileSync(new URL('../pages/ReaderPage.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

    assert.match(reader, /import\s*\{[^}]*ensureCipherFontLoaded[^}]*\}\s*from\s*'\.\.\/utils\/cipherFont'/);
    assert.match(reader, /preloadCipherFonts\(result\.obfuscationSeed\)/);
    assert.match(reader, /has-cipher-font/);
    assert.match(reader, /--reader-cipher-font/);

    assert.match(css, /\.reader-copy\.has-cipher-font/);
    assert.match(css, /var\(--reader-cipher-font/);
});
