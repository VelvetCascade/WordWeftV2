/** Local, reviewable name suggestions. No manuscript is sent to an NLP service. */
export interface CharacterNameDraft { name: string; aliases?: string[] }
export interface CharacterCandidate extends CharacterNameDraft {
    aliases: string[];
    count: number;
    confidence: 'likely' | 'possible';
    reasons: string[];
    excerpt: string;
}
export const characterNameKey = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/’/g, "'").toLocaleLowerCase('en');
const titles = new Set('mr mrs ms miss dr professor prof captain capt sir lady lord dame king queen prince princess'.split(' '));
// Structural words cannot become names simply by starting a sentence. Ambiguous
// names such as May, Will and Rose are deliberately NOT blocked here.
const ordinary = new Set(('the a an he she it they we i you his her their our my your its this that these those but and or so because at in on for with to from of as if then when while before after into through over under between chapter part book prologue epilogue contents note notes summary introduction morning afternoon evening night monday tuesday wednesday thursday friday saturday sunday silence darkness light wind rain thunder door window room house garden street river forest city village sword letter nothing something everything everybody somebody anybody nobody everyone someone anyone all each another some many hello goodbye yes no please now here there once suddenly perhaps still finally').split(' '));
const ambiguousWords = new Set('may will rose hope grace faith joy summer autumn winter spring january february march april june july august september october november december dawn mark bill pat chase'.split(' '));
const particles = new Set(['de', 'del', 'da', 'di', 'du', 'van', 'von', 'der', 'la', 'le', 'of']);
const speech = 'said|says|asked|asks|replied|replies|answered|answers|whispered|whispers|shouted|shouts|murmured|murmurs|spoke|speaks|cried|cries|yelled|yells|exclaimed|exclaims';
const action = 'smiled|smiles|nodded|nods|laughed|laughs|waited|waits|carried|carries|walked|walks|turned|turns|looked|looks|watched|watches|stared|stares|sighed|sighs|sat|stood|reached|reaches|listened|listens|frowned|frowns|remembered|remembers|thought|thinks';
const speechAfter = new RegExp(`^[’']?s?\\s*[,;:]?\\s*(?:${speech})\\b`, 'i');
const speechBefore = new RegExp(`\\b(?:${speech})\\s+(?:to\\s+)?$`, 'i');
const actionAfter = new RegExp(`^[’']?s?\\s+(?:${action})\\b`, 'i');
const interactionBefore = /\b(?:met|greeted|hugged|kissed|thanked|told|followed|married|introduced|called)\s+$/i;
const stripName = (name: string) => name.trim().replace(/^[“”"‘’,.\s]+|[“”"‘’,.\s]+$/g, '').replace(new RegExp(`^(?:(?:${[...titles].join('|')})\\.?\\s+)+`, 'i'), '').replace(/[’']s$/i, '').trim();
const throwIfAborted = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError'); };
const nameParts = (name: string) => characterNameKey(name).split(' ').filter(word => !particles.has(word));

/** Extract prose without fusing paragraphs or scanning code, notes or existing mentions. */
export function characterScanText(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,code,pre,a,[data-type="mention"],.mention,[data-type="footnote"]').forEach(element => element.replaceWith(doc.createTextNode(' ')));
    doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,div,summary,td,th,br').forEach(element => element.after(doc.createTextNode('\n')));
    return doc.body.textContent || '';
}

export function isExistingCharacterName(name: string, cast: CharacterNameDraft[]): boolean {
    const key = characterNameKey(name);
    if (cast.some(character => [character.name, ...(character.aliases || [])].some(label => characterNameKey(label) === key))) return true;
    // A unique observed first/last name belongs to the existing full name. Never
    // guess when two cast members share that short form.
    return !key.includes(' ') && cast.filter(character => {
        const parts = nameParts(character.name);
        return parts.length > 1 && (parts[0] === key || parts.at(-1) === key);
    }).length === 1;
}

export async function scanCharacterNames(text: string, cast: CharacterNameDraft[] = [], signal?: AbortSignal): Promise<CharacterCandidate[]> {
    throwIfAborted(signal);
    if (!text.trim()) return [];
    // Keep the tagger out of the initial app bundle; load it only on author request.
    const { default: nlp } = await import('compromise');
    throwIfAborted(signal);
    const people = new Set<string>(); const nonPeople = new Set<string>();
    // Bounded work slices keep the dialog and cancellation responsive on phones.
    const chunks: string[] = [];
    for (let start = 0; start < text.length;) {
        let end = Math.min(start + 3500, text.length);
        if (end < text.length) { const boundary = text.lastIndexOf(' ', end); if (boundary > start + 1750) end = boundary + 1; }
        chunks.push(text.slice(start, end)); start = end;
    }
    for (const chunk of chunks) {
        throwIfAborted(signal);
        const doc = nlp(chunk);
        doc.people().out('array').forEach((name: string) => people.add(characterNameKey(stripName(name))));
        [...doc.places().out('array'), ...doc.organizations().out('array')].forEach(name => nonPeople.add(characterNameKey(stripName(name))));
        await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const tokens = [...text.matchAll(/[\p{L}][\p{L}\p{M}]*(?:['’\-][\p{L}\p{M}]+)*/gu)].map(match => ({ word: match[0], start: match.index, end: match.index + match[0].length }));
    const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]");
    const labels = cast.flatMap(character => [character.name, ...(character.aliases || [])]).map(name => name.trim()).filter(Boolean);
    const knownRanges = labels.length ? [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${labels.sort((a,b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'giu'))].map(match => [match.index, match.index + match[0].length]) : [];
    let knownIndex = 0;
    const eligible = (word: string) => /^[\p{Lu}\p{Lo}]/u.test(word) && !ordinary.has(characterNameKey(word)) && !titles.has(characterNameKey(word));
    const separators = new Set('the a an he she it they we i you his her their our my your its this that these those but and or so because at in on for with to from as if then when while before after'.split(' '));
    const continuation = (word: string) => /^[\p{Lu}\p{Lo}]/u.test(word) && !separators.has(characterNameKey(word)) && !titles.has(characterNameKey(word));
    // Keep conflicting salutations for surname-only references (Mr. Bennet and
    // Mrs. Bennet). A surname alone cannot decide which person the writer means.
    const titleGroups = new Map<string, Set<string>>();
    const groupForTitle = (title: string) => ['mrs'].includes(title) ? 'married' : ['ms', 'miss', 'lady', 'dame', 'queen', 'princess'].includes(title) ? 'female' : ['mr', 'sir', 'lord', 'king', 'prince'].includes(title) ? 'male' : 'neutral';
    tokens.forEach((token, index) => {
        const previous = tokens[index - 1]; const title = previous && characterNameKey(previous.word);
        if (!title || !titles.has(title) || !eligible(token.word) || !/^\.?[ \t]+$/.test(text.slice(previous.end, token.start))) return;
        const next = tokens[index + 1];
        if (next && continuation(next.word) && /^[ \t]+$/.test(text.slice(token.end, next.start))) return;
        const key = characterNameKey(stripName(token.word)); const groups = titleGroups.get(key) || new Set<string>();
        const group = groupForTitle(title); if (group !== 'neutral') groups.add(group); titleGroups.set(key, groups);
    });
    const found = new Map<string, CharacterCandidate & { score: number; personal: number; position: number; excerptScore: number; titleLabel?: string }>();
    for (let index = 0; index < tokens.length; index++) {
        if (index % 1000 === 0) { throwIfAborted(signal); await new Promise<void>(resolve => setTimeout(resolve, 0)); }
        const first = tokens[index];
        while (knownIndex < knownRanges.length && knownRanges[knownIndex][1] <= first.start) knownIndex++;
        const prefix = text.slice(Math.max(0, first.start - 65), first.start);
        const titledFamilyReference = new RegExp(`\\b(?:${[...titles].join('|')})\\.?\\s+$`, 'i').test(prefix) && cast.some(character => nameParts(character.name).length > 1 && nameParts(character.name).at(-1) === characterNameKey(stripName(first.word)));
        if (knownRanges[knownIndex]?.[0] <= first.start && first.start < knownRanges[knownIndex][1] && !titledFamilyReference) continue;
        if (!eligible(first.word)) continue;
        let endIndex = index;
        // Whole names take priority over their individual words. A lowercase name
        // particle is accepted only when followed by a capitalized name part.
        while (endIndex + 1 < tokens.length && endIndex - index < 4) {
            const next = tokens[endIndex + 1]; const gap = text.slice(tokens[endIndex].end, next.start);
            if (!/^[ \t]+$/.test(gap) && !(tokens[endIndex].word.length === 1 && /^\.[ \t]+$/.test(gap))) break;
            if (continuation(next.word)) endIndex++;
            else if (particles.has(next.word) && tokens[endIndex + 2] && eligible(tokens[endIndex + 2].word) && /^[ \t]+$/.test(text.slice(next.end, tokens[endIndex + 2].start))) endIndex += 2;
            else break;
        }
        let name = stripName(text.slice(first.start, tokens[endIndex].end));
        const bareKey = characterNameKey(name);
        const before = text.slice(Math.max(0, first.start - 65), first.start); const after = text.slice(tokens[endIndex].end, tokens[endIndex].end + 65);
        const titleMatch = before.match(new RegExp(`\\b(?:${[...titles].join('|')})\\.?\\s+$`, 'i'));
        const titled = !!titleMatch;
        const knownFamily = !!titleMatch && !bareKey.includes(' ') && cast.some(character => nameParts(character.name).length > 1 && nameParts(character.name).at(-1) === bareKey);
        const sharedTitle = (titleGroups.get(bareKey)?.size || 0) > 1;
        if ((sharedTitle || knownFamily) && titleMatch) name = `${titleMatch[0].trim()} ${name}`;
        const key = characterNameKey(name);
        const dialogue = speechAfter.test(after) || speechBefore.test(before);
        const interaction = interactionBefore.test(before);
        const personAction = actionAfter.test(after);
        index = endIndex;
        // Known place/organization names need explicit speaker or title evidence
        // to be proposed as personified characters.
        if (!name || isExistingCharacterName(name, cast) || (nonPeople.has(key) && !dialogue && !titled)) continue;
        const reasons = [knownFamily && 'Known surname — check identity', sharedTitle && !titled && 'Shared surname — check identity', dialogue && 'Named speaker', titled && 'Person title', interaction && 'Person interaction', personAction && 'Character action', people.has(key) && 'Person-name match'].filter(Boolean) as string[];
        let score = (dialogue ? 3 : 0) + (titled ? 3 : 0) + (interaction ? 2 : 0) + (personAction ? 2 : 0) + (people.has(bareKey) ? 1 : 0);
        if (sharedTitle && !titled) score = Math.min(score, 1);
        const previous = found.get(key);
        if (previous) {
            previous.titleLabel ||= titleMatch?.[0].trim();
            previous.count++; previous.score += score; previous.personal += Number(dialogue || titled || interaction || personAction);
            previous.reasons = [...new Set([...previous.reasons, ...reasons])];
            if (score > previous.excerptScore) { previous.excerptScore = score; previous.excerpt = text.slice(Math.max(0, first.start - 45), Math.min(text.length, tokens[endIndex].end + 90)).replace(/\s+/g, ' ').trim(); }
        } else found.set(key, { name, aliases: [], count: 1, confidence: 'possible', reasons, score, excerptScore: score, titleLabel: titleMatch?.[0].trim(), personal: Number(dialogue || titled || interaction || personAction), position: first.start,
            excerpt: text.slice(Math.max(0, first.start - 45), Math.min(text.length, tokens[endIndex].end + 90)).replace(/\s+/g, ' ').trim() });
    }
    const qualified = (candidate: typeof found extends Map<string, infer T> ? T : never) =>
        (candidate.personal > 0 && (candidate.score >= 3 || candidate.count >= 2)) ||
        (candidate.reasons.includes('Person-name match') && candidate.count >= 2 && !ambiguousWords.has(characterNameKey(candidate.name)));
    const fullNames = [...found.values()].filter(candidate => nameParts(candidate.name).length > 1 && qualified(candidate));
    for (const [key, short] of found) {
        if (key.includes(' ')) continue;
        const owners = fullNames.filter(full => { const parts = nameParts(full.name); return parts[0] === key || parts.at(-1) === key; });
        if (owners.length && short.titleLabel) {
            short.name = `${short.titleLabel} ${short.name}`; short.reasons.push('Titled surname — check identity');
        } else if (owners.length === 1 && !cast.some(character => [character.name, ...(character.aliases || [])].some(label => nameParts(label).includes(key)))) {
            const owner = owners[0]; owner.aliases.push(short.name); owner.count += short.count; owner.score += short.score; owner.personal += short.personal;
            owner.reasons = [...new Set([...owner.reasons, ...short.reasons])]; found.delete(key);
        } else if (owners.length > 1) { short.score = Math.min(short.score, 3); short.reasons.push('Shared short name — check identity'); }
    }
    throwIfAborted(signal);
    return [...found.values()].filter(qualified).sort((a, b) => b.score - a.score || b.count - a.count || a.position - b.position).map(({ score, personal, position: _position, excerptScore: _excerptScore, titleLabel: _titleLabel, ...candidate }) => ({ ...candidate, confidence: score >= 4 && personal >= 2 && !candidate.reasons.some(reason => reason.includes('check identity')) ? 'likely' : 'possible' }));
}
