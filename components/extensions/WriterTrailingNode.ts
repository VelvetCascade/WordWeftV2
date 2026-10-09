import { TrailingNode } from '@tiptap/extensions';
import { appendAfterDocumentEdit } from '../../utils/editorPluginGuards';

/** Navigation and focus must never create an unsaved manuscript edit. Retain
 * Tiptap's trailing paragraph after real edits for writing beyond story blocks. */
export const WriterTrailingNode = TrailingNode.extend({
    addProseMirrorPlugins() {
        return (this.parent?.() || []).map(appendAfterDocumentEdit);
    },
});
