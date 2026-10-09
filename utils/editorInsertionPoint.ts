import type { EditorState, Transaction } from '@tiptap/pm/state';

export const captureImageInsertion = (state: EditorState) => state.selection.to;
export const mapImageInsertion = (position: number, transaction: Transaction) => transaction.mapping.map(position, 1);
