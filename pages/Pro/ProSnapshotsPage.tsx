
import React, { useEffect, useState, useMemo } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { proDb } from '../../utils/proDb';
import type { ChapterSnapshot, SceneSnapshot } from '../../types/pro';

// ═══════════════════════════════════════════════════════════════
//   Snapshot Versioning Page
// ═══════════════════════════════════════════════════════════════
export const ProSnapshotsPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, chapters, scenes } = useProStudio();
  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [compareSnap, setCompareSnap] = useState<ChapterSnapshot | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('');

  useEffect(() => {
    openProject(projectId).then(() =>
      proDb.snapshots.getByProject(projectId).then(snaps => {
        setSnapshots(snaps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      })
    );
  }, [projectId]);

  const chapterSnapshots = useMemo(() =>
    selectedChapter ? snapshots.filter(s => s.chapterId === selectedChapter) : snapshots,
    [snapshots, selectedChapter]
  );

  const handleCreateSnapshot = async (chapterId: string, label: string, notes: string) => {
    const chapterScenes = scenes
      .filter(s => s.chapterId === chapterId)
      .sort((a, b) => a.order - b.order);

    const sceneSnaps: SceneSnapshot[] = chapterScenes.map(s => ({
      sceneId: s.id,
      title: s.title,
      content: s.content,
      wordCount: s.wordCount,
      synopsis: s.synopsis,
      order: s.order,
    }));

    const snap = await proDb.snapshots.create({
      chapterId,
      projectId,
      label,
      sceneSnapshots: sceneSnaps,
      notes,
    });

    setSnapshots(prev => [snap, ...prev]);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this snapshot?')) return;
    await proDb.snapshots.delete(id);
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return <div className="pro-shell" style={{ alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'var(--pro-text-muted)' }}>Loading…</span></div>;

  return (
    <div className="pro-shell">
      <div className="pro-topbar">
        <a href={`#/pro/studio/${projectId}`} className="pro-topbar-logo" onClick={e => { e.preventDefault(); window.location.hash = `/pro/studio/${projectId}`; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          <span className="pro-topbar-logo-text">Back to Studio</span>
        </a>
        <div className="pro-topbar-breadcrumb">
          <span className="pro-topbar-breadcrumb-item">{activeProject?.title}</span>
          <span className="pro-topbar-breadcrumb-sep">›</span>
          <span className="pro-topbar-breadcrumb-item active">Snapshots</span>
        </div>
        <div className="pro-topbar-actions">
          <select className="pro-inspector-select" style={{ width: 'auto', height: 32 }}
            value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
            <option value="">All Chapters</option>
            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
          </select>
          <button className="pro-btn pro-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M12 2v20M2 12h20" /></svg>
            Take Snapshot
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px', background: 'var(--pro-bg)' }}>
        {chapterSnapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--pro-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <h3 style={{ color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif", margin: '0 0 8px' }}>Atomic Snapshots</h3>
            <p style={{ fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
              Capture the exact state of any chapter at a point in time. Compare snapshots against current drafts to track revisions, word count changes, and scene evolution.
            </p>
            <button className="pro-btn pro-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>Take First Snapshot</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {chapterSnapshots.map(snap => {
              const chapter = chapters.find(c => c.id === snap.chapterId);
              const currentScenes = scenes.filter(s => s.chapterId === snap.chapterId);
              const currentWc = currentScenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);
              const diff = currentWc - snap.totalWordCount;
              const created = new Date(snap.createdAt);

              return (
                <div key={snap.id} style={{
                  background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
                  borderRadius: 12, padding: '18px 22px', transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--pro-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--pro-border-subtle)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>📸</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>{snap.label}</span>
                        <span style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 100,
                          background: 'var(--pro-surface-3)', color: 'var(--pro-accent)',
                          fontWeight: 700, textTransform: 'uppercase',
                        }}>
                          {chapter?.title || 'Unknown Chapter'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--pro-text-muted)', display: 'flex', gap: 14 }}>
                        <span>{created.toLocaleDateString()} at {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{snap.sceneSnapshots.length} scene{snap.sceneSnapshots.length !== 1 ? 's' : ''}</span>
                        <span>{snap.totalWordCount.toLocaleString()} words</span>
                        <span style={{ color: diff > 0 ? 'var(--pro-success)' : diff < 0 ? 'var(--pro-danger)' : 'var(--pro-text-muted)', fontWeight: 700 }}>
                          {diff > 0 ? `+${diff}` : diff} since snapshot
                        </span>
                      </div>
                      {snap.notes && <div style={{ fontSize: 12, color: 'var(--pro-text-body)', marginTop: 6, fontStyle: 'italic' }}>"{snap.notes}"</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="pro-btn pro-btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px' }}
                        onClick={() => setCompareSnap(snap)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 20V10M6 20V4M12 20V16" /></svg>
                        Compare
                      </button>
                      <button className="pro-binder-icon-btn" onClick={() => handleDelete(snap.id)} title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Scene summary strip */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    {snap.sceneSnapshots.map((ss, i) => (
                      <div key={ss.sceneId} style={{
                        fontSize: 9, padding: '3px 8px', borderRadius: 6,
                        background: 'var(--pro-surface-3)', color: 'var(--pro-text-muted)',
                        border: '1px solid var(--pro-border-subtle)',
                      }}>
                        {ss.title} ({ss.wordCount}w)
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Snapshot Modal */}
      {showCreate && <CreateSnapshotModal chapters={chapters} onClose={() => setShowCreate(false)} onCreate={handleCreateSnapshot} />}

      {/* Compare Modal */}
      {compareSnap && (
        <CompareModal
          snapshot={compareSnap}
          currentScenes={scenes.filter(s => s.chapterId === compareSnap.chapterId).sort((a, b) => a.order - b.order)}
          chapter={chapters.find(c => c.id === compareSnap.chapterId)}
          onClose={() => setCompareSnap(null)}
        />
      )}
    </div>
  );
};

// ─── Create Snapshot Modal ────────────────────────────────────
const CreateSnapshotModal: React.FC<{
  chapters: { id: string; title: string }[];
  onClose: () => void;
  onCreate: (chapterId: string, label: string, notes: string) => void;
}> = ({ chapters, onClose, onCreate }) => {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [label, setLabel] = useState(`Snapshot ${new Date().toLocaleDateString()}`);
  const [notes, setNotes] = useState('');

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 420 }}>
        <h2 className="pro-modal-title">📸 Take Snapshot</h2>
        <p className="pro-modal-sub">Capture the current state of a chapter for future comparison</p>
        <div className="pro-relation-modal-field">
          <label>Chapter</label>
          <select className="pro-form-input" value={chapterId} onChange={e => setChapterId(e.target.value)}>
            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
          </select>
        </div>
        <div className="pro-relation-modal-field">
          <label>Snapshot Label</label>
          <input className="pro-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. First Draft Complete" />
        </div>
        <div className="pro-relation-modal-field">
          <label>Notes (optional)</label>
          <textarea className="pro-form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Why are you taking this snapshot?" style={{ resize: 'vertical' }} />
        </div>
        <div className="pro-modal-footer">
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={() => onCreate(chapterId, label, notes)} disabled={!chapterId || !label.trim()}>
            Take Snapshot
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Compare Modal — Diff View ───────────────────────────────
const CompareModal: React.FC<{
  snapshot: ChapterSnapshot;
  currentScenes: { id: string; title: string; content: string; wordCount: number }[];
  chapter: { title: string } | undefined;
  onClose: () => void;
}> = ({ snapshot, currentScenes, chapter, onClose }) => {
  const [selectedScene, setSelectedScene] = useState(snapshot.sceneSnapshots[0]?.sceneId ?? '');

  const snapScene = snapshot.sceneSnapshots.find(s => s.sceneId === selectedScene);
  const currentScene = currentScenes.find(s => s.id === selectedScene);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const snapText = snapScene ? stripHtml(snapScene.content) : '';
  const currentText = currentScene ? stripHtml(currentScene.content) : '';

  // Simple line-by-line diff
  const snapLines = snapText.split(/\n+/).filter(Boolean);
  const currentLines = currentText.split(/\n+/).filter(Boolean);
  const maxLen = Math.max(snapLines.length, currentLines.length);

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
          <div>
            <h2 className="pro-modal-title">Compare: {snapshot.label}</h2>
            <p className="pro-modal-sub">{chapter?.title} — Snapshot vs Current Draft</p>
          </div>
          <button className="pro-binder-icon-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Scene tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
          {snapshot.sceneSnapshots.map(ss => {
            const cur = currentScenes.find(s => s.id === ss.sceneId);
            const wcDiff = cur ? cur.wordCount - ss.wordCount : 0;
            return (
              <button key={ss.sceneId} onClick={() => setSelectedScene(ss.sceneId)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: selectedScene === ss.sceneId ? 'var(--pro-accent)' : 'var(--pro-surface-3)',
                  color: selectedScene === ss.sceneId ? 'white' : 'var(--pro-text-muted)',
                  border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>
                {ss.title}
                {wcDiff !== 0 && <span style={{ marginLeft: 4, color: wcDiff > 0 ? '#4CAF50' : '#D32F2F', fontSize: 9 }}>({wcDiff > 0 ? '+' : ''}{wcDiff})</span>}
              </button>
            );
          })}
        </div>

        {/* Side-by-side diff */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--pro-text-muted)', padding: '6px 0', borderBottom: '1px solid var(--pro-border-subtle)', marginBottom: 8,
            }}>
              📸 Snapshot ({snapScene?.wordCount || 0} words)
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontSize: 13, lineHeight: 1.8, color: 'var(--pro-text-body)', fontFamily: "'Literata', serif", padding: '0 4px' }}>
              {snapLines.map((line, i) => (
                <p key={i} style={{
                  margin: '0 0 6px', padding: '2px 4px', borderRadius: 3,
                  background: currentLines[i] !== line ? 'rgba(211,47,47,0.08)' : 'transparent',
                }}>
                  {line}
                </p>
              ))}
              {snapLines.length === 0 && <span style={{ color: 'var(--pro-text-muted)', fontStyle: 'italic' }}>Empty at time of snapshot</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--pro-accent)', padding: '6px 0', borderBottom: '1px solid var(--pro-border-subtle)', marginBottom: 8,
            }}>
              ✏️ Current Draft ({currentScene?.wordCount || 0} words)
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontSize: 13, lineHeight: 1.8, color: 'var(--pro-text-body)', fontFamily: "'Literata', serif", padding: '0 4px' }}>
              {currentLines.map((line, i) => (
                <p key={i} style={{
                  margin: '0 0 6px', padding: '2px 4px', borderRadius: 3,
                  background: snapLines[i] !== line ? 'rgba(76,175,80,0.08)' : 'transparent',
                }}>
                  {line}
                </p>
              ))}
              {currentLines.length === 0 && <span style={{ color: 'var(--pro-text-muted)', fontStyle: 'italic' }}>No content yet</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
