import { Character } from '../types';

export const analyzeMentions = (html: string, characters: Character[]): { newHtml: string, count: number } => {
    if (!html || characters.length === 0) return { newHtml: html, count: 0 };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let replacementCount = 0;

    // Sort characters by name length (longest first) so "Jon Snow" matches before "Jon"
    const sortedCharacters = [...characters].sort((a, b) => b.name.length - a.name.length);

    // Build a regex pattern: match any character name exactly, not bounded by other word characters
    // Using simple \b or word boundary checks
    const nameMap = new Map(sortedCharacters.map(c => [c.name.toLowerCase(), c]));
    
    // Escape regex specifics
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = sortedCharacters.map(c => escapeRegExp(c.name)).join('|');
    const regex = new RegExp(`\\b(${namePattern})\\b`, 'gi');

    const walkAndReplace = (node: Node) => {
        // Stop condition if we hit a node that shouldn't be altered
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            // Skip code, pre, or already marked mentions
            if (['CODE', 'PRE'].includes(el.tagName)) return;
            if (el.getAttribute('data-type') === 'mention') return;
            if (el.classList.contains('mention')) return;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const text = node.textContent;

            // Fast check
            if (!regex.test(text)) return;
            regex.lastIndex = 0;

            let match;
            const fragments: (Node | string)[] = [];
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
                    span.setAttribute('data-label', charMatch.name); // Using plain name or @name depending on preference
                    span.textContent = `@${charMatch.name}`; // Prefix with @ for UI presentation
                    
                    fragments.push(span);
                    replacementCount++;
                    
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
        count: replacementCount
    };
};
