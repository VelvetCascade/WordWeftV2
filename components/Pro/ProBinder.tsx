
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { PlusIcon, BookOpenIcon, TrashIcon, PencilSquareIcon, ChevronRightIcon, DocumentTextIcon, FilmIcon } from '../icons/Icons';
import type { ProChapter, ProVolume, ProScene, ChapterColor } from '../../types/pro';

// ─── Color Palette for chapter labels ─────────────────────────
const CHAPTER_COLORS: { value: ChapterColor; hex: string; label: string }[] = [
  { value: null,     hex: 'transparent', label: 'None'    },
  { value: 'red',    hex: '#D32F2F',     label: 'Red'     },
  { value: 'orange', hex: '#E65100',     label: 'Orange'  },
  { value: 'amber',  hex: '#FF8F00',     label: 'Amber'   },
  { value: 'green',  hex: '#2E7D32',     label: 'Green'   },
  { value: 'teal',   hex: '#00695C',     label: 'Teal'    },
  { value: 'blue',   hex: '#1565C0',     label: 'Blue'    },
  { value: 'violet', hex: '#4527A0',     label: 'Violet'  },
  { value: 'pink',   hex: '#AD1457',     label: 'Pink'    },
  { value: 'brown',  hex: '#4E342E',     label: 'Brown'   },
];

const COLOR_HEX: Record<string, string> = Object.fromEntries(
  CHAPTER_COLORS.filter(c => c.value).map(c => [c.value as string, c.hex])
);

// ─── Status dot colors ────────────────────────────────────────
function statusDot(status: ProScene['status'] | ProChapter['status']): string {
  const map: Record<string, string> = {
    empty:   'var(--pro-text-muted)',
    outline: 'var(--pro-warning)',
    draft:   'var(--pro-accent)',
    revised: 'var(--pro-success)',
    final:   'var(--pro-accent-strong)',
  };
  return map[status] ?? 'var(--pro-text-muted)';
}

function fmtWc(n: number) {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

// ─── Context Menu ─────────────────────────────────────────────
interface CtxMenuProps {
  x: number; y: number;
  items: { label: string; icon?: React.ReactNode; action: () => void; danger?: boolean; sep?: boolean }[];
  onClose: () => void;
}

const ContextMenu: React.FC<CtxMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Adjust position if too close to right/bottom edge
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - rect.width - 8),
      y: Math.min(y, window.innerHeight - rect.height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  return (
    <div ref={ref} className="pro-context-menu" style={{ left: pos.x, top: pos.y }}>
      {items.map((item, i) =>
        item.sep ? <div key={i} className="pro-context-menu-sep" /> :
        <button
          key={i}
          className={`pro-context-menu-item${item.danger ? ' danger' : ''}`}
          onClick={() => { item.action(); onClose(); }}
        >
          {item.icon}
          {item.label}
        </button>
      )}
    </div>
  );
};

// ─── Inline Rename ────────────────────────────────────────────
const InlineRename: React.FC<{
  initial: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}> = ({ initial, onConfirm, onCancel }) => {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      className="pro-rename-input"
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); if (val.trim()) onConfirm(val.trim()); else onCancel(); }
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => { if (val.trim()) onConfirm(val.trim()); else onCancel(); }}
      onClick={e => e.stopPropagation()}
    />
  );
};

// ─── Scene Row ────────────────────────────────────────────────
const SceneRow: React.FC<{
  scene: ProScene;
  isActive: boolean;
  totalWc: number;
}> = ({ scene, isActive, totalWc }) => {
  const { setActiveScene, deleteScene, updateScene } = useProStudio();
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);

  return (
    <>
      <div className="pro-binder-scene">
        <div
          className={`pro-binder-scene-row${isActive ? ' active' : ''}`}
          onClick={() => setActiveScene(scene.id)}
          onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
        >
          <div className="pro-binder-scene-dot" style={{ background: statusDot(scene.status) }} />
          {renaming ? (
            <InlineRename
              initial={scene.title}
              onConfirm={v => { updateScene(scene.id, { title: v }); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="pro-binder-scene-label">{scene.title}</span>
          )}
          <span className="pro-binder-scene-wc">{fmtWc(scene.wordCount)}</span>
          <div className="pro-binder-scene-actions">
            <button className="pro-binder-icon-btn" onClick={e => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY }); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
            </button>
          </div>
        </div>
      </div>

      {ctx && (
        <ContextMenu
          x={ctx.x} y={ctx.y}
          onClose={() => setCtx(null)}
          items={[
            { label: 'Open Scene', icon: <PencilSquareIcon />, action: () => setActiveScene(scene.id) },
            { label: 'Rename', icon: <PencilSquareIcon />, action: () => setRenaming(true) },
            { sep: true, label: '', action: () => {} },
            { label: 'Set Status › Draft', action: () => updateScene(scene.id, { status: 'draft' }) },
            { label: 'Set Status › Revised', action: () => updateScene(scene.id, { status: 'revised' }) },
            { label: 'Set Status › Final', action: () => updateScene(scene.id, { status: 'final' }) },
            { sep: true, label: '', action: () => {} },
            { label: 'Delete Scene', icon: <TrashIcon />, danger: true, action: () => { if (window.confirm(`Delete "${scene.title}"?`)) deleteScene(scene.id); } },
          ]}
        />
      )}
    </>
  );
};

// ─── Chapter Row ──────────────────────────────────────────────
const ChapterRow: React.FC<{
  chapter: ProChapter;
  isActive: boolean;
  scenes: ProScene[];
  activeSceneId: string | null;
}> = ({ chapter, isActive, scenes, activeSceneId }) => {
  const { binderExpanded, toggleBinderNode, setActiveChapter, setActiveScene, createScene, deleteChapter, updateChapter } = useProStudio();
  const expanded = binderExpanded[chapter.id];
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const chapterWc = scenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);
  const colorHex = chapter.color ? COLOR_HEX[chapter.color] : undefined;

  return (
    <>
      <div className="pro-binder-chapter">
        <div
          className={`pro-binder-chapter-header${isActive ? ' active' : ''}`}
          onClick={() => { toggleBinderNode(chapter.id); setActiveChapter(chapter.id); }}
          onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
        >
          {colorHex && <div className="pro-binder-chapter-color" style={{ background: colorHex }} />}
          <ChevronRightIcon className={`pro-binder-volume-chevron${expanded ? ' expanded' : ''}`} />
          <DocumentTextIcon className="pro-binder-chapter-icon" />
          {renaming ? (
            <InlineRename
              initial={chapter.title}
              onConfirm={v => { updateChapter(chapter.id, { title: v }); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="pro-binder-chapter-label">{chapter.title}</span>
          )}
          <div className="pro-binder-chapter-status" style={{ background: statusDot(chapter.status) }} />
          <div className="pro-binder-chapter-actions">
            <button className="pro-binder-icon-btn" onClick={e => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY }); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
            </button>
          </div>
        </div>

        {/* Scenes */}
        {expanded && (
          <>
            {scenes.map(sc => (
              <SceneRow
                key={sc.id}
                scene={sc}
                isActive={activeSceneId === sc.id}
                totalWc={chapterWc}
              />
            ))}
            <button
              className="pro-binder-add-btn"
              style={{ marginLeft: 40 }}
              onClick={() => {
                if (!chapter.volumeId || !chapter.projectId) return;
                createScene({ chapterId: chapter.id, volumeId: chapter.volumeId, projectId: chapter.projectId });
              }}
            >
              <PlusIcon /> New Scene
            </button>
          </>
        )}
      </div>

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} items={[
          { label: 'Add Scene', icon: <FilmIcon />, action: () => createScene({ chapterId: chapter.id, volumeId: chapter.volumeId, projectId: chapter.projectId }) },
          { label: 'Rename', icon: <PencilSquareIcon />, action: () => setRenaming(true) },
          { sep: true, label: '', action: () => {} },
          ...CHAPTER_COLORS.filter(c => c.value).map(c => ({
            label: `Label: ${c.label}`,
            action: () => updateChapter(chapter.id, { color: c.value }),
          })),
          { sep: true, label: '', action: () => {} },
          { label: 'Delete Chapter', icon: <TrashIcon />, danger: true, action: () => { if (window.confirm(`Delete "${chapter.title}" and all its scenes?`)) deleteChapter(chapter.id); } },
        ]} />
      )}
    </>
  );
};

// ─── Volume Row ───────────────────────────────────────────────
const VolumeRow: React.FC<{
  volume: ProVolume;
  chapters: ProChapter[];
  scenes: ProScene[];
  activeChapterId: string | null;
  activeSceneId: string | null;
}> = ({ volume, chapters, scenes, activeChapterId, activeSceneId }) => {
  const { binderExpanded, toggleBinderNode, createChapter, deleteVolume, updateVolume, activeVolumeId, setActiveVolume } = useProStudio();
  const expanded = binderExpanded[volume.id];
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const volumeWc = scenes.filter(s => chapters.some(c => c.id === s.chapterId)).reduce((sum, s) => sum + (s.wordCount || 0), 0);

  return (
    <>
      <div className="pro-binder-volume">
        <div
          className={`pro-binder-volume-header${activeVolumeId === volume.id ? ' active' : ''}`}
          onClick={() => { toggleBinderNode(volume.id); setActiveVolume(volume.id); }}
          onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
        >
          <ChevronRightIcon className={`pro-binder-volume-chevron${expanded ? ' expanded' : ''}`} />
          <BookOpenIcon className="pro-binder-volume-icon" />
          {renaming ? (
            <InlineRename
              initial={volume.title}
              onConfirm={v => { updateVolume(volume.id, { title: v }); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="pro-binder-volume-label">{volume.title}</span>
          )}
          <span className="pro-binder-volume-wc">{fmtWc(volumeWc)}</span>
          <div className="pro-binder-volume-actions">
            <button className="pro-binder-icon-btn" title="Add Chapter" onClick={e => { e.stopPropagation(); createChapter({ volumeId: volume.id, projectId: volume.projectId }); }}>
              <PlusIcon />
            </button>
          </div>
        </div>

        {expanded && (
          <>
            {chapters.map(ch => (
              <ChapterRow
                key={ch.id}
                chapter={ch}
                isActive={activeChapterId === ch.id}
                scenes={scenes.filter(s => s.chapterId === ch.id)}
                activeSceneId={activeSceneId}
              />
            ))}
            <button
              className="pro-binder-add-btn"
              style={{ marginLeft: 22 }}
              onClick={() => createChapter({ volumeId: volume.id, projectId: volume.projectId })}
            >
              <PlusIcon /> New Chapter
            </button>
          </>
        )}
      </div>

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} items={[
          { label: 'Add Chapter', icon: <DocumentTextIcon />, action: () => createChapter({ volumeId: volume.id, projectId: volume.projectId }) },
          { label: 'Rename Volume', icon: <PencilSquareIcon />, action: () => setRenaming(true) },
          { sep: true, label: '', action: () => {} },
          { label: 'Delete Volume', icon: <TrashIcon />, danger: true, action: () => { if (window.confirm(`Delete "${volume.title}" and all its content?`)) deleteVolume(volume.id); } },
        ]} />
      )}
    </>
  );
};

// ─── ProBinder ────────────────────────────────────────────────
export const ProBinder: React.FC = () => {
  const {
    activeProject, volumes, chapters, scenes,
    activeChapterId, activeSceneId, binderCollapsed,
    toggleBinder, createVolume,
  } = useProStudio();

  if (!activeProject) return null;

  const totalWc = scenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);

  return (
    <div className={`pro-binder${binderCollapsed ? ' collapsed' : ''}`}>
      <div className="pro-binder-header">
        <span className="pro-binder-title">Binder</span>
        <div className="pro-binder-header-actions">
          <button className="pro-binder-icon-btn" title="Add Volume" onClick={() => createVolume({ projectId: activeProject.id })}>
            <PlusIcon />
          </button>
          <button className="pro-binder-icon-btn" title="Collapse Binder" onClick={toggleBinder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 19l-7-7 7-7" /><path d="M19 19l-7-7 7-7" /></svg>
          </button>
        </div>
      </div>

      <div className="pro-binder-scroll">
        {/* Project word count summary */}
        <div style={{ padding: '8px 14px 4px', fontSize: 10, color: 'var(--pro-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{activeProject.title}</span>
          <span>{fmtWc(totalWc)} words</span>
        </div>

        <div className="pro-binder-section-label">Manuscript</div>

        {volumes.map(vol => {
          const volChapters = chapters.filter(c => c.volumeId === vol.id);
          return (
            <VolumeRow
              key={vol.id}
              volume={vol}
              chapters={volChapters}
              scenes={scenes}
              activeChapterId={activeChapterId}
              activeSceneId={activeSceneId}
            />
          );
        })}

        {volumes.length === 0 && (
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <button className="pro-binder-add-btn" style={{ justifyContent: 'center', width: '100%' }}
              onClick={() => createVolume({ projectId: activeProject.id })}>
              <PlusIcon /> Add First Volume
            </button>
          </div>
        )}

        <div className="pro-binder-section-label" style={{ marginTop: 16 }}>Research</div>
        <button className="pro-binder-add-btn" onClick={() => window.location.hash = `/pro/characters/${activeProject.id}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          Characters
        </button>
        <button className="pro-binder-add-btn" onClick={() => window.location.hash = `/pro/world/${activeProject.id}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          World Compendium
        </button>
        <button className="pro-binder-add-btn" onClick={() => window.location.hash = `/pro/maps/${activeProject.id}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
          Maps
        </button>
      </div>
    </div>
  );
};
