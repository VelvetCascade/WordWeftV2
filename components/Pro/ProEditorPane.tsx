
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProScene } from '../../types/pro';

// ─── TipTap imports  ──────────────────────────────────────────
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';

type ViewMode = 'scene' | 'chapter' | 'corkboard';

// ─── Toolbar button ───────────────────────────────────────────
const ToolbarBtn: React.FC<{
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ active, onClick, title, children, disabled }) => (
  <button
    type="button"
    className={`rte-toolbar-btn${active ? ' rte-toolbar-btn-active' : ''}`}
    onClick={onClick}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
);

// ─── Status helpers ───────────────────────────────────────────
const STATUS_LABELS: Record<ProScene['status'], string> = {
  empty: 'Empty', outline: 'Outline', draft: 'Draft', revised: 'Revised', final: 'Final'
};
const STATUS_CYCLE: ProScene['status'][] = ['empty', 'outline', 'draft', 'revised', 'final'];

const StatusPill: React.FC<{ scene: ProScene; onUpdate: (s: ProScene['status']) => void }> = ({ scene, onUpdate }) => {
  const next = () => {
    const idx = STATUS_CYCLE.indexOf(scene.status);
    onUpdate(STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
  };
  return (
    <button className={`pro-editor-status-pill pro-pill-${scene.status}`} onClick={next} title="Click to advance status">
      {STATUS_LABELS[scene.status]}
    </button>
  );
};

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ═══════════════════════════════════════════════════════════════
//   Corkboard View — Scene Index Cards
// ═══════════════════════════════════════════════════════════════
const CorkboardView: React.FC<{ chapterId: string }> = ({ chapterId }) => {
  const { scenes, chapters, setActiveScene, createScene, updateScene } = useProStudio();
  const chapter = chapters.find(c => c.id === chapterId);
  const chapterScenes = useMemo(() =>
    scenes.filter(s => s.chapterId === chapterId).sort((a, b) => a.order - b.order),
    [scenes, chapterId]
  );
  const totalWc = chapterScenes.reduce((sum, s) => sum + (s.wordCount || 0), 0);

  return (
    <div className="pro-corkboard">
      <div className="pro-corkboard-header">
        <div>
          <div className="pro-corkboard-title">{chapter?.title ?? 'Chapter'}</div>
          <div style={{ fontSize: 11, color: 'var(--pro-text-muted)', marginTop: 2 }}>
            {chapterScenes.length} scene{chapterScenes.length !== 1 ? 's' : ''} · {totalWc.toLocaleString()} words
          </div>
        </div>
      </div>
      <div className="pro-corkboard-grid">
        {chapterScenes.map((sc, i) => (
          <div
            key={sc.id}
            className="pro-corkboard-card"
            data-status={sc.status}
            onClick={() => setActiveScene(sc.id)}
          >
            <div className="pro-corkboard-card-title">{sc.title}</div>
            <div className="pro-corkboard-card-synopsis">
              {sc.synopsis || (sc.content ? sc.content.replace(/<[^>]*>/g, '').slice(0, 120) : 'No content yet…')}
            </div>
            <div className="pro-corkboard-card-footer">
              <span className="pro-corkboard-card-wc">{sc.wordCount.toLocaleString()} w</span>
              <span className="pro-corkboard-card-status" data-status={sc.status}>
                {STATUS_LABELS[sc.status]}
              </span>
            </div>
          </div>
        ))}
        <div
          className="pro-corkboard-add-card"
          onClick={() => chapter && createScene({ chapterId, volumeId: chapter.volumeId, projectId: chapter.projectId })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Scene
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Chapter Preview — Compiled Manuscript
// ═══════════════════════════════════════════════════════════════
const ChapterPreview: React.FC<{ chapterId: string }> = ({ chapterId }) => {
  const { scenes, chapters } = useProStudio();
  const chapter = chapters.find(c => c.id === chapterId);
  const chapterScenes = useMemo(() =>
    scenes.filter(s => s.chapterId === chapterId).sort((a, b) => a.order - b.order),
    [scenes, chapterId]
  );
  const totalWc = chapterScenes.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const [copied, setCopied] = useState(false);

  const compiledHtml = useMemo(() => {
    return chapterScenes.map(s => s.content || '').filter(Boolean).join('\n<hr/>\n');
  }, [chapterScenes]);

  const handleExport = () => {
    const text = chapterScenes.map(s => s.content || '').join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="pro-chapter-preview">
      <div className="pro-chapter-preview-header">
        <h1 className="pro-chapter-preview-title">{chapter?.title ?? 'Chapter'}</h1>
        <div className="pro-chapter-preview-meta">
          <span>{chapterScenes.length} scene{chapterScenes.length !== 1 ? 's' : ''}</span>
          <span>{totalWc.toLocaleString()} words</span>
          <button className="pro-chapter-preview-export" onClick={handleExport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy Chapter'}
          </button>
        </div>
      </div>

      {chapterScenes.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--pro-text-muted)', fontSize: 14, padding: '60px 0' }}>
          No scenes in this chapter yet. Add scenes to build your manuscript.
        </div>
      ) : (
        chapterScenes.map((sc, i) => (
          <div key={sc.id}>
            {i > 0 && (
              <div className="pro-chapter-preview-scene-divider">
                <span className="scene-number">{i + 1}</span>
                {sc.title}
              </div>
            )}
            {i === 0 && chapterScenes.length > 1 && (
              <div style={{ fontSize: 10, color: 'var(--pro-text-muted)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Scene 1 — {sc.title}
              </div>
            )}
            <div
              className="pro-chapter-preview-body"
              dangerouslySetInnerHTML={{ __html: sc.content || '<p style="color:var(--pro-text-muted);font-style:italic;">Empty scene</p>' }}
            />
          </div>
        ))
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Scene Editor — TipTap RTE
// ═══════════════════════════════════════════════════════════════
const SceneEditor: React.FC = () => {
  const { activeSceneId, scenes, updateScene, activeProject } = useProStudio();
  const scene = scenes.find(s => s.id === activeSceneId) ?? null;
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localTitle, setLocalTitle] = useState(scene?.title ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => { setLocalTitle(scene?.title ?? ''); }, [scene?.id]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin your scene… let the words flow.' }),
      CharacterCount,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
    ],
    content: scene ? (scene.content || '') : '',
    editorProps: {
      attributes: { class: 'rte-content pro-manuscript-editor', spellcheck: 'true' },
    },
    onUpdate: ({ editor }) => {
      if (!scene) return;
      const html = editor.getHTML();
      const text = editor.getText();
      const wc = countWords(text);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        setIsSaving(true);
        await updateScene(scene.id, {
          content: html,
          wordCount: wc,
          status: wc > 0 && scene.status === 'empty' ? 'draft' : scene.status,
        });
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 2000);
    },
  }, [scene?.id]);

  useEffect(() => {
    if (!editor || !scene) return;
    const current = editor.getHTML();
    if (current !== (scene.content || '')) {
      editor.commands.setContent(scene.content || '', { emitUpdate: false });
    }
  }, [scene?.id, editor]);

  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  const handleTitleBlur = useCallback(() => {
    if (scene && localTitle.trim() && localTitle !== scene.title) {
      updateScene(scene.id, { title: localTitle.trim() });
    }
  }, [scene, localTitle, updateScene]);

  const handleStatusUpdate = useCallback((status: ProScene['status']) => {
    if (scene) updateScene(scene.id, { status });
  }, [scene, updateScene]);

  const wc = editor?.storage?.characterCount?.words?.() ?? scene?.wordCount ?? 0;

  if (!scene) {
    return (
      <div className="pro-editor-pane">
        <div className="pro-editor-empty-state">
          <div className="pro-editor-empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <h3>No Scene Selected</h3>
          <p>Select a scene from the Binder to begin writing, or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Scene Title + Status Bar */}
      <div className="pro-editor-topbar" style={{ borderBottom: '1px solid var(--pro-border-subtle)' }}>
        <input
          className="pro-editor-scene-title-input"
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="Scene title…"
        />
        <div className="pro-editor-meta">
          <StatusPill scene={scene} onUpdate={handleStatusUpdate} />
          <span>{wc.toLocaleString()} words</span>
          {isSaving && (
            <span className="pro-save-indicator saving">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Saving…
            </span>
          )}
          {!isSaving && lastSaved && (
            <span className="pro-save-indicator saved">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              Saved {lastSaved}
            </span>
          )}
        </div>
      </div>

      {/* Formatting Toolbar */}
      {editor && (
        <div className="pro-editor-toolbar-row">
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><text x="5" y="17" fontFamily="serif" fontWeight="bold" fontSize="16" fill="currentColor" stroke="none">B</text></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <svg viewBox="0 0 24 24" width="14" height="14"><text x="7" y="17" fontFamily="serif" fontStyle="italic" fontSize="16" fill="currentColor">I</text></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M6 3v7a6 6 0 0 0 12 0V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><path d="M16 6C16 6 14.5 4 12 4s-5 1.5-5 4c0 2 1.5 3 3 3.5" /><path d="M8 18c0 0 1.5 2 4 2s5-1.5 5-4" /></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2L2 7l10 5 10-5-10-5" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
          </ToolbarBtn>
          <div className="rte-toolbar-divider" />
          <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolbarBtn>
          <div className="rte-toolbar-divider" />
          <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1</text><text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2</text><text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3</text></svg>
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Block Quote">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Scene Break">— —</ToolbarBtn>
          <div className="rte-toolbar-divider" />
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
          </ToolbarBtn>
        </div>
      )}

      {/* Manuscript Area */}
      <div className="pro-editor-scroll">
        <div className="pro-manuscript" style={{
          fontFamily: activeProject?.settings?.font === 'Inter' ? "'Inter', sans-serif" :
                      activeProject?.settings?.font === 'JetBrains Mono' ? "'JetBrains Mono', monospace" :
                      "'Literata', serif",
          fontSize: activeProject?.settings?.fontSize ?? 18,
          lineHeight: activeProject?.settings?.lineHeight ?? 1.8,
          paddingLeft: activeProject?.settings?.sidePadding ?? 80,
          paddingRight: activeProject?.settings?.sidePadding ?? 80,
        }}>
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Main Editor Pane — Three View Modes
// ═══════════════════════════════════════════════════════════════
export const ProEditorPane: React.FC = () => {
  const { activeSceneId, activeChapterId, chapters, scenes, setActiveChapter, setActiveScene } = useProStudio();
  const [viewMode, setViewMode] = useState<ViewMode>('scene');

  // Auto-switch to scene mode when a scene is selected in the binder
  useEffect(() => {
    if (activeSceneId && viewMode !== 'scene') {
      // Don't auto-switch away from chapter/corkboard — let user decide
    }
  }, [activeSceneId]);

  // When switching to scene mode and no scene selected, stay in scene mode (empty state)
  const effectiveChapterId = activeChapterId ?? (
    activeSceneId ? scenes.find(s => s.id === activeSceneId)?.chapterId ?? null : null
  );

  // View toggle icons
  const WriteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  const ChapterIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
  const BoardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  return (
    <div className="pro-editor-pane">
      {/* View Mode Toggle Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', background: 'var(--pro-surface)',
        borderBottom: '1px solid var(--pro-border-subtle)',
      }}>
        <div className="pro-editor-view-toggles">
          <button className={`pro-editor-view-btn${viewMode === 'scene' ? ' active' : ''}`} onClick={() => setViewMode('scene')}>
            <WriteIcon /> Write
          </button>
          <button className={`pro-editor-view-btn${viewMode === 'chapter' ? ' active' : ''}`} onClick={() => setViewMode('chapter')}>
            <ChapterIcon /> Chapter
          </button>
          <button className={`pro-editor-view-btn${viewMode === 'corkboard' ? ' active' : ''}`} onClick={() => setViewMode('corkboard')}>
            <BoardIcon /> Corkboard
          </button>
        </div>

        {/* Chapter selector for chapter/corkboard modes */}
        {(viewMode === 'chapter' || viewMode === 'corkboard') && chapters.length > 0 && (
          <div className="pro-chapter-selector">
            <span style={{ fontSize: 10, color: 'var(--pro-text-muted)', fontWeight: 600 }}>Viewing:</span>
            <select
              value={effectiveChapterId ?? ''}
              onChange={e => {
                const chId = e.target.value;
                if (!chId) return;
                setActiveChapter(chId);
                // Also select first scene of that chapter for seamless navigation
                const chScenes = scenes.filter(s => s.chapterId === chId).sort((a, b) => a.order - b.order);
                if (chScenes.length > 0) {
                  setActiveScene(chScenes[0].id);
                }
              }}
            >
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* View Content */}
      {viewMode === 'scene' && <SceneEditor />}
      {viewMode === 'chapter' && (
        effectiveChapterId
          ? <ChapterPreview chapterId={effectiveChapterId} />
          : <div className="pro-editor-empty-state">
              <div className="pro-editor-empty-state-icon"><ChapterIcon /></div>
              <h3>No Chapter Selected</h3>
              <p>Select a chapter or scene from the Binder to preview the compiled chapter.</p>
            </div>
      )}
      {viewMode === 'corkboard' && (
        effectiveChapterId
          ? <CorkboardView chapterId={effectiveChapterId} />
          : <div className="pro-editor-empty-state">
              <div className="pro-editor-empty-state-icon"><BoardIcon /></div>
              <h3>No Chapter Selected</h3>
              <p>Select a chapter from the Binder to view its scene index cards.</p>
            </div>
      )}
    </div>
  );
};
