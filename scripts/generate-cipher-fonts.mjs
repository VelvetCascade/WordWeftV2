import fs from 'fs';
import path from 'path';

// Compute 32-bit checksum of a buffer chunk
function calcTableChecksum(buffer, offset, length) {
    let sum = 0;
    const nLongs = Math.ceil(length / 4);
    for (let i = 0; i < nLongs; i++) {
        const bytePos = offset + i * 4;
        let val = 0;
        if (bytePos + 4 <= buffer.length) {
            val = buffer.readUInt32BE(bytePos);
        } else {
            const remaining = buffer.length - bytePos;
            const tmp = Buffer.alloc(4);
            buffer.copy(tmp, 0, bytePos, bytePos + remaining);
            val = tmp.readUInt32BE(0);
        }
        sum = (sum + val) >>> 0;
    }
    return sum;
}

// Build a TTF format 4 cmap subtable
function buildFormat4Subtable(mappings) {
    const segments = [];
    let currentSeg = null;

    for (const m of mappings) {
        if (!currentSeg) {
            currentSeg = { start: m.code, end: m.code, glyphs: [m.glyphId] };
        } else if (m.code === currentSeg.end + 1) {
            currentSeg.end = m.code;
            currentSeg.glyphs.push(m.glyphId);
        } else {
            segments.push(currentSeg);
            currentSeg = { start: m.code, end: m.code, glyphs: [m.glyphId] };
        }
    }
    if (currentSeg) segments.push(currentSeg);

    // Add 0xFFFF sentinel segment
    segments.push({ start: 0xFFFF, end: 0xFFFF, glyphs: [0] });

    const segCount = segments.length;
    const segCountX2 = segCount * 2;
    let searchRange = 1;
    let entrySelector = 0;
    while ((searchRange * 2) <= segCount) {
        searchRange *= 2;
        entrySelector++;
    }
    searchRange *= 2;
    const rangeShift = segCountX2 - searchRange;

    const glyphIdArray = [];
    const idDelta = [];
    const idRangeOffset = [];

    const headersSize = 14 + segCount * 8 + 2;

    for (let i = 0; i < segCount; i++) {
        const seg = segments[i];
        if (seg.start === 0xFFFF) {
            idDelta.push(1);
            idRangeOffset.push(0);
            continue;
        }

        let isConstantDelta = true;
        const firstDelta = (seg.glyphs[0] - seg.start) & 0xFFFF;
        for (let j = 1; j < seg.glyphs.length; j++) {
            if (((seg.glyphs[j] - (seg.start + j)) & 0xFFFF) !== firstDelta) {
                isConstantDelta = false;
                break;
            }
        }

        if (isConstantDelta) {
            idDelta.push(firstDelta);
            idRangeOffset.push(0);
        } else {
            idDelta.push(0);
            const currentOffsetInBytes = 14 + segCount * 6 + 2 + i * 2;
            const targetOffsetInBytes = headersSize + glyphIdArray.length * 2;
            const offsetWord = (targetOffsetInBytes - currentOffsetInBytes) & 0xFFFF;
            idRangeOffset.push(offsetWord);
            for (const g of seg.glyphs) {
                glyphIdArray.push(g);
            }
        }
    }

    const subtableLength = headersSize + glyphIdArray.length * 2;
    const buf = Buffer.alloc(subtableLength);
    let pos = 0;
    buf.writeUInt16BE(4, pos); pos += 2;
    buf.writeUInt16BE(subtableLength, pos); pos += 2;
    buf.writeUInt16BE(0, pos); pos += 2;
    buf.writeUInt16BE(segCountX2, pos); pos += 2;
    buf.writeUInt16BE(searchRange, pos); pos += 2;
    buf.writeUInt16BE(entrySelector, pos); pos += 2;
    buf.writeUInt16BE(rangeShift, pos); pos += 2;

    for (const seg of segments) {
        buf.writeUInt16BE(seg.end, pos); pos += 2;
    }
    buf.writeUInt16BE(0, pos); pos += 2;

    for (const seg of segments) {
        buf.writeUInt16BE(seg.start, pos); pos += 2;
    }
    for (const delta of idDelta) {
        buf.writeUInt16BE(delta & 0xFFFF, pos); pos += 2;
    }
    for (const ro of idRangeOffset) {
        buf.writeUInt16BE(ro, pos); pos += 2;
    }
    for (const gid of glyphIdArray) {
        buf.writeUInt16BE(gid, pos); pos += 2;
    }

    return buf;
}

// Extract character to glyphId map from a base TTF
function parseBaseFont(origBuf) {
    const numTables = origBuf.readUInt16BE(4);
    const tables = [];
    let cmapIndex = -1;
    let headIndex = -1;

    for (let i = 0; i < numTables; i++) {
        const offset = 12 + i * 16;
        const tag = origBuf.toString('ascii', offset, offset + 4);
        const checksum = origBuf.readUInt32BE(offset + 4);
        const tableOffset = origBuf.readUInt32BE(offset + 8);
        const tableLength = origBuf.readUInt32BE(offset + 12);
        const entry = {
            tag, checksum, offset: tableOffset, length: tableLength,
            data: origBuf.slice(tableOffset, tableOffset + tableLength)
        };
        if (tag === 'cmap') cmapIndex = i;
        if (tag === 'head') headIndex = i;
        tables.push(entry);
    }

    const origCmap = tables[cmapIndex].data;
    const numSubtables = origCmap.readUInt16BE(2);
    let sub12Offset = null;
    let sub4Offset = null;

    for (let i = 0; i < numSubtables; i++) {
        const subOffset = 4 + i * 8;
        const offset = origCmap.readUInt32BE(subOffset + 4);
        const format = origCmap.readUInt16BE(offset);
        if (format === 12 && !sub12Offset) sub12Offset = offset;
        if (format === 4 && !sub4Offset) sub4Offset = offset;
    }

    function getGlyphId(charCode) {
        if (sub12Offset) {
            const nGroups = origCmap.readUInt32BE(sub12Offset + 12);
            for (let i = 0; i < nGroups; i++) {
                const gOffset = sub12Offset + 16 + i * 12;
                const startCode = origCmap.readUInt32BE(gOffset);
                const endCode = origCmap.readUInt32BE(gOffset + 4);
                const startGlyph = origCmap.readUInt32BE(gOffset + 8);
                if (charCode >= startCode && charCode <= endCode) {
                    return startGlyph + (charCode - startCode);
                }
            }
        }
        if (sub4Offset) {
            const segCountX2 = origCmap.readUInt16BE(sub4Offset + 6);
            const segCount = segCountX2 / 2;
            const endCodeOffset = sub4Offset + 14;
            const startCodeOffset = endCodeOffset + segCountX2 + 2;
            const idDeltaOffset = startCodeOffset + segCountX2;
            const idRangeOffsetOffset = idDeltaOffset + segCountX2;

            for (let i = 0; i < segCount; i++) {
                const endCode = origCmap.readUInt16BE(endCodeOffset + i * 2);
                if (charCode <= endCode) {
                    const startCode = origCmap.readUInt16BE(startCodeOffset + i * 2);
                    if (charCode >= startCode) {
                        const idRangeOffset = origCmap.readUInt16BE(idRangeOffsetOffset + i * 2);
                        const idDelta = origCmap.readInt16BE(idDeltaOffset + i * 2);
                        if (idRangeOffset === 0) {
                            return (charCode + idDelta) & 0xFFFF;
                        } else {
                            const roAddress = idRangeOffsetOffset + i * 2;
                            const glyphAddress = roAddress + idRangeOffset + (charCode - startCode) * 2;
                            return origCmap.readUInt16BE(glyphAddress);
                        }
                    } else {
                        return 0;
                    }
                }
            }
        }
        return 0;
    }

    return { origBuf, tables, cmapIndex, headIndex, getGlyphId };
}

// Assemble a new TTF with custom mappings
function assembleTTF(parsed, mappings) {
    const { origBuf, tables, cmapIndex, headIndex } = parsed;
    const clonedTables = tables.map(t => ({ ...t, data: Buffer.from(t.data) }));

    const fmt4 = buildFormat4Subtable(mappings);
    const newCmapLength = 4 + 16 + fmt4.length;
    const newCmap = Buffer.alloc(newCmapLength);
    newCmap.writeUInt16BE(0, 0); // version
    newCmap.writeUInt16BE(2, 2); // 2 subtables: Unicode BMP & Windows BMP

    // Subtable 0: Unicode Platform (0), BMP (3), offset = 20
    newCmap.writeUInt16BE(0, 4);
    newCmap.writeUInt16BE(3, 6);
    newCmap.writeUInt32BE(20, 8);

    // Subtable 1: Windows Platform (3), Unicode BMP (1), offset = 20
    newCmap.writeUInt16BE(3, 12);
    newCmap.writeUInt16BE(1, 14);
    newCmap.writeUInt32BE(20, 16);

    fmt4.copy(newCmap, 20);

    clonedTables[cmapIndex].data = newCmap;
    clonedTables[cmapIndex].length = newCmap.length;
    clonedTables[cmapIndex].checksum = calcTableChecksum(newCmap, 0, newCmap.length);

    let tableOffset = Math.ceil((12 + clonedTables.length * 16) / 4) * 4;
    for (const t of clonedTables) {
        t.offset = tableOffset;
        tableOffset += Math.ceil(t.length / 4) * 4;
    }

    const outBuf = Buffer.alloc(tableOffset);
    origBuf.copy(outBuf, 0, 0, 12);

    for (let i = 0; i < clonedTables.length; i++) {
        const t = clonedTables[i];
        const dirOffset = 12 + i * 16;
        outBuf.write(t.tag, dirOffset, 4, 'ascii');
        outBuf.writeUInt32BE(t.checksum, dirOffset + 4);
        outBuf.writeUInt32BE(t.offset, dirOffset + 8);
        outBuf.writeUInt32BE(t.length, dirOffset + 12);
        t.data.copy(outBuf, t.offset);
    }

    const headOffset = clonedTables[headIndex].offset;
    outBuf.writeUInt32BE(0, headOffset + 8);
    const wholeChecksum = calcTableChecksum(outBuf, 0, outBuf.length);
    const checkSumAdjustment = (0xB1B0AFBA - wholeChecksum) >>> 0;
    outBuf.writeUInt32BE(checkSumAdjustment, headOffset + 8);

    const newHeadChecksum = calcTableChecksum(outBuf, headOffset, clonedTables[headIndex].length);
    outBuf.writeUInt32BE(newHeadChecksum, 12 + headIndex * 16 + 4);

    return outBuf;
}

// Deterministic permutation using LCG
const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PUA_START = 0xE100;

function generateSeedMap(seedNumber) {
    const chars = ALPHANUM.split('');
    let s = seedNumber * 10007 + 54321;
    function nextRand() {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    }
    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(nextRand() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    // Map each original character to a PUA code point
    const encodeMap = {}; // original char -> PUA char
    const decodeMap = {}; // PUA char -> original char
    const puaToOriginalGlyphChar = {}; // PUA code -> original char whose glyph it draws

    for (let i = 0; i < chars.length; i++) {
        const origChar = chars[i];
        const puaCode = PUA_START + i;
        const puaChar = String.fromCharCode(puaCode);
        encodeMap[origChar] = puaChar;
        decodeMap[puaChar] = origChar;
        puaToOriginalGlyphChar[puaCode] = origChar;
    }

    return { encodeMap, decodeMap, puaToOriginalGlyphChar };
}

const COMMON_PUNCTUATION_CODES = [
    0x20, // space
    0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
    0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0x40,
    0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60,
    0x7B, 0x7C, 0x7D, 0x7E,
    0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026 // smart punctuation
];

async function main() {
    console.log('Downloading base fonts...');
    const interUrl = 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf';
    const literataUrl = 'https://fonts.gstatic.com/s/literata/v40/or3PQ6P12-iJxAIgLa78DkrbXsDgk0oVDaDPYLanFLHpPf2TbBG_F_Y.ttf';

    const [interRes, literataRes] = await Promise.all([fetch(interUrl), fetch(literataUrl)]);
    const interBuf = Buffer.from(await interRes.arrayBuffer());
    const literataBuf = Buffer.from(await literataRes.arrayBuffer());

    console.log('Parsing base fonts...');
    const parsedSans = parseBaseFont(interBuf);
    const parsedSerif = parseBaseFont(literataBuf);

    const outDir = path.resolve('public', 'fonts');
    fs.mkdirSync(outDir, { recursive: true });

    const allSeedMaps = {};

    for (let seed = 1; seed <= 5; seed++) {
        console.log(`Generating cipher font seed ${seed}...`);
        const { encodeMap, decodeMap, puaToOriginalGlyphChar } = generateSeedMap(seed);
        allSeedMaps[`ww-cipher-${seed}`] = { encodeMap, decodeMap };

        // Build mappings for Serif
        const serifMappings = [];
        for (const code of COMMON_PUNCTUATION_CODES) {
            const gid = parsedSerif.getGlyphId(code);
            if (gid > 0) serifMappings.push({ code, glyphId: gid });
        }
        for (let i = 0; i < ALPHANUM.length; i++) {
            const puaCode = PUA_START + i;
            const origChar = puaToOriginalGlyphChar[puaCode];
            const gid = parsedSerif.getGlyphId(origChar.charCodeAt(0));
            serifMappings.push({ code: puaCode, glyphId: gid });
        }
        serifMappings.sort((a, b) => a.code - b.code);

        const serifTTF = assembleTTF(parsedSerif, serifMappings);
        const serifPath = path.join(outDir, `ww-cipher-serif-${seed}.ttf`);
        fs.writeFileSync(serifPath, serifTTF);

        // Build mappings for Sans
        const sansMappings = [];
        for (const code of COMMON_PUNCTUATION_CODES) {
            const gid = parsedSans.getGlyphId(code);
            if (gid > 0) sansMappings.push({ code, glyphId: gid });
        }
        for (let i = 0; i < ALPHANUM.length; i++) {
            const puaCode = PUA_START + i;
            const origChar = puaToOriginalGlyphChar[puaCode];
            const gid = parsedSans.getGlyphId(origChar.charCodeAt(0));
            sansMappings.push({ code: puaCode, glyphId: gid });
        }
        sansMappings.sort((a, b) => a.code - b.code);

        const sansTTF = assembleTTF(parsedSans, sansMappings);
        const sansPath = path.join(outDir, `ww-cipher-sans-${seed}.ttf`);
        fs.writeFileSync(sansPath, sansTTF);

        console.log(`  -> Generated ${serifPath} (${serifTTF.length} bytes)`);
        console.log(`  -> Generated ${sansPath} (${sansTTF.length} bytes)`);
    }

    // Save mappings to constants file for frontend & backend
    const constantsDir = path.resolve('constants');
    fs.mkdirSync(constantsDir, { recursive: true });
    const jsonPath = path.join(constantsDir, 'cipherMappings.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allSeedMaps, null, 2));
    console.log(`Saved mapping definitions to ${jsonPath}`);

    // Also write Java resource file
    const javaResourceDir = path.resolve('backend', 'src', 'main', 'resources');
    fs.mkdirSync(javaResourceDir, { recursive: true });
    const javaResourcePath = path.join(javaResourceDir, 'cipherMappings.json');
    fs.writeFileSync(javaResourcePath, JSON.stringify(allSeedMaps, null, 2));
    console.log(`Saved Java resource to ${javaResourcePath}`);

    console.log('✅ All 10 cipher fonts (5 Serif, 5 Sans) and mapping tables generated successfully!');
}

main().catch(console.error);
