
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProCharacter, ProRelation, MoralAlignment } from '../../types/pro';

// ─── Moral alignment matrix ───────────────────────────────────
const ALIGNMENT_CELLS: { value: MoralAlignment; label: string }[] = [
  { value: 'lawful-good',    label: 'Lawful Good'    },
  { value: 'neutral-good',   label: 'Neutral Good'   },
  { value: 'chaotic-good',   label: 'Chaotic Good'   },
  { value: 'lawful-neutral', label: 'Lawful Neutral'  },
  { value: 'true-neutral',   label: 'True Neutral'   },
  { value: 'chaotic-neutral',label: 'Chaotic Neutral' },
  { value: 'lawful-evil',    label: 'Lawful Evil'    },
  { value: 'neutral-evil',   label: 'Neutral Evil'   },
  { value: 'chaotic-evil',   label: 'Chaotic Evil'   },
];

const CHAR_ROLES = ['protagonist', 'antagonist', 'supporting', 'minor', 'historical', 'mythological'] as const;
const CHAR_TABS = ['Physical', 'Psychology', 'Society', 'Abilities', 'Arc'] as const;
type CharTab = typeof CHAR_TABS[number];

// ─── Simple text field ────────────────────────────────────────
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  long?: boolean;
  colSpan?: boolean;
}> = ({ label, value, onChange, placeholder, long, colSpan }) => (
  <div style={colSpan ? { gridColumn: '1 / -1' } : {}}>
    <label className="pro-char-field-label">{label}</label>
    {long
      ? <textarea className="pro-char-field-textarea" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} />
      : <input className="pro-char-field-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    }
  </div>
);

// ─── Character Profile Editor ─────────────────────────────────
const CharProfileEditor: React.FC<{ character: ProCharacter }> = ({ character }) => {
  const { updateCharacter } = useProStudio();
  const [tab, setTab] = useState<CharTab>('Physical');
  const [local, setLocal] = useState<ProCharacter>(character);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when character changes
  useEffect(() => { setLocal(character); }, [character.id]);

  // Debounced save
  const patch = useCallback((p: Partial<ProCharacter>) => {
    const next = { ...local, ...p };
    setLocal(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateCharacter(character.id, p), 600);
  }, [local, character.id, updateCharacter]);

  const f = (key: keyof ProCharacter) => ({
    value: (local[key] as string) || '',
    onChange: (v: string) => patch({ [key]: v }),
  });

  return (
    <div className="pro-char-editor">
      {/* Header: portrait + name + role */}
      <div className="pro-char-editor-header">
        <div className="pro-char-portrait-container">
          <div className="pro-char-portrait">
            {local.imageUrl
              ? <img src={local.imageUrl} alt={local.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span>{local.name?.[0] || '?'}</span>
            }
          </div>
          <div className="pro-char-portrait-overlay">📷</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="pro-char-name-input"
            value={local.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Character name…"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <select
              className="pro-inspector-select"
              style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}
              value={local.role}
              onChange={e => patch({ role: e.target.value as ProCharacter['role'] })}
            >
              {CHAR_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            {local.pronouns && <span style={{ fontSize: 11, color: 'var(--pro-text-muted)', alignSelf:'center' }}>({local.pronouns})</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pro-char-tabs">
        {CHAR_TABS.map(t => (
          <button key={t} className={`pro-char-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Panel */}
      <div className="pro-char-panel">
        {tab === 'Physical' && (
          <div className="pro-char-fields-grid">
            <Field label="Age"           {...f('age')}           placeholder="e.g. 27" />
            <Field label="Sex"           {...f('sex')}           placeholder="e.g. Female" />
            <Field label="Pronouns"      {...f('pronouns')}      placeholder="e.g. she/her" />
            <Field label="Height"        {...f('height')}        placeholder="e.g. 5'9" />
            <Field label="Weight"        {...f('weight')}        placeholder="e.g. 145 lbs" />
            <Field label="Eye Color"     {...f('eyeColor')}      placeholder="e.g. Hazel" />
            <Field label="Hair Color"    {...f('hairColor')}     placeholder="e.g. Dark auburn" />
            <Field label="Skin Tone"     {...f('skinTone')}      placeholder="e.g. Deep brown" />
            <Field label="Build"         {...f('build')}         placeholder="e.g. Athletic" />
            <Field label="Posture"       {...f('posture')}       placeholder="e.g. Upright, commanding" />
            <Field label="Voice"         {...f('voice')}         placeholder="e.g. Low and measured" />
            <Field label="Dress Style"   {...f('dressStyle')}    placeholder="e.g. Practical traveler" />
            <Field label="Scars / Marks" {...f('scars')}         placeholder="Burn scar on left wrist" long colSpan />
            <Field label="Distinctive Features" {...f('distinctiveMarks')} placeholder="…" long colSpan />
          </div>
        )}

        {tab === 'Psychology' && (
          <div className="pro-char-fields-grid">
            <Field label="Archetype"      {...f('archetype')}       placeholder="The Trickster" />
            <Field label="MBTI"           {...f('mbti')}            placeholder="INTJ" />
            <Field label="Enneagram"      {...f('enneagram')}       placeholder="Type 4w5" />
            <Field label="Core Desire"    {...f('coreDesire')}      placeholder="To be truly known" />
            <Field label="Core Fear"      {...f('coreFear')}        placeholder="Of abandonment" />
            <Field label="Fatal Flaw"     {...f('fatalFlaw')}       placeholder="Excessive pride" />
            <Field label="Mantra"         {...f('mantra')}          placeholder="Their core belief" />
            <Field label="Ghost (Wound)"  {...f('ghost')}           placeholder="Past defining trauma" long colSpan />
            <Field label="Internal Conflict" {...f('internalConflict')} placeholder="…" long colSpan />
            <Field label="External Conflict" {...f('externalConflict')} placeholder="…" long colSpan />
            <Field label="Epiphany"       {...f('epiphany')}        placeholder="Key moment of growth" long colSpan />

            {/* Moral alignment */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="pro-char-field-label">Moral Alignment</label>
              <div className="pro-alignment-grid">
                {ALIGNMENT_CELLS.map(c => (
                  <div
                    key={c.value}
                    className={`pro-alignment-cell${local.moralAlignment === c.value ? ' selected' : ''}`}
                    onClick={() => patch({ moralAlignment: c.value })}
                  >{c.label}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Society' && (
          <div className="pro-char-fields-grid">
            <Field label="Occupation"     {...f('occupation')}      placeholder="e.g. Blacksmith" />
            <Field label="Social Class"   {...f('socialClass')}     placeholder="e.g. Merchant" />
            <Field label="Education"      {...f('education')}       placeholder="e.g. Apprenticed" />
            <Field label="Nationality"    {...f('nationality')}     placeholder="…" />
            <Field label="Ethnicity"      {...f('ethnicity')}       placeholder="…" />
            <Field label="Religion"       {...f('religion')}        placeholder="…" />
            <Field label="Economic Status" {...f('economicStatus')} placeholder="…" />
            <Field label="Political Views" {...f('politicalViews')} placeholder="…" />
            <Field label="Family Background" {...f('familyBackground')} long placeholder="…" colSpan />
          </div>
        )}

        {tab === 'Abilities' && (
          <div className="pro-char-fields-grid">
            <Field label="Magic / Power"   {...f('magicAbility')}       placeholder="…" />
            <Field label="Limitations"     {...f('magicLimitations')}   placeholder="…" />
            <Field label="Combat Style"    {...f('combatStyle')}         placeholder="…" />
            <Field label="Special Skills"  value={local.specialSkills?.join(', ') ?? ''} onChange={v => patch({ specialSkills: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            <Field label="Weaponry"        value={local.weaponry?.join(', ') ?? ''} onChange={v => patch({ weaponry: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            <Field label="Weaknesses"      value={local.weaknesses?.join(', ') ?? ''} onChange={v => patch({ weaknesses: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            <Field label="Inventory"       value={local.inventory?.join(', ') ?? ''} onChange={v => patch({ inventory: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Key items" colSpan />
          </div>
        )}

        {tab === 'Arc' && (
          <div className="pro-char-fields-grid">
            <Field label="Arc Start"    {...f('arcStart')}    placeholder="Where they begin emotionally" long colSpan />
            <Field label="Midpoint"     {...f('arcMidpoint')} placeholder="The turning point" long colSpan />
            <Field label="Arc End"      {...f('arcEnd')}      placeholder="Where they end up" long colSpan />
            <Field label="Secrets Known" {...f('secretsKnown')} placeholder="What they know others don't" long colSpan />
            <Field label="Secrets Hidden" {...f('secretsHidden')} placeholder="What they hide" long colSpan />
            <Field label="Backstory"    {...f('backstory')}   placeholder="Full backstory…" long colSpan />
            <Field label="Notes"        {...f('notes')}       placeholder="Author notes…" long colSpan />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Relationship Graph (Canvas-based) ───────────────────────
const RelationshipGraph: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { characters, relations, createRelation, deleteRelation } = useProStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const draggingRef = useRef<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const [selectedRel, setSelectedRel] = useState<ProRelation | null>(null);

  // Initialize node positions in a circle layout
  useEffect(() => {
    if (characters.length === 0) return;
    const cx = dims.w / 2, cy = dims.h / 2;
    const r = Math.min(cx, cy) * 0.65;
    const positions: Record<string, { x: number; y: number }> = {};
    characters.forEach((c, i) => {
      const angle = (i / characters.length) * Math.PI * 2 - Math.PI / 2;
      positions[c.id] = positions[c.id] ?? {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    setNodePositions(positions);
  }, [characters.length, dims]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dims.w, dims.h);

    // Apply pan/zoom transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const ACCENT = '#8D6E63';
    const MUTED = '#795548';
    const SURFACE3 = '#4E342E';

    // Draw edges
    relations.forEach(rel => {
      const sp = nodePositions[rel.sourceId];
      const tp = nodePositions[rel.targetId];
      if (!sp || !tp) return;

      const weight = rel.strength || 1;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.strokeStyle = rel.isBidirectional ? ACCENT : MUTED;
      ctx.lineWidth = weight;
      ctx.setLineDash(rel.isBidirectional ? [] : [6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge label
      const mx = (sp.x + tp.x) / 2, my = (sp.y + tp.y) / 2;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bg_pad = 4;
      const tw = ctx.measureText(rel.label).width;
      ctx.fillStyle = '#1E1714';
      ctx.fillRect(mx - tw / 2 - bg_pad, my - 7, tw + bg_pad * 2, 14);
      ctx.fillStyle = MUTED;
      ctx.fillText(rel.label, mx, my);
    });

    // Draw nodes
    characters.forEach(char => {
      const pos = nodePositions[char.id];
      if (!pos) return;
      const r = 22;

      // Circle background
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = SURFACE3;
      ctx.fill();
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Initial / letter
      ctx.font = `bold 14px Literata, serif`;
      ctx.fillStyle = '#EFEBE9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char.name[0]?.toUpperCase() || '?', pos.x, pos.y);

      // Name below
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#BCAAA4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(char.name.split(' ')[0], pos.x, pos.y + r + 4);
    });

    ctx.restore();
  }, [characters, relations, nodePositions, zoom, pan, dims]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mouse events for drag
  const getNodeAt = (ex: number, ey: number) => {
    const cx = (ex - pan.x) / zoom;
    const cy = (ey - pan.y) / zoom;
    for (const [id, pos] of Object.entries(nodePositions)) {
      if (Math.hypot(cx - pos.x, cy - pos.y) < 24) return id;
    }
    return null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const hit = getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (hit) {
      draggingRef.current = hit;
      const pos = nodePositions[hit];
      dragOffset.current = {
        dx: e.nativeEvent.offsetX / zoom - pos.x - pan.x / zoom,
        dy: e.nativeEvent.offsetY / zoom - pos.y - pan.y / zoom,
      };
    } else {
      isPanning.current = true;
      lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingRef.current) {
      const id = draggingRef.current;
      setNodePositions(prev => ({
        ...prev,
        [id]: {
          x: e.nativeEvent.offsetX / zoom - dragOffset.current.dx,
          y: e.nativeEvent.offsetY / zoom - dragOffset.current.dy,
        },
      }));
    } else if (isPanning.current) {
      setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y });
    }
  };

  const onMouseUp = () => { draggingRef.current = null; isPanning.current = false; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.3, z * (1 - e.deltaY * 0.001))));
  };

  return (
    <div className="pro-graph-canvas">
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />
      <div className="pro-graph-toolbar">
        <button className="pro-graph-toolbar-btn" title="Zoom In" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
        </button>
        <button className="pro-graph-toolbar-btn" title="Zoom Out" onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
        </button>
        <button className="pro-graph-toolbar-btn" title="Reset View" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>
      </div>
      {characters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--pro-text-muted)', pointerEvents: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🕸️</div>
          <p style={{ fontSize: 13 }}>Add characters to build the relationship graph</p>
        </div>
      )}
    </div>
  );
};

// ─── Characters Page ──────────────────────────────────────────
export const ProCharactersPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, characters, createCharacter, deleteCharacter } = useProStudio();
  const [view, setView] = useState<'profiles' | 'graph'>('profiles');
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    openProject(projectId).then(() => setLoading(false));
  }, [projectId]);

  const activeChar = characters.find(c => c.id === activeCharId);

  const handleCreate = async () => {
    const c = await createCharacter({ projectId });
    setActiveCharId(c.id);
  };

  if (loading) return (
    <div className="pro-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--pro-text-muted)' }}>Loading…</span>
    </div>
  );

  return (
    <div className="pro-shell">
      {/* Top bar */}
      <div className="pro-topbar">
        <a href={`#/pro/studio/${projectId}`} className="pro-topbar-logo" onClick={e => { e.preventDefault(); window.location.hash = `/pro/studio/${projectId}`; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          <span className="pro-topbar-logo-text">Back to Studio</span>
        </a>
        <div className="pro-topbar-breadcrumb">
          <span className="pro-topbar-breadcrumb-item">{activeProject?.title}</span>
          <span className="pro-topbar-breadcrumb-sep">›</span>
          <span className="pro-topbar-breadcrumb-item active">Characters</span>
        </div>
        <div className="pro-topbar-actions">
          <button className={`pro-topbar-btn${view === 'profiles' ? ' active' : ''}`} onClick={() => setView('profiles')}>Profiles</button>
          <button className={`pro-topbar-btn${view === 'graph' ? ' active' : ''}`} onClick={() => setView('graph')}>Relationship Graph</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div className="pro-char-sidebar">
          <div className="pro-char-sidebar-header">
            <span className="pro-char-sidebar-title">Characters ({characters.length})</span>
            <button className="pro-binder-icon-btn" title="New Character" onClick={handleCreate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          <div className="pro-char-list">
            {characters.map(c => (
              <div
                key={c.id}
                className={`pro-char-list-item${activeCharId === c.id ? ' active' : ''}`}
                onClick={() => setActiveCharId(c.id)}
              >
                <div className="pro-char-list-avatar">
                  {c.imageUrl ? <img src={c.imageUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name[0]}
                </div>
                <div className="pro-char-list-info">
                  <div className="pro-char-list-name">{c.name}</div>
                  <div className="pro-char-list-role">{c.role}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--pro-text-muted)', cursor: 'pointer', padding: 2, fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${c.name}"?`)) deleteCharacter(c.id); }}
                  title="Delete"
                >✕</button>
              </div>
            ))}
            {characters.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--pro-text-muted)', fontSize: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                No characters yet.<br />
                <button className="pro-binder-add-btn" style={{ justifyContent:'center', marginTop:8 }} onClick={handleCreate}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add Character
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main area */}
        {view === 'profiles' ? (
          activeChar
            ? <CharProfileEditor key={activeChar.id} character={activeChar} />
            : <div className="pro-editor-empty-state">
                <div className="pro-editor-empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <h3>Select a Character</h3>
                <p>Choose from the sidebar or create a new character to start building their profile.</p>
                <button className="pro-btn pro-btn-primary" onClick={handleCreate}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  New Character
                </button>
              </div>
        ) : (
          <RelationshipGraph projectId={projectId} />
        )}
      </div>
    </div>
  );
};
