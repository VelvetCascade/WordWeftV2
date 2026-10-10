import { htmlToDOM, type DOMNode } from 'html-react-parser';

export interface ChapterSnapshot {
    title: string; content: string; contentWarnings?: readonly string[]; disclaimerNote?: string | null;
}
export interface ManuscriptLine { text: string; signature: string; annotations: string[] }
export interface DiffRow { kind: 'equal' | 'delete' | 'add'; line: ManuscriptLine; before?: number; after?: number }
export interface WordChange { text: string; changed: boolean }

const textBlocks = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'cite', 'summary', 'li', 'td', 'th']);
const ignored = new Set(['script', 'style', 'template']);
const aliases: Record<string, string> = { b: 'strong', i: 'em', strike: 's' };
const attributes = new Set(['href', 'src', 'alt', 'width', 'height', 'style', 'colspan', 'rowspan', 'start',
    'data-mood', 'data-footnote', 'data-spoiler', 'data-type', 'data-id', 'data-label', 'data-pullquote']);

function signature(node: DOMNode): string {
    if (node.type === 'text') return node.data.replace(/\u00a0/g, ' ');
    if (!('name' in node) || !('children' in node) || ignored.has(node.name)) return '';
    const attrs = Object.entries(node.attribs).filter(([key]) => attributes.has(key)).sort(([a], [b]) => a.localeCompare(b));
    if ('data-footnote' in node.attribs) return JSON.stringify(['footnote', node.attribs['data-footnote']]);
    if ((node.attribs.class || '').split(/\s+/).includes('spoiler-text') && !('data-spoiler' in node.attribs)) attrs.push(['data-spoiler', 'true']);
    // Editor-generated classes and paragraph IDs are not manuscript changes.
    return JSON.stringify([aliases[node.name] || node.name, attrs, node.children.map(signature)]);
}
function textOf(node: DOMNode): string {
    if (node.type === 'text') return node.data.replace(/\u00a0/g, ' ');
    if (!('name' in node) || !('children' in node) || ignored.has(node.name)) return '';
    if (node.name === 'br') return '\n';
    if (node.name === 'img') return `[Image: ${node.attribs.alt || 'Untitled'} · ${node.attribs.src || ''}]`;
    if ('data-footnote' in node.attribs) return `[Footnote: ${node.attribs['data-footnote']}]`;
    return node.children.map(textOf).join('');
}
function descriptions(node: DOMNode, labels = new Set<string>()): string[] {
    if (!('name' in node) || !('children' in node)) return [...labels];
    const name = aliases[node.name] || node.name;
    const mark = ({ strong: 'Bold', em: 'Italic', u: 'Underline', s: 'Strikethrough', a: `Link: ${node.attribs.href || 'No destination'}`, code: 'Code' } as Record<string, string>)[name];
    if (mark) labels.add(mark);
    if (/^h[1-6]$/.test(name)) labels.add(`Heading ${name.slice(1)}`);
    if (name === 'pre') labels.add('Code block');
    if (name === 'img') labels.add('Image');
    if ('data-spoiler' in node.attribs || (node.attribs.class || '').split(/\s+/).includes('spoiler-text')) labels.add('Spoiler');
    if ('data-footnote' in node.attribs) labels.add('Footnote');
    if (node.attribs['data-type'] === 'mention') labels.add('Character link');
    if (node.attribs.style) labels.add(`Style: ${node.attribs.style}`);
    (node.children as DOMNode[]).forEach(child => descriptions(child, labels));
    return [...labels];
}

/** Paragraphs act as stable lines, independent of viewport wrapping. Never render manuscript HTML in a diff. */
export function manuscriptLines(html: string): ManuscriptLine[] {
    const lines: ManuscriptLine[] = [];
    const visit = (nodes: DOMNode[], context: string[] = []) => {
        for (const node of nodes) {
            if (node.type === 'text') {
                if (node.data.trim()) lines.push({ text: node.data, signature: JSON.stringify([context, node.data]), annotations: context });
                continue;
            }
            if (!('name' in node) || !('children' in node) || ignored.has(node.name)) continue;
            const next = [...context];
            if (node.attribs['data-mood']) next.push(`Atmosphere: ${node.attribs['data-mood']}`);
            if (node.name === 'blockquote') next.push('data-pullquote' in node.attribs ? 'Pull quote' : 'Quotation');
            if (node.name === 'details') next.push('Expandable section');
            if (node.name === 'ul') next.push('Bullet list');
            if (node.name === 'ol') next.push(`Numbered list${node.attribs.start ? ` · starts at ${node.attribs.start}` : ''}`);
            if (node.name === 'table') next.push('Table');
            if (node.name === 'th') next.push('Table heading');
            if (node.attribs.colspan || node.attribs.rowspan) next.push(`Cell: ${node.attribs.colspan || 1} columns × ${node.attribs.rowspan || 1} rows`);
            if (!textBlocks.has(node.name) && node.attribs.style) next.push(`Style: ${node.attribs.style}`);
            const nestedBlocks = node.children.some(child => 'name' in child && (textBlocks.has(child.name) || ['ul', 'ol'].includes(child.name)));
            if ((textBlocks.has(node.name) && !nestedBlocks) || node.name === 'hr' || node.name === 'img') {
                lines.push({ text: node.name === 'hr' ? '* * *' : textOf(node),
                    signature: JSON.stringify([next, signature(node)]), annotations: [...new Set([...next, ...descriptions(node)])] });
            } else visit(node.children as DOMNode[], next);
        }
    };
    visit(htmlToDOM(html || ''));
    return lines;
}

type Operation<T> = { kind: DiffRow['kind']; value: T };
/** Bounded LCS: trim stable ends first; cap work for unusually large rewrites. */
function compare<T>(before: T[], after: T[], key: (value: T) => string): { operations: Operation<T>[]; simplified: boolean } {
    let start = 0, tail = 0;
    while (start < before.length && start < after.length && key(before[start]) === key(after[start])) start++;
    while (tail < before.length - start && tail < after.length - start && key(before[before.length - 1 - tail]) === key(after[after.length - 1 - tail])) tail++;
    const a = before.slice(start, before.length - tail), b = after.slice(start, after.length - tail);
    const operations: Operation<T>[] = before.slice(0, start).map(value => ({ kind: 'equal', value }));
    const simplified = a.length * b.length > 1_000_000;
    if (simplified || !a.length || !b.length) {
        operations.push(...a.map(value => ({ kind: 'delete' as const, value })), ...b.map(value => ({ kind: 'add' as const, value })));
    } else {
        const width = b.length + 1, matrix = new Uint32Array((a.length + 1) * width);
        const ak = a.map(key), bk = b.map(key);
        for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
            matrix[i * width + j] = ak[i] === bk[j] ? matrix[(i + 1) * width + j + 1] + 1 : Math.max(matrix[(i + 1) * width + j], matrix[i * width + j + 1]);
        }
        let i = 0, j = 0;
        while (i < a.length || j < b.length) {
            if (i < a.length && j < b.length && ak[i] === bk[j]) { operations.push({ kind: 'equal', value: a[i++] }); j++; }
            else if (i < a.length && (j === b.length || matrix[(i + 1) * width + j] >= matrix[i * width + j + 1])) operations.push({ kind: 'delete', value: a[i++] });
            else operations.push({ kind: 'add', value: b[j++] });
        }
    }
    operations.push(...before.slice(before.length - tail).map(value => ({ kind: 'equal' as const, value })));
    return { operations, simplified };
}

export function chapterDiff(before: string, after: string): { rows: DiffRow[]; added: number; deleted: number; simplified: boolean } {
    const result = compare(manuscriptLines(before), manuscriptLines(after), line => line.signature);
    let oldLine = 0, newLine = 0, added = 0, deleted = 0;
    const rows = result.operations.map(({ kind, value: line }) => {
        const row: DiffRow = { kind, line };
        if (kind !== 'add') row.before = ++oldLine;
        if (kind !== 'delete') row.after = ++newLine;
        if (kind === 'add') added++;
        if (kind === 'delete') deleted++;
        return row;
    });
    return { rows, added, deleted, simplified: result.simplified };
}

export function changedWords(before: string, after: string): { before: WordChange[]; after: WordChange[] } {
    const tokens = (text: string) => text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
    const result = compare(tokens(before), tokens(after), value => value);
    return { before: result.operations.filter(op => op.kind !== 'add').map(op => ({ text: op.value, changed: op.kind === 'delete' })),
        after: result.operations.filter(op => op.kind !== 'delete').map(op => ({ text: op.value, changed: op.kind === 'add' })) };
}

export type DiffGroup = { kind: 'lines'; rows: DiffRow[] } | { kind: 'context'; rows: DiffRow[] };
export function diffGroups(rows: DiffRow[], context = 2): DiffGroup[] {
    const visible = rows.map((row, index) => row.kind !== 'equal' || rows.slice(Math.max(0, index - context), index + context + 1).some(item => item.kind !== 'equal'));
    const groups: DiffGroup[] = [];
    rows.forEach((row, index) => {
        const kind = visible[index] ? 'lines' : 'context';
        if (groups.at(-1)?.kind !== kind) groups.push({ kind, rows: [] });
        groups.at(-1)!.rows.push(row);
    });
    return groups;
}

export function chapterMetadataChanges(before: ChapterSnapshot, after: ChapterSnapshot) {
    const warnings = (values?: readonly string[]) => [...new Set(values || [])].sort().map(value => value.replaceAll('_', ' ').toLowerCase()).join(', ') || 'None';
    return [
        { label: 'Title', before: before.title || 'Untitled chapter', after: after.title || 'Untitled chapter' },
        { label: 'Content warnings', before: warnings(before.contentWarnings), after: warnings(after.contentWarnings) },
        { label: 'Author note', before: before.disclaimerNote || 'None', after: after.disclaimerNote || 'None' },
    ].filter(change => change.before !== change.after);
}
