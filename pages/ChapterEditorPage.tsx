import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User, StoryElement } from '../types';
import { ArrowLeftIcon, EyeIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import suggestion from '@tiptap/suggestion';
import { motion, AnimatePresence } from 'framer-motion';

interface ChapterEditorPageProps {
  currentUser: User;
  bookId: string;
  chapterId: string | 'new';
  onUserUpdate: (user: User) => void;
}

const toPlainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const applySmartFormatting = (text: string): string => {
  return text
    .replace(/\.\.\./g, '…')
    .replace(/--/g, '—')
    .replace(/"([^\"]+)"/g, '“$1”');
};

export const ChapterEditorPage: React.FC<ChapterEditorPageProps> = ({ currentUser, bookId, chapterId: initialChapterId, onUserUpdate }) => {
  const [chapterId, setChapterId] = useState(initialChapterId);
  const book = currentUser.writtenBooks?.find(b => b.id === bookId);
  const chapter = chapterId === 'new' ? null : book?.chapters.find(c => c.id === chapterId);
  const [title, setTitle] = useState(chapter?.title || '');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isScrapyardOpen, setIsScrapyardOpen] = useState(false);
  const [contextElement, setContextElement] = useState<StoryElement | null>(null);
  const [storyElements, setStoryElements] = useState<StoryElement[]>([]);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    api.getStoryElements(bookId).then(setStoryElements).catch(() => setStoryElements([]));
  }, [bookId]);

  const mentionExt = Mention.configure({
    HTMLAttributes: { class: 'text-accent font-semibold' },
    suggestion: {
      ...suggestion,
      items: async ({ query }) => {
        const list = await api.getStoryElements(bookId, query);
        return list.slice(0, 8).map(item => ({ id: item.id, label: item.name }));
      },
      render: () => {
        let el: HTMLDivElement;
        return {
          onStart: props => {
            el = document.createElement('div');
            el.className = 'bg-white border rounded-lg shadow-xl p-2 text-sm';
            el.innerHTML = props.items.map((i: any) => `<div class="px-2 py-1">${i.label}</div>`).join('');
            document.body.appendChild(el);
          },
          onUpdate: props => {
            el.innerHTML = props.items.map((i: any) => `<div class="px-2 py-1">${i.label}</div>`).join('');
          },
          onExit: () => {
            if (el) el.remove();
          }
        };
      }
    }
  });

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing your chapter...' }), mentionExt],
    content: chapter?.contentJson || chapter?.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plain = toPlainText(html);
      const smart = applySmartFormatting(plain);
      if (smart !== plain) {
        editor.commands.setContent(`<p>${smart}</p>`, false);
      }
      debouncedSave('draft', editor.getHTML());
    },
    onSelectionUpdate: async ({ editor }) => {
      const pos = editor.state.selection.$from.pos;
      const coords = editor.view.coordsAtPos(pos);
      const viewportCenter = window.innerHeight / 2;
      window.scrollBy({ top: coords.top - viewportCenter, behavior: 'smooth' });

      const selected = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim();
      const word = selected || editor.state.doc.textBetween(Math.max(1, pos - 15), pos + 1, ' ').split(/\s+/).pop() || '';
      if (word.length > 2) {
        const match = await api.lookupStoryElement(bookId, word.replace(/[^a-zA-Z]/g, ''));
        setContextElement(match);
      }
    }
  });

  useEffect(() => {
    if (!editor) return;
    const onKey = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        const snippet = editor.state.doc.textBetween(from, to, ' ').trim();
        if (!snippet) return;
        editor.commands.deleteSelection();
        await api.addScrapyardSnippet(bookId, chapterId === 'new' ? 'new' : chapterId, snippet).catch(() => undefined);
        setIsScrapyardOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, bookId, chapterId]);

  const scrapyard = chapter?.scrapyardSnippets || [];

  const handleSave = async (status: 'draft' | 'published', htmlContent: string) => {
    if (!editor) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveState('saving');
    try {
      const payload = {
        title,
        content: toPlainText(htmlContent),
        contentJson: htmlContent,
        povCharacter: chapter?.povCharacter || '',
        workflowStatus: chapter?.workflowStatus || 'Draft'
      };
      const updatedUser = await api.saveChapter(currentUser.id, bookId, chapterId, payload, status);
      onUserUpdate(updatedUser);
      if (chapterId === 'new') {
        const created = updatedUser.writtenBooks?.find(b => b.id === bookId)?.chapters.find(c => c.title === title);
        if (created) setChapterId(created.id);
      }
      setSaveState('saved');
      if (status === 'published') window.location.hash = `/write/book/${bookId}/manage`;
    } catch {
      setSaveState('unsaved');
    }
  };

  const debouncedSave = (status: 'draft' | 'published', htmlContent: string) => {
    setSaveState('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => handleSave(status, htmlContent), 1500);
  };

  const wordCount = useMemo(() => toPlainText(editor?.getHTML() || '').split(/\s+/).filter(Boolean).length, [editor?.state]);

  if (!book || !editor) return <div className="p-8">Loading editor...</div>;

  const canvas = (
    <div className="flex flex-col h-screen bg-[#f7f6f3] dark:bg-dark-background">
      <header className="h-14 border-b bg-white/90 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => (window.location.hash = `/write/book/${bookId}/manage`)}><ArrowLeftIcon className="w-5 h-5" /></button>
          <input value={title} onChange={e => setTitle(e.target.value)} className="font-bold bg-transparent outline-none" placeholder="Chapter title" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsZenMode(v => !v)} className="px-3 py-1 rounded bg-gray-100">Zen</button>
          <button onClick={() => setIsScrapyardOpen(v => !v)} className="px-3 py-1 rounded bg-gray-100">Scrapyard</button>
          <button onClick={() => setIsPreviewOpen(v => !v)}><EyeIcon className="w-5 h-5" /></button>
          <button onClick={() => handleSave('published', editor.getHTML())} className="px-3 py-1 rounded bg-accent text-white">Publish</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-3xl min-h-full bg-white rounded-2xl p-8 shadow-sm">
            <EditorContent editor={editor} className="prose prose-lg max-w-none focus:outline-none" />
          </div>
        </main>
        <aside className="w-80 border-l bg-white p-4 overflow-y-auto">
          <h3 className="font-bold mb-3">Story Bible</h3>
          {contextElement ? (
            <div className="border rounded-xl p-3">
              <p className="text-xs text-gray-500">{contextElement.category}</p>
              <p className="font-semibold">{contextElement.name}</p>
              <p className="text-sm mt-1">{contextElement.description}</p>
            </div>
          ) : <p className="text-sm text-gray-500">Select a name to load context.</p>}
          <div className="mt-4 space-y-2">
            {storyElements.map(el => <div key={el.id} className="text-sm border rounded px-2 py-1">{el.name}</div>)}
          </div>
        </aside>
      </div>

      <footer className="h-8 text-xs text-center text-gray-500">{wordCount} words · {saveState}</footer>

      <AnimatePresence>
        {isScrapyardOpen && (
          <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-4 max-h-52 overflow-y-auto">
            <p className="font-semibold mb-2">Scrapyard</p>
            <div className="flex flex-wrap gap-2">
              {scrapyard.map((s, i) => (
                <span key={i} draggable onDragStart={e => e.dataTransfer.setData('text/plain', s)} className="px-2 py-1 bg-gray-100 rounded text-sm cursor-grab">{s}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isPreviewOpen && <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setIsPreviewOpen(false)} />}
    </div>
  );

  return (
    <>
      {canvas}
      <AnimatePresence>
        {isZenMode && (
          <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {canvas}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
