import { Character } from '../types';

export const analyzeMentions = (html: string, characters: Character[]): { newHtml: string, count: number, occurrences: { name: string; label: string; count: number }[] } => {
    if (!html || characters.length === 0) return { newHtml: html, count: 0, occurrences: [] };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let replacementCount = 0;

    // Sort characters by name length (longest first) so "Jon Snow" matches before "Jon"
    const nameMap = new Map<string, Character>();
    for (const character of characters) if (character.name.trim()) nameMap.set(character.name.toLowerCase(), character);
    const canonicalNames = new Set(nameMap.keys());
    const ambiguous = new Set<string>();
    for (const character of characters) for (const alias of character.aliases || []) {
        const key = alias.trim().toLowerCase();
        if (!key || canonicalNames.has(key) || ambiguous.has(key)) continue;
        const existing = nameMap.get(key);
        if (existing && existing.id !== character.id) { nameMap.delete(key); ambiguous.add(key); }
        else nameMap.set(key, character);
    }

    // Build a regex pattern: match any character name exactly, not bounded by other word characters
    // Using simple \b or word boundary checks
    
    // Escape regex specifics
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = [...nameMap.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
    if (!namePattern) return { newHtml: html, count: 0, occurrences: [] };
    const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(${namePattern})(?![\\p{L}\\p{N}_])`, 'giu');
    const occurrences = new Map<string, { name: string; label: string; count: number }>();

    const walkAndReplace = (node: Node) => {
        // Stop condition if we hit a node that shouldn't be altered
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            // Skip code, pre, or already marked mentions
            if (['CODE', 'PRE', 'A', 'SCRIPT', 'STYLE'].includes(el.tagName)) return;
            if (el.getAttribute('data-type') === 'mention') return;
            if (el.classList.contains('mention')) return;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const text = node.textContent;

            // Fast check
            regex.lastIndex = 0;
            if (!regex.test(text)) return;
            regex.lastIndex = 0;

            let match;
            const fragments: Node[] = [];
            let lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                const matchStr = match[0];
                const charMatch = nameMap.get(matchStr.toLowerCase());

                if (charMatch) {
                    // Push preceding text
                    if (match.index > lastIndex) {
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create the mention span
                    const span = document.createElement('span');
                    span.setAttribute('data-type', 'mention');
                    span.setAttribute('class', 'mention');
                    span.setAttribute('data-id', charMatch.id);
                    span.setAttribute('data-label', matchStr);
                    span.textContent = matchStr;
                    
                    fragments.push(span);
                    replacementCount++;
                    const key = `${charMatch.id}:${matchStr.toLowerCase()}`;
                    const occurrence = occurrences.get(key);
                    if (occurrence) occurrence.count++;
                    else occurrences.set(key, { name: charMatch.name, label: matchStr, count: 1 });
                    
                    lastIndex = regex.lastIndex;
                }
            }

            if (fragments.length > 0) {
                // Push remaining text
                if (lastIndex < text.length) {
                    fragments.push(document.createTextNode(text.substring(lastIndex)));
                }

                // Replace the old text node with the new fragments
                if (node.parentNode) {
                    const parent = node.parentNode;
                    fragments.forEach(frag => parent.insertBefore(frag, node));
                    parent.removeChild(node);
                }
            }
        } else {
            // Traverse child nodes
            // Need to convert to array first because we might modify DOM while iterating
            Array.from(node.childNodes).forEach(child => walkAndReplace(child));
        }
    };

    walkAndReplace(doc.body);

    return {
        newHtml: doc.body.innerHTML,
        count: replacementCount,
        occurrences: [...occurrences.values()],
    };
};
