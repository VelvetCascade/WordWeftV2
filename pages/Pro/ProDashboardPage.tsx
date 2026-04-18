
import React, { useEffect, useState } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { WordWeftLogo } from '../../components/icons/WordWeftLogo';
import type { ProProject } from '../../types/pro';

// ─── Available Genres ─────────────────────────────────────────
const GENRES = [
  'Fantasy', 'Science Fiction', 'Literary Fiction', 'Thriller', 'Mystery',
  'Romance', 'Horror', 'Historical', 'Adventure', 'YA', 'Dystopian',
  'Magical Realism', 'Crime', 'Biography', 'Memoir', 'Non-Fiction',
  'Mythology', 'Cyberpunk', 'Steampunk', 'Dark Fantasy',
];

// ─── Empty state emoji per genre ─────────────────────────────
const GENRE_EMOJI: Record<string, string> = {
  'Fantasy': '⚔️', 'Science Fiction': '🚀', 'Literary Fiction': '📖',
  'Thriller': '🔪', 'Mystery': '🔍', 'Romance': '💕', 'Horror': '👻',
  'Historical': '🏛️', 'Adventure': '🗺️', 'YA': '🌟', 'Dystopian': '🏙️',
  'Magical Realism': '✨', 'Crime': '🕵️', 'Biography': '🎭',
  'Memoir': '📝', 'Non-Fiction': '📚', 'Mythology': '🌙',
  'Cyberpunk': '💻', 'Steampunk': '⚙️', 'Dark Fantasy': '🌑',
};

function projectEmoji(project: ProProject): string {
  if (project.genre.length > 0) return GENRE_EMOJI[project.genre[0]] || '📘';
  return '📘';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtWc(n: number): string {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

// ─── New Project Modal ────────────────────────────────────────
const NewProjectModal: React.FC<{ onClose: () => void; onCreate: (p: ProProject) => void }> = ({ onClose, onCreate }) => {
  const { createProject } = useProStudio();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [logline, setLogline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleGenre = (g: string) =>
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    const p = await createProject({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      genre: genres,
      bible: {
        logline: logline.trim(),
        synopsis: '',
        thematicStatement: '',
        worldRules: '',
        seriesNotes: '',
      },
    });
    setSubmitting(false);
    onCreate(p);
    onClose();
  };

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 className="pro-modal-title">New Project</h2>
            <p className="pro-modal-sub">Set up your author workspace</p>
          </div>
          <button className="pro-binder-icon-btn" onClick={onClose} style={{ marginTop: -4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="pro-form-field">
          <label className="pro-form-label">Title *</label>
          <input
            className="pro-form-input"
            placeholder="The Name of the Wind"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />
        </div>

        <div className="pro-form-field">
          <label className="pro-form-label">Subtitle</label>
          <input
            className="pro-form-input"
            placeholder="A Kingkiller Chronicle"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
          />
        </div>

        <div className="pro-form-field">
          <label className="pro-form-label">Genres</label>
          <div className="pro-genre-select">
            {GENRES.map(g => (
              <div
                key={g}
                className={`pro-genre-chip${genres.includes(g) ? ' selected' : ''}`}
                onClick={() => toggleGenre(g)}
              >
                {g}
              </div>
            ))}
          </div>
        </div>

        <div className="pro-form-field">
          <label className="pro-form-label">Logline</label>
          <textarea
            className="pro-form-textarea"
            placeholder="A young wizard discovers he is the chosen one…"
            value={logline}
            onChange={e => setLogline(e.target.value)}
            rows={2}
          />
        </div>

        <div className="pro-modal-footer">
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="pro-btn pro-btn-primary"
            onClick={handleCreate}
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Creating…' : 'Create Project →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Project Card ─────────────────────────────────────────────
const ProjectCard: React.FC<{ project: ProProject; wordCount: number; onOpen: () => void; onDelete: () => void }> = ({
  project, wordCount, onOpen, onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="pro-project-card" onClick={onOpen}>
      {/* Cover */}
      <div className="pro-project-card-cover">
        {project.coverUrl
          ? <>
              <img src={project.coverUrl} alt={project.title} className="pro-project-card-cover-img" />
              <div className="pro-project-card-cover-gradient" />
            </>
          : <div className="pro-project-card-cover-placeholder">{projectEmoji(project)}</div>
        }
        {/* Context menu trigger */}
        <button
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: 4, cursor: 'pointer', color: 'white', display: 'flex',
          }}
          onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
        {showMenu && (
          <div
            style={{
              position: 'absolute', top: 36, right: 8, zIndex: 20,
              background: 'var(--pro-surface-2)', border: '1px solid var(--pro-border)',
              borderRadius: 'var(--pro-radius)', padding: 4, minWidth: 140,
              boxShadow: 'var(--pro-shadow-lifted)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button className="pro-context-menu-item" onClick={() => { setShowMenu(false); onOpen(); }}>Open Project</button>
            <div className="pro-context-menu-sep" />
            <button className="pro-context-menu-item danger" onClick={() => { setShowMenu(false); onDelete(); }}>Delete Project</button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="pro-project-card-body">
        {project.genre.length > 0 && (
          <div className="pro-project-card-genres">
            {project.genre.slice(0, 2).map(g => <span key={g} className="pro-project-genre-pill">{g}</span>)}
          </div>
        )}
        <h3 className="pro-project-card-title">{project.title}</h3>
        {project.subtitle && (
          <p style={{ fontSize: 12, color: 'var(--pro-text-muted)', margin: '0 0 4px', overflow: 'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {project.subtitle}
          </p>
        )}
        {project.bible?.logline && (
          <p style={{ fontSize: 11, color: 'var(--pro-text-muted)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.bible.logline}
          </p>
        )}
        <div className="pro-project-card-meta">
          <div className="pro-project-card-wc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /></svg>
            <strong>{fmtWc(wordCount)}</strong> words
          </div>
          <span style={{ marginLeft: 'auto' }}>{fmtDate(project.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Pro Dashboard ────────────────────────────────────────────
export const ProDashboardPage: React.FC = () => {
  const { projects, loadProjects, deleteProject, scenes } = useProStudio();
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects().then(() => setLoading(false));
  }, []);

  const openProject = (id: string) => {
    window.location.hash = `/pro/studio/${id}`;
  };

  const handleDelete = async (project: ProProject) => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
  };

  const projectWordCount = (projectId: string): number => {
    return scenes.filter(s => s.projectId === projectId).reduce((sum, s) => sum + (s.wordCount || 0), 0);
  };

  return (
    <div className="pro-dashboard">
      {/* ── Header ── */}
      <header className="pro-dashboard-header">
        <a href="#/" className="pro-dashboard-logo" onClick={e => { e.preventDefault(); window.location.hash = '/'; }}>
          <WordWeftLogo className="w-8 h-8" />
          <span className="pro-dashboard-logo-text">WordWeft</span>
          <span className="pro-topbar-logo-badge" style={{ marginLeft: 6 }}>PRO</span>
        </a>

        <nav className="pro-dashboard-nav">
          <button className="pro-dashboard-nav-btn active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            Projects
          </button>
          <button className="pro-dashboard-nav-btn" onClick={() => window.location.hash = '/'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            Back to WordWeft
          </button>
        </nav>
      </header>

      {/* ── Body ── */}
      <main className="pro-dashboard-body">
        {/* Hero */}
        <div className="pro-dashboard-hero">
          <div className="pro-dashboard-hero-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" /></svg>
            Author Workspace
          </div>
          <h1 className="pro-dashboard-hero-title">Your Projects</h1>
          <p className="pro-dashboard-hero-sub">
            Manage series, volumes, and chapters with a professional-grade writing environment designed for serious authors.
          </p>
        </div>

        {/* Stats bar */}
        {projects.length > 0 && (
          <div style={{
            display: 'flex', gap: 20, marginBottom: 32, padding: '16px 20px',
            background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
            borderRadius: 'var(--pro-radius-lg)',
          }}>
            {[
              { label: 'Projects', value: projects.length },
              { label: 'Total Words', value: projects.reduce((s, p) => s + projectWordCount(p.id), 0).toLocaleString() },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--pro-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Projects section */}
        <div className="pro-projects-section-header">
          <span className="pro-projects-section-title">All Projects</span>
          <button className="pro-btn pro-btn-primary" onClick={() => setShowNewModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Project
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--pro-text-muted)', fontSize: 13 }}>
            Loading projects…
          </div>
        ) : (
          <div className="pro-projects-grid">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                wordCount={projectWordCount(p.id)}
                onOpen={() => openProject(p.id)}
                onDelete={() => handleDelete(p)}
              />
            ))}

            {/* New Project Card */}
            <div className="pro-new-project-card" onClick={() => setShowNewModal(true)}>
              <div className="pro-new-project-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <p className="pro-new-project-card-label">New Project</p>
              <p className="pro-new-project-card-sublabel">Start a new story universe</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
            borderRadius: 'var(--pro-radius-xl)', maxWidth: 480, margin: '0 auto',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📖</div>
            <h2 style={{ fontFamily: "'Literata', serif", fontSize: 24, color: 'var(--pro-text-rich)', margin: '0 0 8px' }}>
              Your story starts here
            </h2>
            <p style={{ fontSize: 14, color: 'var(--pro-text-muted)', marginBottom: 24 }}>
              Create your first project and begin building your world — characters, lore, maps, and your manuscript, all in one place.
            </p>
            <button className="pro-btn pro-btn-primary" onClick={() => setShowNewModal(true)} style={{ fontSize: 14, padding: '11px 24px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create Your First Project
            </button>
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={p => openProject(p.id)}
        />
      )}
    </div>
  );
};
