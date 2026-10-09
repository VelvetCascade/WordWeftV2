import type { Character } from '../types';
import { characterNameKey } from './characterRecognition';

/** Link reviewed cast names without changing prose, inline formatting or code. */
export const analyzeMentions = (html: string, characters: Character[]): { newHtml: string; count: number; occurrences: { name: string; label: string; count: number }[] } => {
    if (!html || !characters.length) return { newHtml: html, count: 0, occurrences: [] };
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nameMap = new Map<string, Character>();
    const canonicalNames = new Set<string>(); const ambiguous = new Set<string>();
    for (const character of characters) if (character.name.trim()) {
        const key = characterNameKey(character.name); canonicalNames.add(key);
        if (ambiguous.has(key)) continue;
        if (nameMap.has(key) && nameMap.get(key)!.id !== character.id) { nameMap.delete(key); ambiguous.add(key); }
        else nameMap.set(key, character);
    }
    for (const character of characters) for (const alias of character.aliases || []) {
        const key = characterNameKey(alias);
        if (!key || canonicalNames.has(key) || ambiguous.has(key)) continue;
        const existing = nameMap.get(key);
        if (existing && existing.id !== character.id) { nameMap.delete(key); ambiguous.add(key); }
        else nameMap.set(key, character);
    }
    const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]").replace(/ /g, '[ \\t\\u00a0]+');
    const pattern = [...nameMap.keys()].sort((a, b) => b.length - a.length).map(escape).join('|');
    if (!pattern) return { newHtml: html, count: 0, occurrences: [] };
    const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'giu');
    const commonNames = new Set(['may', 'will', 'rose', 'hope', 'grace', 'faith', 'joy', 'summer', 'autumn', 'april', 'mark', 'bill', 'pat', 'chase']);
    const occurrences = new Map<string, { name: string; label: string; count: number }>();
    let count = 0; let run: Text[] = [];
    const flush = () => {
        if (!run.length) return;
        const nodes = run; run = [];
        const text = nodes.map(node => node.data).join('');
        const matches = [...text.matchAll(regex)].filter(match => {
            const key = characterNameKey(match[0]);
            const character = nameMap.get(key)!;
            // A short surname alias does not identify a titled family member.
            // Authors can add an explicit 'Mrs. Lucas' alias when that is intended.
            if (!key.includes(' ') && characterNameKey(character.name).includes(' ') && /\b(?:mr|mrs|ms|miss|dr|professor|prof|captain|capt|sir|lady|lord|dame|king|queen|prince|princess)\.?\s+$/i.test(text.slice(Math.max(0, match.index - 30), match.index))) return false;
            if (!commonNames.has(key)) return true;
            // Ordinary lowercase words and modal questions are not character mentions.
            if (match[0][0] === match[0][0].toLocaleLowerCase('en')) return false;
            return !(['may', 'will'].includes(key) && /^\s+(?:I|you|we|they|he|she|it)\b/i.test(text.slice(match.index + match[0].length)));
        });
        if (!matches.length) return;
        for (const match of matches) {
            const character = nameMap.get(characterNameKey(match[0]))!;
            const key = `${character.id}:${characterNameKey(match[0])}`; const previous = occurrences.get(key);
            if (previous) previous.count++; else occurrences.set(key, { name: character.name, label: match[0], count: 1 });
            count++;
        }
        let offset = 0; let firstMatch = 0;
        for (const node of nodes) {
            const end = offset + node.data.length;
            while (firstMatch < matches.length && matches[firstMatch].index + matches[firstMatch][0].length <= offset) firstMatch++;
            const fragment = doc.createDocumentFragment(); let localOffset = 0;
            for (let index = firstMatch; index < matches.length && matches[index].index < end; index++) {
                const match = matches[index]; const start = Math.max(0, match.index - offset); const stop = Math.min(node.data.length, match.index + match[0].length - offset);
                if (start >= stop) continue;
                if (start > localOffset) fragment.append(doc.createTextNode(node.data.slice(localOffset, start)));
                const label = node.data.slice(start, stop); const span = doc.createElement('span');
                span.dataset.type = 'mention'; span.className = 'mention'; span.dataset.id = nameMap.get(characterNameKey(match[0]))!.id;
                span.dataset.label = label; span.textContent = label; fragment.append(span); localOffset = stop;
            }
            if (localOffset > 0) { if (localOffset < node.data.length) fragment.append(doc.createTextNode(node.data.slice(localOffset))); node.replaceWith(fragment); }
            offset = end;
        }
    };
    const blocks = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'TR', 'TABLE', 'DETAILS', 'SUMMARY', 'SECTION', 'BR', 'HR', 'IMG']);
    const visit = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) { run.push(node as Text); return; }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as HTMLElement;
        if (['CODE', 'PRE', 'A', 'SCRIPT', 'STYLE'].includes(element.tagName) || ['mention', 'footnote'].includes(element.dataset.type || '') || element.classList.contains('mention')) { flush(); return; }
        const boundary = blocks.has(element.tagName); if (boundary) flush();
        [...element.childNodes].forEach(visit);
        if (boundary) flush();
    };
    visit(doc.body); flush();
    return { newHtml: count ? doc.body.innerHTML : html, count, occurrences: [...occurrences.values()] };
};
