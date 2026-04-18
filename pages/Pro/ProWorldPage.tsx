
import React, { useEffect, useState, useRef } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProWorldEntry, WorldEntryType, ProMap, MapPin } from '../../types/pro';

// ─── World entry type definitions ────────────────────────────
const WORLD_TYPES: { value: WorldEntryType; label: string; icon: string; dotClass: string }[] = [
  { value: 'location',   label: 'Location',   icon: '📍', dotClass: 'wtype-location'   },
  { value: 'culture',    label: 'Culture',    icon: '🏛️', dotClass: 'wtype-culture'    },
  { value: 'magic',      label: 'Magic',      icon: '✨', dotClass: 'wtype-magic'      },
  { value: 'species',    label: 'Species',    icon: '🐉', dotClass: 'wtype-species'    },
  { value: 'language',   label: 'Language',   icon: '📜', dotClass: 'wtype-language'   },
  { value: 'event',      label: 'Event',      icon: '⚡', dotClass: 'wtype-event'      },
  { value: 'artifact',   label: 'Artifact',   icon: '⚗️', dotClass: 'wtype-artifact'   },
  { value: 'faction',    label: 'Faction',    icon: '⚔️', dotClass: 'wtype-faction'    },
  { value: 'lore',       label: 'Lore',       icon: '📖', dotClass: 'wtype-lore'       },
  { value: 'religion',   label: 'Religion',   icon: '🌙', dotClass: 'wtype-religion'   },
  { value: 'technology', label: 'Technology', icon: '⚙️', dotClass: 'wtype-technology' },
  { value: 'custom',     label: 'Other',      icon: '🗂️', dotClass: 'wtype-custom'     },
];

function typeInfo(type: WorldEntryType) {
  return WORLD_TYPES.find(t => t.value === type) ?? WORLD_TYPES[WORLD_TYPES.length - 1];
}

// ─── World Entry Editor ───────────────────────────────────────
const WorldEntryEditor: React.FC<{ entry: ProWorldEntry }> = ({ entry }) => {
  const { updateWorldEntry } = useProStudio();
  const [local, setLocal] = useState(entry);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(entry); }, [entry.id]);

  const patch = (p: Partial<ProWorldEntry>) => {
    const next = { ...local, ...p };
    setLocal(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateWorldEntry(entry.id, p), 600);
  };

  const infoBlock = () => {
    switch (local.type) {
      case 'location': return (
        <>
          <EditorField label="Coordinates" value={local.coordinates ?? ''} onChange={v => patch({ coordinates: v })} />
          <EditorField label="Climate" value={local.climate ?? ''} onChange={v => patch({ climate: v })} />
          <EditorField label="Political Affiliation" value={local.politicalAffiliation ?? ''} onChange={v => patch({ politicalAffiliation: v })} />
          <EditorField label="Population" value={local.population ?? ''} onChange={v => patch({ population: v })} />
        </>
      );
      case 'magic': case 'technology': return (
        <>
          <EditorField label="Source of Power" value={local.sourceOfPower ?? ''} onChange={v => patch({ sourceOfPower: v })} />
          <EditorField label="Costs" value={local.costs ?? ''} onChange={v => patch({ costs: v })} />
          <EditorField label="Limitations" value={local.limitations ?? ''} onChange={v => patch({ limitations: v })} long />
          <EditorField label="Historical Restrictions" value={local.historicalRestrictions ?? ''} onChange={v => patch({ historicalRestrictions: v })} long />
        </>
      );
      case 'culture': case 'faction': return (
        <>
          <EditorField label="Social Hierarchy" value={local.socialHierarchy ?? ''} onChange={v => patch({ socialHierarchy: v })} />
          <EditorField label="Taboos" value={local.taboos ?? ''} onChange={v => patch({ taboos: v })} />
          <EditorField label="Rites of Passage" value={local.ritesOfPassage ?? ''} onChange={v => patch({ ritesOfPassage: v })} long />
        </>
      );
      case 'species': return (
        <>
          <EditorField label="Anatomy" value={local.anatomy ?? ''} onChange={v => patch({ anatomy: v })} long />
          <EditorField label="Diet" value={local.diet ?? ''} onChange={v => patch({ diet: v })} />
          <EditorField label="Advantages" value={local.evolutionaryAdvantages ?? ''} onChange={v => patch({ evolutionaryAdvantages: v })} />
          <EditorField label="Vulnerabilities" value={local.vulnerabilities ?? ''} onChange={v => patch({ vulnerabilities: v })} />
        </>
      );
      case 'language': return (
        <>
          <EditorField label="Phonemes" value={local.phonemes ?? ''} onChange={v => patch({ phonemes: v })} />
          <EditorField label="Script Direction" value={local.scriptDirection ?? ''} onChange={v => patch({ scriptDirection: v })} />
          <EditorField label="Common Phrases" value={local.commonPhrases ?? ''} onChange={v => patch({ commonPhrases: v })} long />
          <EditorField label="Naming Conventions" value={local.namingConventions ?? ''} onChange={v => patch({ namingConventions: v })} long />
        </>
      );
      default: return null;
    }
  };

  return (
    <div className="pro-world-editor">
      {/* Title row */}
      <div className="pro-world-editor-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 28 }}>{typeInfo(local.type).icon}</span>
          <input
            className="pro-world-editor-title-input"
            value={local.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Entry title…"
          />
        </div>
        <select
          className="pro-inspector-select"
          style={{ width: 'auto', marginLeft: 12 }}
          value={local.type}
          onChange={e => patch({ type: e.target.value as WorldEntryType })}
        >
          {WORLD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Tags */}
      <div style={{ padding: '8px 24px 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {local.tags.map((tag, i) => (
          <span key={i} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 100,
            background: 'var(--pro-surface-3)', color: 'var(--pro-text-muted)',
            border: '1px solid var(--pro-border-subtle)', cursor: 'pointer',
          }} onClick={() => patch({ tags: local.tags.filter((_, j) => j !== i) })}>{tag} ✕</span>
        ))}
        <input
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--pro-text-muted)', minWidth: 80 }}
          placeholder="+ Add tag"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              const val = (e.target as HTMLInputElement).value.trim().replace(/,$/, '');
              if (val && !local.tags.includes(val)) patch({ tags: [...local.tags, val] });
              (e.target as HTMLInputElement).value = '';
              e.preventDefault();
            }
          }}
        />
      </div>

      {/* Body */}
      <div className="pro-world-editor-body">
        <div style={{ marginTop: 16 }}>
          <label className="pro-char-field-label">Wiki Body</label>
          <textarea
            className="pro-char-field-textarea"
            style={{ minHeight: 200 }}
            value={local.content}
            onChange={e => patch({ content: e.target.value })}
            placeholder="Write a detailed wiki entry about this element of your world…"
          />
        </div>

        {/* Type-specific fields */}
        {infoBlock() && (
          <div style={{ marginTop: 20 }}>
            <div className="pro-inspector-section-label" style={{ marginBottom: 12, fontSize: 10 }}>
              — {typeInfo(local.type).label} Details —
            </div>
            <div className="pro-char-fields-grid">
              {infoBlock()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EditorField: React.FC<{ label: string; value: string; onChange: (v: string) => void; long?: boolean }> = ({ label, value, onChange, long }) => (
  <div>
    <label className="pro-char-field-label">{label}</label>
    {long
      ? <textarea className="pro-char-field-textarea" value={value} onChange={e => onChange(e.target.value)} rows={3} />
      : <input className="pro-char-field-input" value={value} onChange={e => onChange(e.target.value)} />
    }
  </div>
);

// ─── World Page ───────────────────────────────────────────────
export const ProWorldPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, worldEntries, createWorldEntry, deleteWorldEntry } = useProStudio();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<WorldEntryType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { openProject(projectId).then(() => setLoading(false)); }, [projectId]);

  const filtered = worldEntries.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeEntry = worldEntries.find(e => e.id === activeEntryId);

  const handleCreate = async (type: WorldEntryType = 'lore') => {
    const e = await createWorldEntry({ projectId, type, title: 'Untitled Entry', tags: [], content: '' });
    setActiveEntryId(e.id);
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
          <span className="pro-topbar-breadcrumb-item active">World Compendium</span>
        </div>
        <div className="pro-topbar-actions">
          <button className="pro-btn pro-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={() => handleCreate()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Entry
          </button>
        </div>
      </div>

      <div className="pro-world-page">
        {/* Sidebar */}
        <div className="pro-world-sidebar">
          {/* Search */}
          <div className="pro-world-sidebar-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--pro-text-muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className="pro-world-search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Type filters */}
          <div className="pro-world-type-filters" style={{ borderBottom: '1px solid var(--pro-border-subtle)', paddingBottom: 8, marginBottom: 4 }}>
            <button className={`pro-world-type-btn${filterType === 'all' ? ' active' : ''}`} onClick={() => setFilterType('all')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              All Entries
            </button>
            {WORLD_TYPES.map(t => (
              <button
                key={t.value}
                className={`pro-world-type-btn${filterType === t.value ? ' active' : ''}`}
                onClick={() => setFilterType(t.value)}
              >
                <span style={{ fontSize: 13 }}>{t.icon}</span>
                {t.label}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--pro-text-muted)' }}>
                  {worldEntries.filter(e => e.type === t.value).length || ''}
                </span>
              </button>
            ))}
          </div>

          {/* Entry list */}
          <div className="pro-world-entry-list">
            {filtered.map(e => {
              const info = typeInfo(e.type);
              return (
                <div
                  key={e.id}
                  className={`pro-world-entry-item${activeEntryId === e.id ? ' active' : ''}`}
                  onClick={() => setActiveEntryId(e.id)}
                >
                  <div className={`pro-world-entry-type-dot ${info.dotClass}`} />
                  <span className="pro-world-entry-title">{e.title}</span>
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--pro-text-muted)', cursor: 'pointer', fontSize: 10, padding: 2 }}
                    onClick={ev => { ev.stopPropagation(); if (window.confirm(`Delete "${e.title}"?`)) deleteWorldEntry(e.id); }}
                  >✕</button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--pro-text-muted)', fontSize: 11 }}>
                {search ? 'No matching entries' : 'No entries yet'}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        {activeEntry
          ? <WorldEntryEditor key={activeEntry.id} entry={activeEntry} />
          : <div className="pro-editor-empty-state">
              <div className="pro-editor-empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              </div>
              <h3>World Compendium</h3>
              <p>Build a rich, searchable wiki for locations, cultures, magic systems, species, factions, and more.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {['location', 'magic', 'culture', 'faction'].map(t => (
                  <button key={t} className="pro-btn pro-btn-ghost" style={{ fontSize: 12 }} onClick={() => handleCreate(t as WorldEntryType)}>
                    {typeInfo(t as WorldEntryType).icon} {typeInfo(t as WorldEntryType).label}
                  </button>
                ))}
              </div>
            </div>
        }
      </div>
    </div>
  );
};
