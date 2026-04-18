
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProCharacter, ProRelation, MoralAlignment } from '../../types/pro';

// ─── Relation nature definitions with colors ──────────────────
const RELATION_NATURES: { value: ProRelation['nature']; label: string; color: string; emoji: string }[] = [
  { value: 'familial',      label: 'Family',      color: '#FFA000', emoji: '👨‍👩‍👧' },
  { value: 'romantic',      label: 'Romantic',     color: '#E91E63', emoji: '❤️' },
  { value: 'antagonistic',  label: 'Rival',        color: '#D32F2F', emoji: '⚔️' },
  { value: 'professional',  label: 'Professional', color: '#2196F3', emoji: '🤝' },
  { value: 'social',        label: 'Social',       color: '#8D6E63', emoji: '💬' },
  { value: 'spiritual',     label: 'Spiritual',    color: '#7E57C2', emoji: '🌙' },
];

function natureColor(nature: string): string {
  return RELATION_NATURES.find(n => n.value === nature)?.color ?? '#8D6E63';
}

// ─── Alignment ────────────────────────────────────────────────
const ALIGNMENT_CELLS: { value: MoralAlignment; label: string }[] = [
  { value: 'lawful-good', label: 'Lawful Good' }, { value: 'neutral-good', label: 'Neutral Good' }, { value: 'chaotic-good', label: 'Chaotic Good' },
  { value: 'lawful-neutral', label: 'Lawful Neutral' }, { value: 'true-neutral', label: 'True Neutral' }, { value: 'chaotic-neutral', label: 'Chaotic Neutral' },
  { value: 'lawful-evil', label: 'Lawful Evil' }, { value: 'neutral-evil', label: 'Neutral Evil' }, { value: 'chaotic-evil', label: 'Chaotic Evil' },
];

const CHAR_ROLES = ['protagonist', 'antagonist', 'supporting', 'minor', 'historical', 'mythological'] as const;
const CHAR_TABS = ['Physical', 'Psychology', 'Society', 'Abilities', 'Arc'] as const;
type CharTab = typeof CHAR_TABS[number];

// ─── Field component ─────────────────────────────────────────
const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; long?: boolean; colSpan?: boolean;
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

  useEffect(() => { setLocal(character); }, [character.id]);

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
      <div className="pro-char-editor-header">
        <div className="pro-char-portrait-container">
          <div className="pro-char-portrait">
            {local.imageUrl ? <img src={local.imageUrl} alt={local.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span>{local.name?.[0] || '?'}</span>}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input className="pro-char-name-input" value={local.name} onChange={e => patch({ name: e.target.value })} placeholder="Character name…" />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <select className="pro-inspector-select" style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}
              value={local.role} onChange={e => patch({ role: e.target.value as ProCharacter['role'] })}>
              {CHAR_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            {local.pronouns && <span style={{ fontSize: 11, color: 'var(--pro-text-muted)', alignSelf:'center' }}>({local.pronouns})</span>}
          </div>
        </div>
      </div>

      <div className="pro-char-tabs">
        {CHAR_TABS.map(t => <button key={t} className={`pro-char-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="pro-char-panel">
        {tab === 'Physical' && (
          <div className="pro-char-fields-grid">
            <Field label="Age" {...f('age')} placeholder="e.g. 27" />
            <Field label="Sex" {...f('sex')} placeholder="e.g. Female" />
            <Field label="Pronouns" {...f('pronouns')} placeholder="e.g. she/her" />
            <Field label="Height" {...f('height')} placeholder="e.g. 5 ft 9 in" />
            <Field label="Eye Color" {...f('eyeColor')} placeholder="e.g. Hazel" />
            <Field label="Hair Color" {...f('hairColor')} placeholder="e.g. Dark auburn" />
            <Field label="Skin Tone" {...f('skinTone')} placeholder="e.g. Deep brown" />
            <Field label="Build" {...f('build')} placeholder="e.g. Athletic" />
            <Field label="Voice" {...f('voice')} placeholder="e.g. Low and measured" />
            <Field label="Dress Style" {...f('dressStyle')} placeholder="e.g. Practical" />
            <Field label="Scars / Marks" {...f('scars')} placeholder="Burn scar on left wrist" long colSpan />
            <Field label="Distinctive Features" {...f('distinctiveMarks')} placeholder="…" long colSpan />
          </div>
        )}
        {tab === 'Psychology' && (
          <div className="pro-char-fields-grid">
            <Field label="Archetype" {...f('archetype')} placeholder="The Trickster" />
            <Field label="MBTI" {...f('mbti')} placeholder="INTJ" />
            <Field label="Core Desire" {...f('coreDesire')} placeholder="To be truly known" />
            <Field label="Core Fear" {...f('coreFear')} placeholder="Of abandonment" />
            <Field label="Fatal Flaw" {...f('fatalFlaw')} placeholder="Excessive pride" />
            <Field label="Mantra" {...f('mantra')} placeholder="Their core belief" />
            <Field label="Ghost (Wound)" {...f('ghost')} placeholder="Past defining trauma" long colSpan />
            <Field label="Internal Conflict" {...f('internalConflict')} placeholder="…" long colSpan />
            <Field label="Epiphany" {...f('epiphany')} placeholder="Key moment of growth" long colSpan />
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="pro-char-field-label">Moral Alignment</label>
              <div className="pro-alignment-grid">
                {ALIGNMENT_CELLS.map(c => (
                  <div key={c.value} className={`pro-alignment-cell${local.moralAlignment === c.value ? ' selected' : ''}`}
                    onClick={() => patch({ moralAlignment: c.value })}>{c.label}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === 'Society' && (
          <div className="pro-char-fields-grid">
            <Field label="Occupation" {...f('occupation')} placeholder="e.g. Blacksmith" />
            <Field label="Social Class" {...f('socialClass')} placeholder="e.g. Merchant" />
            <Field label="Education" {...f('education')} placeholder="e.g. Apprenticed" />
            <Field label="Nationality" {...f('nationality')} placeholder="…" />
            <Field label="Religion" {...f('religion')} placeholder="…" />
            <Field label="Family Background" {...f('familyBackground')} long placeholder="…" colSpan />
          </div>
        )}
        {tab === 'Abilities' && (
          <div className="pro-char-fields-grid">
            <Field label="Magic / Power" {...f('magicAbility')} placeholder="…" />
            <Field label="Limitations" {...f('magicLimitations')} placeholder="…" />
            <Field label="Combat Style" {...f('combatStyle')} placeholder="…" />
            <Field label="Special Skills" value={local.specialSkills?.join(', ') ?? ''} onChange={v => patch({ specialSkills: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            <Field label="Weaknesses" value={local.weaknesses?.join(', ') ?? ''} onChange={v => patch({ weaknesses: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated" />
            <Field label="Inventory" value={local.inventory?.join(', ') ?? ''} onChange={v => patch({ inventory: v.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Key items" colSpan />
          </div>
        )}
        {tab === 'Arc' && (
          <div className="pro-char-fields-grid">
            <Field label="Arc Start" {...f('arcStart')} placeholder="Where they begin emotionally" long colSpan />
            <Field label="Midpoint" {...f('arcMidpoint')} placeholder="The turning point" long colSpan />
            <Field label="Arc End" {...f('arcEnd')} placeholder="Where they end up" long colSpan />
            <Field label="Backstory" {...f('backstory')} placeholder="Full backstory…" long colSpan />
            <Field label="Notes" {...f('notes')} placeholder="Author notes…" long colSpan />
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Add Relation Modal — uses createPortal to escape overflow
// ═══════════════════════════════════════════════════════════════
const AddRelationModal: React.FC<{
  projectId: string;
  characters: ProCharacter[];
  onClose: () => void;
  existingRelation?: ProRelation | null;
}> = ({ projectId, characters, onClose, existingRelation }) => {
  const { createRelation, updateRelation, deleteRelation } = useProStudio();
  const [sourceId, setSourceId] = useState(existingRelation?.sourceId ?? '');
  const [targetId, setTargetId] = useState(existingRelation?.targetId ?? '');
  const [label, setLabel] = useState(existingRelation?.label ?? '');
  const [nature, setNature] = useState<ProRelation['nature']>(existingRelation?.nature ?? 'social');
  const [strength, setStrength] = useState<1|2|3>(existingRelation?.strength ?? 2);
  const [bidirectional, setBidirectional] = useState(existingRelation?.isBidirectional ?? true);
  const isEditing = !!existingRelation;

  const handleSave = async () => {
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) return;
    if (isEditing) {
      await updateRelation(existingRelation!.id, { sourceId, targetId, label: label.trim(), nature, strength, isBidirectional: bidirectional });
    } else {
      await createRelation({ projectId, sourceId, targetId, label: label.trim(), nature, strength, isBidirectional: bidirectional });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (existingRelation && window.confirm('Delete this relationship?')) {
      await deleteRelation(existingRelation.id);
      onClose();
    }
  };

  // Use portal to render at document body — escaping any overflow:hidden containers
  return createPortal(
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 className="pro-modal-title">{isEditing ? 'Edit Relationship' : 'New Relationship'}</h2>
            <p className="pro-modal-sub">Define how two characters are connected</p>
          </div>
          <button className="pro-binder-icon-btn" onClick={onClose} style={{ flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="pro-relation-modal-field">
          <label>From Character</label>
          <select className="pro-form-input" value={sourceId} onChange={e => setSourceId(e.target.value)}>
            <option value="">— Select —</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
          </select>
        </div>

        <div className="pro-relation-modal-field">
          <label>To Character</label>
          <select className="pro-form-input" value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="">— Select —</option>
            {characters.filter(c => c.id !== sourceId).map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
          </select>
        </div>

        <div className="pro-relation-modal-field">
          <label>Relationship Label</label>
          <input className="pro-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Mentor, Rival, Mother, Sibling" />
        </div>

        <div className="pro-relation-modal-field">
          <label>Nature</label>
          <div className="pro-relation-nature-grid">
            {RELATION_NATURES.map(n => (
              <div key={n.value} className={`pro-relation-nature-chip${nature === n.value ? ' selected' : ''}`} onClick={() => setNature(n.value)}>
                <span className="dot" style={{ background: n.color }} /> {n.label}
              </div>
            ))}
          </div>
        </div>

        <div className="pro-relation-modal-field">
          <label>Bond Strength</label>
          <div className="pro-strength-slider">
            <span style={{ fontSize: 10, color: 'var(--pro-text-muted)' }}>Weak</span>
            <input type="range" min={1} max={3} step={1} value={strength} onChange={e => setStrength(+e.target.value as 1|2|3)} />
            <span style={{ fontSize: 10, color: 'var(--pro-text-muted)' }}>Strong</span>
            <span className="pro-strength-value">{strength}</span>
          </div>
        </div>

        <div className="pro-relation-modal-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="pro-toggle" style={{ margin: 0 }}>
            <input type="checkbox" checked={bidirectional} onChange={e => setBidirectional(e.target.checked)} />
            <span className="pro-toggle-slider" />
          </label>
          <span style={{ fontSize: 12, color: 'var(--pro-text-body)' }}>Bidirectional (mutual relationship)</span>
        </div>

        <div className="pro-modal-footer">
          {isEditing && <button className="pro-btn pro-btn-ghost" style={{ color: 'var(--pro-danger)' }} onClick={handleDelete}>Delete</button>}
          <div style={{ flex: 1 }} />
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={handleSave} disabled={!sourceId || !targetId || sourceId === targetId || !label.trim()}>
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ═══════════════════════════════════════════════════════════════
//   Family Tree View
// ═══════════════════════════════════════════════════════════════
const FamilyTreeView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { characters, relations } = useProStudio();
  const familialRels = relations.filter(r => r.nature === 'familial');
  const romanticRels = relations.filter(r => r.nature === 'romantic');

  // Build adjacency data per character
  const charMap = useMemo(() => {
    const map: Record<string, {
      char: ProCharacter;
      parents: string[];
      children: string[];
      partners: string[];
      siblings: string[];
    }> = {};
    characters.forEach(c => { map[c.id] = { char: c, parents: [], children: [], partners: [], siblings: [] }; });

    familialRels.forEach(r => {
      const lbl = r.label.toLowerCase();
      if (lbl.includes('parent') || lbl.includes('father') || lbl.includes('mother')) {
        if (map[r.sourceId]) map[r.sourceId].children.push(r.targetId);
        if (map[r.targetId]) map[r.targetId].parents.push(r.sourceId);
      } else if (lbl.includes('child') || lbl.includes('son') || lbl.includes('daughter')) {
        if (map[r.sourceId]) map[r.sourceId].parents.push(r.targetId);
        if (map[r.targetId]) map[r.targetId].children.push(r.sourceId);
      } else if (lbl.includes('sibling') || lbl.includes('brother') || lbl.includes('sister') || lbl.includes('twin')) {
        if (map[r.sourceId]) map[r.sourceId].siblings.push(r.targetId);
        if (map[r.targetId]) map[r.targetId].siblings.push(r.sourceId);
      } else {
        // Generic familial — treat as parent→child by default
        if (map[r.sourceId]) map[r.sourceId].children.push(r.targetId);
        if (map[r.targetId]) map[r.targetId].parents.push(r.sourceId);
      }
    });
    romanticRels.forEach(r => {
      if (map[r.sourceId]) map[r.sourceId].partners.push(r.targetId);
      if (map[r.targetId]) map[r.targetId].partners.push(r.sourceId);
    });
    return map;
  }, [characters, familialRels, romanticRels]);

  // Find root ancestors (no parents)
  const roots = characters.filter(c => charMap[c.id]?.parents.length === 0);

  const renderNode = (charId: string, depth: number, visited: Set<string>): React.ReactNode => {
    if (visited.has(charId)) return null;
    visited.add(charId);
    const data = charMap[charId];
    if (!data) return null;
    const { char } = data;
    const partners = data.partners.filter(pid => !visited.has(pid));
    const children = data.children.filter(cid => !visited.has(cid));

    return (
      <div key={charId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Main character node */}
          <div style={{
            background: 'var(--pro-surface-2)', border: '2px solid var(--pro-border)',
            borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 100, position: 'relative',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
              background: 'var(--pro-surface-3)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
              color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif",
              border: `2px solid ${char.role === 'protagonist' ? '#FFA000' : char.role === 'antagonist' ? '#D32F2F' : 'var(--pro-border)'}`,
            }}>
              {char.imageUrl ? <img src={char.imageUrl} alt={char.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : char.name[0]}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pro-text-rich)' }}>{char.name}</div>
            <div style={{ fontSize: 9, color: 'var(--pro-text-muted)', textTransform: 'uppercase' }}>{char.role}</div>
            {char.age && <div style={{ fontSize: 9, color: 'var(--pro-text-muted)' }}>Age: {char.age}</div>}
          </div>

          {/* Partners */}
          {partners.map(pid => {
            const p = characters.find(c => c.id === pid);
            if (!p) return null;
            visited.add(pid);
            return (
              <React.Fragment key={pid}>
                <div style={{ width: 30, height: 2, background: '#E91E63', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#E91E63' }}>❤️</span>
                </div>
                <div style={{
                  background: 'var(--pro-surface-2)', border: '2px solid #E91E63',
                  borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 100,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                    background: 'var(--pro-surface-3)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--pro-text-rich)',
                  }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : p.name[0]}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pro-text-rich)' }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--pro-text-muted)', textTransform: 'uppercase' }}>{p.role}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Children branch */}
        {children.length > 0 && (
          <>
            <div style={{ width: 2, height: 20, background: '#FFA000' }} />
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', position: 'relative' }}>
              {children.length > 1 && (
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: '#FFA000' }} />
              )}
              {children.map(cid => (
                <div key={cid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 12, background: '#FFA000' }} />
                  {renderNode(cid, depth + 1, visited)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 40, background: 'var(--pro-bg)' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Literata', serif", fontSize: 22, color: 'var(--pro-text-rich)', margin: '0 0 6px' }}>Family Tree</h2>
        <p style={{ fontSize: 12, color: 'var(--pro-text-muted)', margin: 0 }}>
          Visualize familial and romantic relationships. Add "familial" relations with labels like "Parent of", "Sibling", etc.
        </p>
      </div>

      {familialRels.length === 0 && romanticRels.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--pro-text-muted)', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌳</div>
          <p style={{ fontSize: 14 }}>No family relationships defined yet.</p>
          <p style={{ fontSize: 12 }}>Create relationships with "Family" nature and labels like<br />"Parent of", "Sibling", "Child of" to build the family tree.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          {roots.map(r => renderNode(r.id, 0, new Set()))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Relationship Graph (Canvas)
// ═══════════════════════════════════════════════════════════════
const RelationshipGraph: React.FC<{
  projectId: string;
  onAddRelation: () => void;
  onEditRelation: (rel: ProRelation) => void;
}> = ({ projectId, onAddRelation, onEditRelation }) => {
  const { characters, relations } = useProStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const draggingRef = useRef<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (characters.length === 0) return;
    const cx = dims.w / 2, cy = dims.h / 2;
    const r = Math.min(cx, cy) * 0.55;
    const positions: Record<string, { x: number; y: number }> = {};
    characters.forEach((c, i) => {
      const angle = (i / characters.length) * Math.PI * 2 - Math.PI / 2;
      positions[c.id] = nodePositions[c.id] ?? { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    setNodePositions(positions);
  }, [characters.length, dims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    relations.forEach(rel => {
      const sp = nodePositions[rel.sourceId], tp = nodePositions[rel.targetId];
      if (!sp || !tp) return;
      const isHighlight = hoveredNode && (rel.sourceId === hoveredNode || rel.targetId === hoveredNode);
      ctx.globalAlpha = hoveredNode ? (isHighlight ? 1 : 0.12) : 0.8;
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(tp.x, tp.y);
      ctx.strokeStyle = natureColor(rel.nature);
      ctx.lineWidth = Math.max(1.5, (rel.strength || 1) * 1.5);
      ctx.setLineDash(rel.isBidirectional ? [] : [6, 3]); ctx.stroke(); ctx.setLineDash([]);
      const mx = (sp.x + tp.x) / 2, my = (sp.y + tp.y) / 2;
      ctx.font = '10px Inter, sans-serif';
      const tw = ctx.measureText(rel.label).width;
      ctx.fillStyle = '#1E1714'; ctx.fillRect(mx - tw / 2 - 4, my - 7, tw + 8, 14);
      ctx.fillStyle = natureColor(rel.nature); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rel.label, mx, my);
      ctx.globalAlpha = 1;
    });

    characters.forEach(char => {
      const pos = nodePositions[char.id]; if (!pos) return;
      const r = 26, isHov = hoveredNode === char.id;
      const isConn = hoveredNode ? relations.some(rel => (rel.sourceId === hoveredNode && rel.targetId === char.id) || (rel.targetId === hoveredNode && rel.sourceId === char.id)) : false;
      ctx.globalAlpha = hoveredNode && !isHov && !isConn ? 0.2 : 1;
      if (isHov) { ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(141,110,99,0.2)'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fillStyle = isHov ? '#5D4037' : '#4E342E'; ctx.fill();
      const roleBorders: Record<string, string> = { protagonist: '#FFA000', antagonist: '#D32F2F', supporting: '#8D6E63', minor: '#795548' };
      ctx.strokeStyle = roleBorders[char.role] ?? '#8D6E63'; ctx.lineWidth = isHov ? 3 : 2; ctx.stroke();
      ctx.font = 'bold 15px Literata, serif'; ctx.fillStyle = '#EFEBE9'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(char.name[0]?.toUpperCase() || '?', pos.x, pos.y);
      ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#BCAAA4'; ctx.textBaseline = 'top';
      ctx.fillText(char.name.length > 12 ? char.name.slice(0, 11) + '…' : char.name, pos.x, pos.y + r + 5);
      ctx.font = '9px Inter, sans-serif'; ctx.fillStyle = roleBorders[char.role] ?? '#795548';
      ctx.fillText(char.role, pos.x, pos.y + r + 18); ctx.globalAlpha = 1;
    });
    ctx.restore();
  }, [characters, relations, nodePositions, zoom, pan, dims, hoveredNode]);

  useEffect(() => {
    const el = canvasRef.current?.parentElement; if (!el) return;
    const obs = new ResizeObserver(([entry]) => setDims({ w: entry.contentRect.width, h: entry.contentRect.height }));
    obs.observe(el); return () => obs.disconnect();
  }, []);

  const getNodeAt = (ex: number, ey: number) => {
    const cx = (ex - pan.x) / zoom, cy = (ey - pan.y) / zoom;
    for (const [id, pos] of Object.entries(nodePositions)) if (Math.hypot(cx - pos.x, cy - pos.y) < 28) return id;
    return null;
  };
  const getEdgeAt = (ex: number, ey: number) => {
    const cx = (ex - pan.x) / zoom, cy = (ey - pan.y) / zoom;
    for (const rel of relations) {
      const sp = nodePositions[rel.sourceId], tp = nodePositions[rel.targetId]; if (!sp || !tp) continue;
      if (Math.hypot(cx - (sp.x + tp.x) / 2, cy - (sp.y + tp.y) / 2) < 20) return rel;
    }
    return null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const hit = getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (hit) { draggingRef.current = hit; const pos = nodePositions[hit]; dragOffset.current = { dx: e.nativeEvent.offsetX / zoom - pos.x - pan.x / zoom, dy: e.nativeEvent.offsetY / zoom - pos.y - pan.y / zoom }; }
    else { isPanning.current = true; lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingRef.current) setNodePositions(p => ({ ...p, [draggingRef.current!]: { x: e.nativeEvent.offsetX / zoom - dragOffset.current.dx, y: e.nativeEvent.offsetY / zoom - dragOffset.current.dy } }));
    else if (isPanning.current) setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y });
    else setHoveredNode(getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY));
  };
  const onMouseUp = () => { draggingRef.current = null; isPanning.current = false; };
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(3, Math.max(0.3, z * (1 - e.deltaY * 0.001)))); };
  const onDoubleClick = (e: React.MouseEvent) => { const edge = getEdgeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY); if (edge) onEditRelation(edge); };

  return (
    <div className="pro-graph-canvas">
      <canvas ref={canvasRef} width={dims.w} height={dims.h} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={() => { onMouseUp(); setHoveredNode(null); }} onWheel={onWheel} onDoubleClick={onDoubleClick}
        style={{ cursor: draggingRef.current ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }} />
      <div className="pro-graph-toolbar">
        <button className="pro-graph-add-relation-btn" onClick={onAddRelation}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Relation
        </button>
        <button className="pro-graph-toolbar-btn" title="Reset View" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>
      </div>
      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(30,23,20,0.9)', border: '1px solid var(--pro-border-subtle)', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {RELATION_NATURES.map(n => (
          <div key={n.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--pro-text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color }} /> {n.label}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 10, color: 'var(--pro-text-muted)' }}>
        Drag nodes · Double-click edge to edit · Scroll to zoom
      </div>
      {characters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--pro-text-muted)', pointerEvents: 'none' }}>
          <div style={{ fontSize: 40 }}>🕸️</div>
          <p style={{ fontSize: 13 }}>Add characters to build the relationship graph</p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//   Characters Page — Three views: Profiles, Graph, Family Tree
// ═══════════════════════════════════════════════════════════════
export const ProCharactersPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, characters, createCharacter, deleteCharacter, relations } = useProStudio();
  const [view, setView] = useState<'profiles' | 'graph' | 'family'>('profiles');
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Relation modal state — lives at page level so it renders outside graph overflow
  const [showRelModal, setShowRelModal] = useState(false);
  const [editingRel, setEditingRel] = useState<ProRelation | null>(null);

  useEffect(() => { openProject(projectId).then(() => setLoading(false)); }, [projectId]);

  const activeChar = characters.find(c => c.id === activeCharId);
  const relCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    relations.forEach(r => { map[r.sourceId] = (map[r.sourceId] || 0) + 1; map[r.targetId] = (map[r.targetId] || 0) + 1; });
    return map;
  }, [relations]);

  const handleCreate = async () => { const c = await createCharacter({ projectId }); setActiveCharId(c.id); };

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
          <span className="pro-topbar-breadcrumb-item active">Characters</span>
        </div>
        <div className="pro-topbar-actions">
          <button className={`pro-topbar-btn${view === 'profiles' ? ' active' : ''}`} onClick={() => setView('profiles')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            Profiles
          </button>
          <button className={`pro-topbar-btn${view === 'graph' ? ' active' : ''}`} onClick={() => setView('graph')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="5" cy="5" r="3" /><circle cx="19" cy="5" r="3" /><circle cx="12" cy="19" r="3" /><line x1="7.5" y1="6.5" x2="10" y2="17" /><line x1="16.5" y1="6.5" x2="14" y2="17" /></svg>
            Graph ({relations.length})
          </button>
          <button className={`pro-topbar-btn${view === 'family' ? ' active' : ''}`} onClick={() => setView('family')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Family Tree
          </button>
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
              <div key={c.id} className={`pro-char-list-item${activeCharId === c.id ? ' active' : ''}`}
                onClick={() => { setActiveCharId(c.id); if (view !== 'profiles') setView('profiles'); }}>
                <div className="pro-char-list-avatar">
                  {c.imageUrl ? <img src={c.imageUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name[0]}
                </div>
                <div className="pro-char-list-info">
                  <div className="pro-char-list-name">{c.name}</div>
                  <div className="pro-char-list-role">{c.role}{relCountMap[c.id] ? ` · ${relCountMap[c.id]} rel` : ''}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--pro-text-muted)', cursor: 'pointer', padding: 2, fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${c.name}"?`)) deleteCharacter(c.id); }} title="Delete">✕</button>
              </div>
            ))}
            {characters.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--pro-text-muted)', fontSize: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                No characters yet.<br />
                <button className="pro-binder-add-btn" style={{ justifyContent:'center', marginTop:8 }} onClick={handleCreate}>+ Add Character</button>
              </div>
            )}
          </div>
        </div>

        {/* Main area */}
        {view === 'profiles' && (
          activeChar ? <CharProfileEditor key={activeChar.id} character={activeChar} />
            : <div className="pro-editor-empty-state">
                <div className="pro-editor-empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>
                <h3>Select a Character</h3>
                <p>Choose from the sidebar or create a new character to start building their profile.</p>
                <button className="pro-btn pro-btn-primary" onClick={handleCreate}>+ New Character</button>
              </div>
        )}
        {view === 'graph' && <RelationshipGraph projectId={projectId} onAddRelation={() => { setEditingRel(null); setShowRelModal(true); }} onEditRelation={r => { setEditingRel(r); setShowRelModal(true); }} />}
        {view === 'family' && <FamilyTreeView projectId={projectId} />}
      </div>

      {/* Relation modal — rendered at page level, portaled to body */}
      {showRelModal && (
        <AddRelationModal
          projectId={projectId}
          characters={characters}
          existingRelation={editingRel}
          onClose={() => { setShowRelModal(false); setEditingRel(null); }}
        />
      )}
    </div>
  );
};
