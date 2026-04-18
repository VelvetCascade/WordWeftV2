
import React, { useEffect, useState } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { ProBinder } from '../../components/Pro/ProBinder';
import { ProEditorPane } from '../../components/Pro/ProEditorPane';
import { ProInspectorPane } from '../../components/Pro/ProInspectorPane';
import { WordWeftLogo } from '../../components/icons/WordWeftLogo';

// ─── Pro Studio Page ─────────────────────────────────────────
// Full three-pane workspace: Binder | Editor | Inspector
// URL: #/pro/studio/:projectId
export const ProStudioPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const {
    openProject, activeProject,
    toggleBinder, toggleInspector,
    binderCollapsed, inspectorCollapsed,
    isSaving, lastSavedAt,
    activeSceneId, scenes,
    activeProject: project,
  } = useProStudio();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await openProject(projectId);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const activeScene = scenes.find(s => s.id === activeSceneId);

  if (loading) {
    return (
      <div className="pro-shell" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="w-10 h-10 animate-spin" style={{ animationDuration: '2s' }}><WordWeftLogo className="w-10 h-10" /></div>
        <span style={{ color: 'var(--pro-text-muted)', fontSize: 13 }}>Opening project…</span>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="pro-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--pro-text-muted)' }}>
          <p style={{ fontSize: 18, marginBottom: 12 }}>Project not found</p>
          <button className="pro-btn pro-btn-ghost" onClick={() => window.location.hash = '/pro'}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pro-shell">
      {/* ── Top Bar ── */}
      <div className="pro-topbar">
        {/* Logo + badge */}
        <a href="#/pro" className="pro-topbar-logo" onClick={e => { e.preventDefault(); window.location.hash = '/pro'; }}>
          <WordWeftLogo className="w-7 h-7" />
          <span className="pro-topbar-logo-text">WordWeft</span>
          <span className="pro-topbar-logo-badge">PRO</span>
        </a>

        {/* Breadcrumb */}
        <div className="pro-topbar-breadcrumb">
          <span
            className="pro-topbar-breadcrumb-item"
            onClick={() => window.location.hash = '/pro'}
          >{activeProject.title}</span>
          {activeScene && (
            <>
              <span className="pro-topbar-breadcrumb-sep">›</span>
              <span className="pro-topbar-breadcrumb-item active">{activeScene.title}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="pro-topbar-actions">
          {/* Save indicator */}
          {isSaving && (
            <span className="pro-save-indicator saving">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Saving…
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span className="pro-save-indicator saved" title={`Saved at ${lastSavedAt}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              Saved
            </span>
          )}

          <div className="pro-topbar-divider" />

          {/* Binder toggle */}
          <button
            className={`pro-topbar-btn${!binderCollapsed ? ' active' : ''}`}
            onClick={toggleBinder}
            title="Toggle Binder (Ctrl+\\)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Binder
          </button>

          {/* Inspector toggle */}
          <button
            className={`pro-topbar-btn${!inspectorCollapsed ? ' active' : ''}`}
            onClick={toggleInspector}
            title="Toggle Inspector (Ctrl+Alt+\\)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            Inspector
          </button>

          <div className="pro-topbar-divider" />

          {/* Characters */}
          <button
            className="pro-topbar-btn"
            onClick={() => window.location.hash = `/pro/characters/${activeProject.id}`}
            title="Character Engine"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Characters
          </button>

          {/* World */}
          <button
            className="pro-topbar-btn"
            onClick={() => window.location.hash = `/pro/world/${activeProject.id}`}
            title="World Compendium"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            World
          </button>

          {/* Maps */}
          <button
            className="pro-topbar-btn"
            onClick={() => window.location.hash = `/pro/maps/${activeProject.id}`}
            title="Interactive Maps"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
            Maps
          </button>

          <div className="pro-topbar-divider" />

          {/* Editor settings */}
          <button
            className="pro-topbar-btn"
            onClick={() => window.location.hash = `/pro/settings/${activeProject.id}`}
            title="Project Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Three-Pane Workspace ── */}
      <div className="pro-workspace">
        {/* Left: Binder */}
        <ProBinder />

        {/* Resize handle */}
        {!binderCollapsed && <div className="pro-resize-handle" />}

        {/* Center: Editor */}
        <ProEditorPane />

        {/* Resize handle */}
        {!inspectorCollapsed && <div className="pro-resize-handle" />}

        {/* Right: Inspector */}
        <ProInspectorPane />
      </div>
    </div>
  );
};
