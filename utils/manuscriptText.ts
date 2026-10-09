import { htmlToDOM, type DOMNode } from 'html-react-parser';

const blocks = new Set(['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol', 'table', 'tr']);

function readableText(html: string, includeSceneBreaks: boolean): string {
    const read = (nodes: DOMNode[]): string => nodes.map(node => {
        if (node.type === 'text') return node.data;
        if (!('name' in node) || !('children' in node)) return '';
        if (['script', 'style', 'template'].includes(node.name)) return '';
        if (node.name === 'br') return '\n';
        if (node.name === 'hr') return includeSceneBreaks ? '\n\n* * *\n\n' : '\n\n';
        const text = read(node.children as DOMNode[]);
        if (node.name === 'li') return `${text}\n`;
        if (node.name === 'td' || node.name === 'th') return `${text}\t`;
        return blocks.has(node.name) ? `\n\n${text}\n\n` : text;
    }).join('');
    return read(htmlToDOM(html || '')).replace(/\u00a0/g, ' ').replace(/[\t ]+\n/g, '\n').replace(/\n[\t ]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Preserve prose boundaries when copying or exporting a manuscript as text. */
export function manuscriptPlainText(html: string): string {
    return readableText(html, true);
}

/** Count prose, not inline tags, annotation attributes, or scene-break decoration. */
export function manuscriptWordCount(html: string): number {
    const text = readableText(html, false);
    return text ? text.split(/\s+/u).filter(Boolean).length : 0;
}
