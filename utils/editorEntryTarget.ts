import type { Transaction } from '@tiptap/pm/state';
import { FOOTNOTE_NUMBERING_META } from './editorFootnotes.ts';

export interface EditorEntryTarget { from: number; to: number; notePosition: number | null; deleted: boolean }

/** Dialogs may outlive background uploads. Follow their original selection;
 * never let a different note take the place of a deleted or moved target. */
export function mapEditorEntryTarget(target: EditorEntryTarget, transaction: Transaction): EditorEntryTarget {
    if (!transaction.docChanged || transaction.getMeta(FOOTNOTE_NUMBERING_META)) return target;
    const from = transaction.mapping.mapResult(target.from, 1);
    const to = transaction.mapping.mapResult(target.to, target.from === target.to ? 1 : -1);
    const note = target.notePosition === null ? null : transaction.mapping.mapResult(target.notePosition, 1);
    return {
        from: Math.min(from.pos, to.pos), to: Math.max(from.pos, to.pos),
        notePosition: note ? note.pos : null,
        deleted: target.deleted || !!note?.deleted || (target.from !== target.to && from.deleted && to.deleted),
    };
}
