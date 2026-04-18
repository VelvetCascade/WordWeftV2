
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import { proDb } from '../../utils/proDb';
import type { WritingSession } from '../../types/pro';

// ═══════════════════════════════════════════════════════════════
//   Writing Analytics Page
// ═══════════════════════════════════════════════════════════════
export const ProAnalyticsPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, scenes, chapters, volumes, characters, worldEntries, relations } = useProStudio();
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const graphRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    openProject(projectId).then(() =>
      proDb.sessions.getByProject(projectId).then(s => {
        setSessions(s.sort((a, b) => a.date.localeCompare(b.date)));
        setLoading(false);
      })
    );
  }, [projectId]);

  // Project-level stats
  const totalWords = scenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);
  const totalScenes = scenes.length;
  const totalChapters = chapters.length;
  const totalVolumes = volumes.length;
  const avgWordsPerScene = totalScenes ? Math.round(totalWords / totalScenes) : 0;
  const avgWordsPerChapter = totalChapters ? Math.round(totalWords / totalChapters) : 0;

  // Status breakdown
  const sceneStatuses = useMemo(() => {
    const map: Record<string, number> = {};
    scenes.forEach(s => { map[s.status] = (map[s.status] || 0) + 1; });
    return map;
  }, [scenes]);

  const chapterStatuses = useMemo(() => {
    const map: Record<string, number> = {};
    chapters.forEach(c => { map[c.status] = (map[c.status] || 0) + 1; });
    return map;
  }, [chapters]);

  // Completeness bars
  const statusColors: Record<string, string> = {
    empty: '#5D4037', outline: '#8D6E63', draft: '#FFA000', revised: '#2196F3', final: '#4CAF50',
  };

  // Session analytics — last 30 days
  const last30 = useMemo(() => {
    const days: { date: string; words: number; minutes: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.date === dateStr);
      days.push({
        date: dateStr,
        words: daySessions.reduce((s, ss) => s + ss.wordsWritten, 0),
        minutes: daySessions.reduce((s, ss) => s + ss.minutesSpent, 0),
      });
    }
    return days;
  }, [sessions]);

  const maxDailyWords = Math.max(1, ...last30.map(d => d.words));
  const totalSessionWords = sessions.reduce((s, ss) => s + ss.wordsWritten, 0);
  const totalSessionMinutes = sessions.reduce((s, ss) => s + ss.minutesSpent, 0);
  const streak = useMemo(() => {
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (sessions.some(s => s.date === dateStr && s.wordsWritten > 0)) count++;
      else break;
    }
    return count;
  }, [sessions]);

  // Simulate a session for demo purposes
  const logSession = async () => {
    const s = await proDb.sessions.create({
      projectId,
      wordsWritten: Math.floor(Math.random() * 1500) + 200,
      minutesSpent: Math.floor(Math.random() * 90) + 15,
      scenesEdited: scenes.slice(0, Math.ceil(Math.random() * 3)).map(s => s.id),
    });
    setSessions(prev => [...prev, s].sort((a, b) => a.date.localeCompare(b.date)));
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
          <span className="pro-topbar-breadcrumb-item active">Analytics</span>
        </div>
        <div className="pro-topbar-actions">
          <button className="pro-btn pro-btn-ghost" style={{ fontSize: 11, height: 32 }} onClick={logSession}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Log Session
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px', background: 'var(--pro-bg)' }}>
        {/* Hero Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14,
          marginBottom: 32,
        }}>
          {[
            { label: 'Total Words', value: totalWords.toLocaleString(), icon: '📝', accent: 'var(--pro-accent)' },
            { label: 'Scenes', value: totalScenes.toString(), icon: '🎬', accent: '#FFA000' },
            { label: 'Chapters', value: totalChapters.toString(), icon: '📖', accent: '#2196F3' },
            { label: 'Characters', value: characters.length.toString(), icon: '👤', accent: '#E91E63' },
            { label: 'World Entries', value: worldEntries.length.toString(), icon: '🌍', accent: '#4CAF50' },
            { label: 'Relations', value: relations.length.toString(), icon: '🕸️', accent: '#7E57C2' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
              borderRadius: 12, padding: '18px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, fontFamily: "'Literata', serif" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--pro-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Writing Activity (Heatmap bars) */}
        <div style={{
          background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
          borderRadius: 12, padding: '24px 28px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>Writing Activity</div>
              <div style={{ fontSize: 11, color: 'var(--pro-text-muted)', marginTop: 2 }}>Last 30 days</div>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--pro-accent)', fontFamily: "'Literata', serif" }}>{streak}</div>
                <div style={{ color: 'var(--pro-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em' }}>Day Streak 🔥</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--pro-text-body)', fontFamily: "'Literata', serif" }}>{totalSessionWords.toLocaleString()}</div>
                <div style={{ color: 'var(--pro-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em' }}>Session Words</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--pro-text-body)', fontFamily: "'Literata', serif" }}>{Math.round(totalSessionMinutes / 60)}h</div>
                <div style={{ color: 'var(--pro-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em' }}>Total Time</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120 }}>
            {last30.map((d, i) => {
              const h = Math.max(2, (d.words / maxDailyWords) * 100);
              const date = new Date(d.date);
              return (
                <div key={d.date} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <div style={{
                    width: '100%', height: `${h}%`, minHeight: 2,
                    borderRadius: 3,
                    background: d.words > 0
                      ? `linear-gradient(to top, rgba(141,110,99,0.6), rgba(255,160,0,${Math.min(1, d.words / maxDailyWords * 1.2)}))`
                      : 'var(--pro-surface-3)',
                    transition: 'height 0.3s ease',
                  }} title={`${d.date}: ${d.words} words`} />
                  {i % 7 === 0 && <span style={{ fontSize: 8, color: 'var(--pro-text-muted)' }}>{date.getDate()}/{date.getMonth() + 1}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Scene Status Breakdown */}
          <div style={{
            background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
            borderRadius: 12, padding: '24px 28px',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif", marginBottom: 14 }}>
              Scene Progress
            </div>
            {(['empty', 'outline', 'draft', 'revised', 'final'] as const).map(s => {
              const count = sceneStatuses[s] || 0;
              const pct = totalScenes > 0 ? (count / totalScenes) * 100 : 0;
              return (
                <div key={s} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: 'var(--pro-text-body)', fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>
                    <span style={{ color: 'var(--pro-text-muted)' }}>{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--pro-surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 3,
                      background: statusColors[s], transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chapter Word Count Breakdown */}
          <div style={{
            background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)',
            borderRadius: 12, padding: '24px 28px',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif", marginBottom: 14 }}>
              Words per Chapter
            </div>
            {chapters.slice(0, 10).map(ch => {
              const chScenes = scenes.filter(s => s.chapterId === ch.id);
              const wc = chScenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);
              const maxWc = Math.max(1, ...chapters.map(c => scenes.filter(s => s.chapterId === c.id).reduce((s, sc) => s + (sc.wordCount || 0), 0)));
              const pct = (wc / maxWc) * 100;
              return (
                <div key={ch.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: 'var(--pro-text-body)', fontWeight: 600, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                    <span style={{ color: 'var(--pro-text-muted)' }}>{wc.toLocaleString()} words</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--pro-surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 3,
                      background: 'linear-gradient(90deg, #8D6E63, #FFA000)', transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
            {chapters.length === 0 && <div style={{ fontSize: 12, color: 'var(--pro-text-muted)' }}>No chapters yet</div>}
          </div>
        </div>

        {/* Average stats footer */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18,
        }}>
          <div style={{ background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>{avgWordsPerScene.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--pro-text-muted)', fontWeight: 700 }}>AVG WORDS/SCENE</div>
          </div>
          <div style={{ background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>{avgWordsPerChapter.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--pro-text-muted)', fontWeight: 700 }}>AVG WORDS/CHAPTER</div>
          </div>
          <div style={{ background: 'var(--pro-surface)', border: '1px solid var(--pro-border-subtle)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--pro-text-rich)', fontFamily: "'Literata', serif" }}>{totalVolumes}</div>
            <div style={{ fontSize: 10, color: 'var(--pro-text-muted)', fontWeight: 700 }}>VOLUMES</div>
          </div>
        </div>
      </div>
    </div>
  );
};
