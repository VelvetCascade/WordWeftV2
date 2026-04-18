
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { proDb } from '../../utils/proDb';
import type { TimelineEvent, ChapterSnapshot, SceneSnapshot } from '../../types/pro';

const CATEGORIES: { value: TimelineEvent['category']; label: string; color: string; icon: string }[] = [
  { value: 'political',  label: 'Political',  color: '#2196F3', icon: '🏛️' },
  { value: 'personal',   label: 'Personal',   color: '#FFA000', icon: '💫' },
  { value: 'battle',     label: 'Battle',     color: '#D32F2F', icon: '⚔️' },
  { value: 'discovery',  label: 'Discovery',  color: '#7E57C2', icon: '🔍' },
  { value: 'natural',    label: 'Natural',    color: '#4CAF50', icon: '🌊' },
  { value: 'cultural',   label: 'Cultural',   color: '#E91E63', icon: '🎭' },
  { value: 'custom',     label: 'Other',      color: '#8D6E63', icon: '📌' },
];

function catInfo(cat: string) { return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[6]; }

// ═══════════════════════════════════════════════════════════════
//   Timeline View Page
// ═══════════════════════════════════════════════════════════════
export const ProTimelinePage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, characters, scenes, chapters } = useProStudio();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    openProject(projectId).then(() =>
      proDb.timeline.getByProject(projectId).then(evts => {
        setEvents(evts.sort((a, b) => a.sortOrder - b.sortOrder));
        setLoading(false);
      })
    );
  }, [projectId]);

  const filtered = useMemo(() =>
    filterCat === 'all' ? events : events.filter(e => e.category === filterCat),
    [events, filterCat]
  );

  // Group by era
  const eras = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    filtered.forEach(e => {
      const era = e.era || 'Unclassified';
      (map[era] = map[era] || []).push(e);
    });
    return Object.entries(map);
  }, [filtered]);

  const handleCreate = async () => {
    const ev = await proDb.timeline.create({
      projectId,
      title: 'New Event',
      category: 'personal',
      sortOrder: events.length,
    });
    setEvents(prev => [...prev, ev]);
    setEditingEvent(ev);
    setShowAdd(true);
  };

  const handleSave = async (ev: TimelineEvent) => {
    const updated = await proDb.timeline.update(ev.id, ev);
    if (updated) setEvents(prev => prev.map(e => e.id === ev.id ? updated : e));
    setShowAdd(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this event?')) {
      await proDb.timeline.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    }
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
          <span className="pro-topbar-breadcrumb-item active">Timeline</span>
        </div>
        <div className="pro-topbar-actions">
          <button className="pro-btn pro-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={handleCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Event
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Category filter sidebar */}
        <div style={{
          width: 180, borderRight: '1px solid var(--pro-border-subtle)',
          background: 'var(--pro-surface)', padding: '12px 8px', flexShrink: 0,
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pro-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
            Filter by Category
          </div>
          <button className={`pro-world-type-btn${filterCat === 'all' ? ' active' : ''}`} onClick={() => setFilterCat('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', background: filterCat === 'all' ? 'var(--pro-accent-hover)' : 'none', border: 'none', borderRadius: 6, color: 'var(--pro-text-body)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'left', fontFamily: "'Inter', sans-serif" }}>
            All ({events.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = events.filter(e => e.category === cat.value).length;
            return (
              <button key={cat.value} onClick={() => setFilterCat(cat.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px',
                  background: filterCat === cat.value ? 'var(--pro-accent-hover)' : 'none', border: 'none', borderRadius: 6,
                  color: filterCat === cat.value ? 'var(--pro-text-rich)' : 'var(--pro-text-muted)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'left', fontFamily: "'Inter', sans-serif",
                  marginTop: 2,
                }}>
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                {cat.label}
                {count > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: cat.color }}>{count}</span>}
              </button>
            );
          })}

          <div style={{ marginTop: 24, padding: '0 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pro-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Stats
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--pro-accent)', fontFamily: "'Literata', serif" }}>{events.length}</div>
            <div style={{ fontSize: 10, color: 'var(--pro-text-muted)' }}>Total Events</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--pro-text-body)', fontFamily: "'Literata', serif", marginTop: 8 }}>{eras.length}</div>
            <div style={{ fontSize: 10, color: 'var(--pro-text-muted)' }}>Eras</div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: 'var(--pro-bg)' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--pro-text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <h3 style={{ color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif", margin: '0 0 8px' }}>Story Timeline</h3>
              <p style={{ fontSize: 13 }}>Plot your world's history, battles, and personal milestones on a visual timeline.</p>
              <button className="pro-btn pro-btn-primary" style={{ marginTop: 16 }} onClick={handleCreate}>+ Add First Event</button>
            </div>
          ) : (
            eras.map(([era, eraEvents]) => (
              <div key={era} style={{ marginBottom: 40 }}>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif",
                  marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--pro-border-subtle)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 100, background: 'var(--pro-surface-3)', color: 'var(--pro-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{era}</span>
                </div>
                <div style={{ position: 'relative', paddingLeft: 32 }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: 'var(--pro-border-subtle)' }} />

                  {eraEvents.map((ev, i) => {
                    const cat = catInfo(ev.category);
                    const linkedChars = characters.filter(c => ev.linkedCharacterIds?.includes(c.id));
                    return (
                      <div key={ev.id} style={{ marginBottom: 16, position: 'relative' }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: -27, top: 6, width: 14, height: 14,
                          borderRadius: '50%', background: ev.color || cat.color,
                          border: '2px solid var(--pro-bg)', zIndex: 2,
                        }} />

                        {/* Card */}
                        <div style={{
                          background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
                          borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                          transition: 'border-color 0.15s',
                        }}
                          onClick={() => { setEditingEvent(ev); setShowAdd(true); }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = cat.color)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--pro-border-subtle)')}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pro-text-rich)' }}>{ev.title}</div>
                                <div style={{ fontSize: 10, color: ev.color || cat.color, fontWeight: 700 }}>{ev.worldDate || `#${i + 1}`}</div>
                              </div>
                              {ev.description && <div style={{ fontSize: 12, color: 'var(--pro-text-body)', marginTop: 4, lineHeight: 1.5 }}>{ev.description}</div>}

                              {linkedChars.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                  {linkedChars.map(c => (
                                    <span key={c.id} style={{
                                      fontSize: 10, padding: '2px 8px', borderRadius: 100,
                                      background: 'var(--pro-surface-3)', color: 'var(--pro-text-muted)',
                                      border: '1px solid var(--pro-border-subtle)',
                                    }}>👤 {c.name}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button style={{ background: 'none', border: 'none', color: 'var(--pro-text-muted)', cursor: 'pointer', fontSize: 11, padding: 2, flexShrink: 0 }}
                              onClick={e => { e.stopPropagation(); handleDelete(ev.id); }}>✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Editor Modal */}
      {showAdd && editingEvent && (
        <EventEditorModal
          event={editingEvent}
          characters={characters}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
};

// ─── Event Editor Modal ───────────────────────────────────────
const EventEditorModal: React.FC<{
  event: TimelineEvent;
  characters: { id: string; name: string }[];
  onSave: (ev: TimelineEvent) => void;
  onClose: () => void;
}> = ({ event, characters, onSave, onClose }) => {
  const [local, setLocal] = useState(event);

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 500 }}>
        <h2 className="pro-modal-title">Edit Event</h2>
        <div className="pro-relation-modal-field">
          <label>Title</label>
          <input className="pro-form-input" value={local.title} onChange={e => setLocal(l => ({ ...l, title: e.target.value }))} />
        </div>
        <div className="pro-relation-modal-field">
          <label>In-World Date</label>
          <input className="pro-form-input" value={local.worldDate} onChange={e => setLocal(l => ({ ...l, worldDate: e.target.value }))} placeholder="e.g. Year 312, 3rd Moon" />
        </div>
        <div className="pro-relation-modal-field">
          <label>Era / Age</label>
          <input className="pro-form-input" value={local.era ?? ''} onChange={e => setLocal(l => ({ ...l, era: e.target.value }))} placeholder="e.g. First Age" />
        </div>
        <div className="pro-relation-modal-field">
          <label>Category</label>
          <div className="pro-relation-nature-grid">
            {CATEGORIES.map(c => (
              <div key={c.value} className={`pro-relation-nature-chip${local.category === c.value ? ' selected' : ''}`} onClick={() => setLocal(l => ({ ...l, category: c.value }))}>
                <span style={{ fontSize: 14 }}>{c.icon}</span> {c.label}
              </div>
            ))}
          </div>
        </div>
        <div className="pro-relation-modal-field">
          <label>Description</label>
          <textarea className="pro-form-input" value={local.description ?? ''} onChange={e => setLocal(l => ({ ...l, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
        </div>
        <div className="pro-relation-modal-field">
          <label>Linked Characters</label>
          <select className="pro-form-input" value="" onChange={e => {
            if (!e.target.value || local.linkedCharacterIds?.includes(e.target.value)) return;
            setLocal(l => ({ ...l, linkedCharacterIds: [...(l.linkedCharacterIds || []), e.target.value] }));
          }}>
            <option value="">+ Add character</option>
            {characters.filter(c => !local.linkedCharacterIds?.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {(local.linkedCharacterIds || []).map(id => {
              const c = characters.find(ch => ch.id === id);
              return c ? (
                <span key={id} className="pro-linked-char-chip">
                  👤 {c.name}
                  <button className="pro-linked-char-remove" onClick={() => setLocal(l => ({ ...l, linkedCharacterIds: l.linkedCharacterIds?.filter(i => i !== id) }))}>✕</button>
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="pro-modal-footer">
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={() => onSave(local)}>Save Event</button>
        </div>
      </div>
    </div>
  );
};
