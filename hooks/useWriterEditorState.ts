import { useEditorState, type Editor } from '@tiptap/react';
import { editorSelectionContext } from '../utils/editorSelectionContext';
import { canMakePullQuote } from '../utils/editorStructuredBlocks';

/** Subscribe the controls, not the manuscript, to meaningful editor state changes. */
export function useWriterEditorState(editor: Editor | null) {
    return useEditorState({ editor, selector: ({ editor: current }) => {
        if (!current || current.isDestroyed) return null;
        return {
            ...editorSelectionContext(current.state),
            bold: current.isActive('bold'), italic: current.isActive('italic'),
            underline: current.isActive('underline'), strike: current.isActive('strike'),
            code: current.isActive('code'), spoiler: current.isActive('spoiler'),
            link: current.isActive('link'), bulletList: current.isActive('bulletList'),
            orderedList: current.isActive('orderedList'),
            table: current.isActive('table'), blockquote: current.isActive('blockquote'),
            codeBlock: current.isActive('codeBlock'), details: current.isActive('details'),
            pullQuote: current.isActive('pullQuote'),
            canPullQuote: canMakePullQuote(current.state),
            canChangeStyle: current.can().setParagraph() || current.can().setHeading({ level: 2 }),
            canBold: current.can().toggleBold(), canItalic: current.can().toggleItalic(),
            canUnderline: current.can().toggleUnderline(), canStrike: current.can().toggleStrike(),
            canCode: current.can().toggleCode(), canSpoiler: current.can().toggleSpoiler(),
            undo: current.can().undo(), redo: current.can().redo(),
        };
    } });
}
