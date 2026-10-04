import type { BookProgress, Comment } from '../types';

export type DiscussionScope = 'all' | 'chapter' | 'passage';
export function discussionComments(comments: Comment[], scope: DiscussionScope, paragraphIndex: number | null = null) {
    if (scope === 'all') return comments;
    const byId = new Map(comments.map(comment => [comment.id, comment]));
    return comments.filter(comment => {
        let root = comment;
        const visited = new Set<string>();
        while (root.parentId && byId.has(root.parentId) && !visited.has(root.id)) {
            visited.add(root.id); root = byId.get(root.parentId)!;
        }
        return scope === 'chapter' ? root.paragraphIndex === null : paragraphIndex === null ? root.paragraphIndex !== null : root.paragraphIndex === paragraphIndex;
    });
}
export function nextUnreadChapterIndex(chapters: {id: string; status: string}[], progress?: BookProgress | null) {
    return chapters.findIndex(chapter => chapter.status === 'published' && (progress?.chapters?.[chapter.id]?.progress ?? 0) < 90);
}
const readingTimestamp = (value: string) => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
export function hasNewReleasedChapter(chapters: {id: string; status: string; publishedAt?: string | null}[], progress?: BookProgress | null) {
    return !!progress && Object.values(progress.chapters ?? {}).some(chapter => chapter.progress > 0)
        && chapters.some(chapter => chapter.status === 'published' && !progress.chapters?.[chapter.id] && !!chapter.publishedAt && !!progress.lastReadTimestamp && readingTimestamp(chapter.publishedAt) > readingTimestamp(progress.lastReadTimestamp));
}
export function normalizePassage(text: string) { return text.replace(/\s+/g, ' ').trim(); }
const passageSelector = 'p,h1,h2,h3,h4,h5,h6,blockquote,ul,ol,pre';
const separatedTags = new Set('address article aside blockquote br dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr li main nav ol p pre section table tbody td tfoot th thead tr ul'.split(' '));
export function authoredPassageTexts(html: string): string[] {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const text = (node: Node): string => {
        if (node.nodeType === 3) return node.textContent ?? '';
        if (node.nodeType !== 1) return '';
        const tag = (node as Element).tagName.toLowerCase();
        if (tag === 'script' || tag === 'style') return '';
        const content = Array.from(node.childNodes).map(text).join('');
        // Match the server's block/br word boundaries while preserving adjacent inline text.
        return separatedTags.has(tag) ? ` ${content} ` : content;
    };
    return Array.from(document.body.querySelectorAll(passageSelector)).map(block => normalizePassage(text(block)));
}
export function resolvePassageIndex(blocks: string[], index: number, quote: string): number | null {
    const normalized = normalizePassage(quote);
    if (!normalized) return null;
    if (normalizePassage(blocks[index] ?? '') === normalized) return index;
    const matches = blocks.map((text, i) => normalizePassage(text) === normalized ? i : -1).filter(i => i >= 0);
    // A changed passage must not silently reopen an unrelated place.
    return matches.length === 1 ? matches[0] : null;
}
export function privateCharacterPreview<T extends {description?: string; goal?: string; descriptionVisibility?: string; goalVisibility?: string}>(character: T): T {
    return { ...character, description: character.descriptionVisibility === 'PRIVATE' ? '' : character.description, goal: character.goalVisibility === 'PUBLIC' ? character.goal : '' };
}
