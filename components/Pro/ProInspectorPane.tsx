
import React, { useCallback, useState } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProScene } from '../../types/pro';

// ─── Inspector tab icons ──────────────────────────────────────
const SceneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const RefIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BibleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── Beat types ───────────────────────────────────────────────
const BEAT_TYPES: ProScene['beatType'][] = [
  'none', 'action', 'reaction', 'sequel', 'transition', 'climax'
];

// ─── Scene Inspector Panel ────────────────────────────────────
const SceneInspectorPanel: React.FC<{ scene: ProScene }> = ({ scene }) => {
  const { updateScene, characters } = useProStudio();
  const [local, setLocal] = useState(scene);

  // Flush field on blur
  const flush = useCallback((patch: Partial<ProScene>) => {
    updateScene(scene.id, patch);
  }, [scene.id, updateScene]);

  const sceneChars = characters.filter(c => scene.characterIds.includes(c.id));
  const unassignedChars = characters.filter(c => !scene.characterIds.includes(c.id));

  return (
    <div className="pro-inspector-scroll">
      {/* Goal / Conflict / Disaster */}
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label">
          <SceneIcon /> Scene Frame
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Goal</label>
          <textarea
            className="pro-inspector-textarea"
            placeholder="What does the POV want?"
            value={local.goal ?? ''}
            onChange={e => setLocal(l => ({ ...l, goal: e.target.value }))}
            onBlur={() => flush({ goal: local.goal })}
            rows={2}
          />
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Conflict</label>
          <textarea
            className="pro-inspector-textarea"
            placeholder="What opposes them?"
            value={local.conflict ?? ''}
            onChange={e => setLocal(l => ({ ...l, conflict: e.target.value }))}
            onBlur={() => flush({ conflict: local.conflict })}
            rows={2}
          />
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Disaster / Outcome</label>
          <textarea
            className="pro-inspector-textarea"
            placeholder="Yes, No, or Yes but…"
            value={local.disaster ?? ''}
            onChange={e => setLocal(l => ({ ...l, disaster: e.target.value }))}
            onBlur={() => flush({ disaster: local.disaster })}
            rows={2}
          />
        </div>
      </div>

      <div className="pro-inspector-divider" />

      {/* Emotional Arc */}
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label">Emotional Arc</div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Start Emotion</label>
          <div className="pro-emotion-slider">
            <span className="pro-emotion-emoji">😞</span>
            <input
              type="range" min={0} max={10} step={1}
              className="pro-emotion-range"
              value={local.emotionStart ?? 5}
              onChange={e => setLocal(l => ({ ...l, emotionStart: +e.target.value }))}
              onMouseUp={() => flush({ emotionStart: local.emotionStart })}
            />
            <span className="pro-emotion-emoji">😊</span>
            <span style={{ fontSize: 11, color: 'var(--pro-text-muted)', minWidth:16, textAlign:'center' }}>{local.emotionStart ?? 5}</span>
          </div>
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">End Emotion</label>
          <div className="pro-emotion-slider">
            <span className="pro-emotion-emoji">😞</span>
            <input
              type="range" min={0} max={10} step={1}
              className="pro-emotion-range"
              value={local.emotionEnd ?? 5}
              onChange={e => setLocal(l => ({ ...l, emotionEnd: +e.target.value }))}
              onMouseUp={() => flush({ emotionEnd: local.emotionEnd })}
            />
            <span className="pro-emotion-emoji">😊</span>
            <span style={{ fontSize: 11, color: 'var(--pro-text-muted)', minWidth:16, textAlign:'center' }}>{local.emotionEnd ?? 5}</span>
          </div>
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Emotional Shift</label>
          <input
            className="pro-inspector-input"
            placeholder="e.g. +Hope / -Safety"
            value={local.emotionalShift ?? ''}
            onChange={e => setLocal(l => ({ ...l, emotionalShift: e.target.value }))}
            onBlur={() => flush({ emotionalShift: local.emotionalShift })}
          />
        </div>
      </div>

      <div className="pro-inspector-divider" />

      {/* Beat / POV / Time */}
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label">Metadata</div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Beat Type</label>
          <select
            className="pro-inspector-select"
            value={local.beatType ?? 'none'}
            onChange={e => { const v = e.target.value as ProScene['beatType']; setLocal(l => ({ ...l, beatType: v })); flush({ beatType: v }); }}
          >
            {BEAT_TYPES.map(b => (
              <option key={b} value={b}>{b ? b.charAt(0).toUpperCase() + b.slice(1) : 'None'}</option>
            ))}
          </select>
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">POV Character</label>
          <select
            className="pro-inspector-select"
            value={local.pov ?? ''}
            onChange={e => { setLocal(l => ({ ...l, pov: e.target.value })); flush({ pov: e.target.value || undefined }); }}
          >
            <option value="">— None —</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">In-World Time</label>
          <input
            className="pro-inspector-input"
            placeholder="e.g. Day 3, Year of the Wolf"
            value={local.worldTime ?? ''}
            onChange={e => setLocal(l => ({ ...l, worldTime: e.target.value }))}
            onBlur={() => flush({ worldTime: local.worldTime })}
          />
        </div>
      </div>

      <div className="pro-inspector-divider" />

      {/* Characters in scene */}
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label" style={{ justifyContent: 'space-between' }}>
          <span>Characters Present</span>
        </div>
        <div className="pro-char-chips">
          {sceneChars.map(c => (
            <div key={c.id} className="pro-char-chip">
              <div className="pro-char-chip-avatar" style={{ background: 'var(--pro-surface-3)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:10 }}>
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="pro-char-chip-avatar" /> : c.name[0]}
              </div>
              {c.name}
              <button
                className="pro-char-chip-remove"
                onClick={() => {
                  const ids = scene.characterIds.filter(id => id !== c.id);
                  updateScene(scene.id, { characterIds: ids });
                }}
              >✕</button>
            </div>
          ))}
          {unassignedChars.length > 0 && (
            <select
              className="pro-inspector-select"
              value=""
              onChange={e => {
                if (!e.target.value) return;
                const ids = [...scene.characterIds, e.target.value];
                updateScene(scene.id, { characterIds: ids });
              }}
            >
              <option value="">+ Add character</option>
              {unassignedChars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="pro-inspector-divider" />

      {/* Synopsis */}
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label">Synopsis</div>
        <textarea
          className="pro-inspector-textarea"
          rows={3}
          placeholder="Summarize this scene…"
          value={local.synopsis ?? ''}
          onChange={e => setLocal(l => ({ ...l, synopsis: e.target.value }))}
          onBlur={() => flush({ synopsis: local.synopsis })}
        />
      </div>
    </div>
  );
};

// ─── Reference Panel ──────────────────────────────────────────
const ReferencePanelContent: React.FC = () => {
  const { characters, activeSceneId, scenes, worldEntries } = useProStudio();
  const scene = scenes.find(s => s.id === activeSceneId);
  const sceneChars = scene ? characters.filter(c => scene.characterIds.includes(c.id)) : characters.slice(0, 5);

  return (
    <div className="pro-inspector-scroll">
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label">
          <RefIcon /> Characters
        </div>
        {sceneChars.length === 0 && characters.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--pro-text-muted)' }}>No characters yet. Add some in the Character Engine.</p>
        )}
        {(scene ? sceneChars : characters).slice(0, 8).map(char => (
          <div key={char.id} className="pro-ref-card">
            <div className="pro-ref-card-header">
              {char.imageUrl
                ? <img src={char.imageUrl} alt={char.name} className="pro-ref-card-portrait" />
                : <div className="pro-ref-card-portrait-placeholder">{char.name[0]}</div>
              }
              <div>
                <div className="pro-ref-card-name">{char.name}</div>
                <div className="pro-ref-card-role">{char.role}</div>
              </div>
            </div>
            {char.coreDesire && (
              <div className="pro-ref-card-attr">
                <span className="pro-ref-card-attr-label">Desires</span>
                <span className="pro-ref-card-attr-value">{char.coreDesire}</span>
              </div>
            )}
            {char.coreFear && (
              <div className="pro-ref-card-attr">
                <span className="pro-ref-card-attr-label">Fears</span>
                <span className="pro-ref-card-attr-value">{char.coreFear}</span>
              </div>
            )}
            {char.fatalFlaw && (
              <div className="pro-ref-card-attr">
                <span className="pro-ref-card-attr-label">Flaw</span>
                <span className="pro-ref-card-attr-value">{char.fatalFlaw}</span>
              </div>
            )}
          </div>
        ))}

        {worldEntries.length > 0 && (
          <>
            <div className="pro-inspector-section-label" style={{ marginTop: 16 }}>
              <BibleIcon /> World Entries
            </div>
            {worldEntries.slice(0, 5).map(e => (
              <div key={e.id} className="pro-ref-card">
                <div className="pro-ref-card-name">{e.title}</div>
                <div className="pro-ref-card-role">{e.type}</div>
                {e.tags.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {e.tags.map(t => (
                      <span key={t} style={{ fontSize:10, padding:'1px 6px', borderRadius:100, background:'var(--pro-surface-3)', color:'var(--pro-text-muted)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Project Bible Panel ──────────────────────────────────────
const BiblePanelContent: React.FC = () => {
  const { activeProject, updateProject } = useProStudio();
  const [logline, setLogline] = useState(activeProject?.bible?.logline ?? '');
  const [synopsis, setSynopsis] = useState(activeProject?.bible?.synopsis ?? '');
  const [worldRules, setWorldRules] = useState(activeProject?.bible?.worldRules ?? '');
  const [thematic, setThematic] = useState(activeProject?.bible?.thematicStatement ?? '');

  if (!activeProject) return null;

  const save = (patch: Partial<typeof activeProject.bible>) => {
    updateProject(activeProject.id, { bible: { ...activeProject.bible, ...patch } });
  };

  return (
    <div className="pro-inspector-scroll">
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label"><BibleIcon /> Project Bible</div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Logline</label>
          <textarea className="pro-inspector-textarea" rows={2}
            placeholder="One sentence that captures the story…"
            value={logline} onChange={e => setLogline(e.target.value)}
            onBlur={() => save({ logline })} />
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Thematic Statement</label>
          <textarea className="pro-inspector-textarea" rows={2}
            placeholder="What is the story really about?"
            value={thematic} onChange={e => setThematic(e.target.value)}
            onBlur={() => save({ thematicStatement: thematic })} />
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">Synopsis</label>
          <textarea className="pro-inspector-textarea" rows={5}
            placeholder="Full arc summary…"
            value={synopsis} onChange={e => setSynopsis(e.target.value)}
            onBlur={() => save({ synopsis })} />
        </div>

        <div className="pro-inspector-field">
          <label className="pro-inspector-field-label">World Rules</label>
          <textarea className="pro-inspector-textarea" rows={4}
            placeholder="Magic systems, laws of physics, constraints…"
            value={worldRules} onChange={e => setWorldRules(e.target.value)}
            onBlur={() => save({ worldRules })} />
        </div>
      </div>
    </div>
  );
};

// ─── Notes Panel ──────────────────────────────────────────────
const NotesPanelContent: React.FC = () => {
  const { activeProject, updateProject } = useProStudio();
  const [notes, setNotes] = useState(activeProject?.bible?.seriesNotes ?? '');
  if (!activeProject) return null;
  return (
    <div className="pro-inspector-scroll">
      <div className="pro-inspector-section">
        <div className="pro-inspector-section-label"><NoteIcon /> Series Notes</div>
        <textarea
          className="pro-inspector-textarea"
          rows={20}
          placeholder="Free-form notes, ideas, reminders…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => updateProject(activeProject.id, { bible: { ...activeProject.bible, seriesNotes: notes } })}
          style={{ minHeight: '60vh', resize:'none' }}
        />
      </div>
    </div>
  );
};

// ─── ProInspectorPane ─────────────────────────────────────────
export const ProInspectorPane: React.FC = () => {
  const {
    inspectorTab, setInspectorTab, inspectorCollapsed, toggleInspector,
    activeSceneId, scenes,
  } = useProStudio();

  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;

  const TABS = [
    { id: 'scene' as const, label: 'Scene', icon: <SceneIcon /> },
    { id: 'reference' as const, label: 'Refs', icon: <RefIcon /> },
    { id: 'bible' as const, label: 'Bible', icon: <BibleIcon /> },
    { id: 'notes' as const, label: 'Notes', icon: <NoteIcon /> },
  ];

  return (
    <div className={`pro-inspector${inspectorCollapsed ? ' collapsed' : ''}`}>
      {/* Tab bar */}
      <div className="pro-inspector-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`pro-inspector-tab${inspectorTab === tab.id ? ' active' : ''}`}
            onClick={() => setInspectorTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {inspectorTab === 'scene' && (
        activeScene
          ? <SceneInspectorPanel key={activeScene.id} scene={activeScene} />
          : <div className="pro-inspector-scroll" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pro-text-muted)', fontSize:12, textAlign:'center', padding:24 }}>
              Select a scene to inspect its frame, arc, and metadata.
            </div>
      )}
      {inspectorTab === 'reference' && <ReferencePanelContent />}
      {inspectorTab === 'bible' && <BiblePanelContent />}
      {inspectorTab === 'notes' && <NotesPanelContent />}
    </div>
  );
};
