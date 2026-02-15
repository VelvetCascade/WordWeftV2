import React, { useEffect, useMemo, useState } from 'react';
import type { User, IceWorkspace } from '../types';
import * as api from '../api/client';

interface ICEWorkspacePageProps {
  currentUser: User;
}

const severityColor: Record<string, string> = {
  low: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-rose-600',
};

export const ICEWorkspacePage: React.FC<ICEWorkspacePageProps> = ({ currentUser }) => {
  const [bookId, setBookId] = useState(currentUser.writtenBooks?.[0]?.id || '');
  const [workspace, setWorkspace] = useState<IceWorkspace | null>(null);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'creation' | 'analysis'>('creation');
  const [newEntityName, setNewEntityName] = useState('');
  const [newFeedback, setNewFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [exportText, setExportText] = useState('');

  useEffect(() => {
    if (!bookId) return;
    api.getIceWorkspace(bookId).then((data) => {
      setWorkspace(data);
      setDraft(data.manuscriptText || '');
      setMode(data.writingMode || 'creation');
    });
  }, [bookId]);

  const saveDraft = async (nextText: string, nextMode: 'creation' | 'analysis') => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const updated = await api.updateIceManuscript(bookId, nextText, nextMode);
      setWorkspace(updated);
      setDraft(updated.manuscriptText);
      setMode(updated.writingMode);
    } finally {
      setIsSaving(false);
    }
  };

  const pacing = workspace?.narrativeSignals.find((s) => s.label === 'Pacing')?.value ?? 0;
  const sentiment = workspace?.narrativeSignals.find((s) => s.label === 'Sentiment')?.value ?? 0;

  const highSeverityCount = useMemo(
    () => workspace?.feedbackInsights.filter((f) => f.severity === 'high').length ?? 0,
    [workspace],
  );

  if (!currentUser.writtenBooks?.length) {
    return <div className="p-8">Create a book first to use the ICE workspace.</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <section className="bg-white dark:bg-dark-surface border dark:border-dark-border rounded-2xl p-5">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrated Creative Environment</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">End-to-end story bible + manuscript intelligence workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="rounded-lg border dark:border-dark-border bg-transparent px-3 py-2"
            >
              {currentUser.writtenBooks.map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
            <div className="inline-flex rounded-lg overflow-hidden border dark:border-dark-border">
              <button
                className={`px-3 py-2 text-sm ${mode === 'creation' ? 'bg-accent text-white' : ''}`}
                onClick={() => { setMode('creation'); saveDraft(draft, 'creation'); }}
              >Creation</button>
              <button
                className={`px-3 py-2 text-sm ${mode === 'analysis' ? 'bg-accent text-white' : ''}`}
                onClick={() => { setMode('analysis'); saveDraft(draft, 'analysis'); }}
              >Analysis</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <article className="xl:col-span-2 bg-white dark:bg-dark-surface border dark:border-dark-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold">Manuscript Draft Lane</h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-72 rounded-xl border dark:border-dark-border bg-transparent p-4 font-serif"
            placeholder="Write your manuscript excerpt here..."
          />
          <div className="flex gap-3 items-center">
            <button onClick={() => saveDraft(draft, mode)} className="bg-accent text-white rounded-lg px-4 py-2 text-sm">Save Workspace</button>
            <p className="text-xs text-gray-500">{isSaving ? 'Saving…' : 'Synced with backend'}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-gray-100 dark:bg-dark-surface-alt p-3">Words: {draft.split(/\s+/).filter(Boolean).length}</div>
            <div className="rounded-lg bg-gray-100 dark:bg-dark-surface-alt p-3">Mentions: {workspace?.mentions.length || 0}</div>
            <div className="rounded-lg bg-gray-100 dark:bg-dark-surface-alt p-3">High Severity: {highSeverityCount}</div>
          </div>
        </article>

        <article className="bg-white dark:bg-dark-surface border dark:border-dark-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold">Story Bible</h2>
          <div className="space-y-2 max-h-80 overflow-auto">
            {workspace?.entities.map((entity) => (
              <div key={entity.id} className="rounded-lg border dark:border-dark-border p-2">
                <p className="text-xs uppercase text-gray-500">{entity.type}</p>
                <p className="font-medium">{entity.name}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)} placeholder="Add character/location" className="flex-1 rounded-lg border dark:border-dark-border px-3 py-2 bg-transparent"/>
            <button
              onClick={async () => {
                if (!newEntityName.trim() || !bookId) return;
                const updated = await api.addIceEntity(bookId, { name: newEntityName, type: 'character', summary: 'Added from UI' });
                setWorkspace(updated);
                setNewEntityName('');
              }}
              className="rounded-lg bg-gray-900 text-white px-3"
            >Add</button>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="bg-white dark:bg-dark-surface border dark:border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold mb-2">Messy Middle Navigator</h3>
          <p className="text-sm">Pacing: <strong>{pacing}</strong></p>
          <div className="w-full h-2 bg-gray-200 rounded mt-1"><div className="h-2 bg-accent rounded" style={{ width: `${pacing}%` }}></div></div>
          <p className="text-sm mt-3">Sentiment: <strong>{sentiment}</strong></p>
          <div className="w-full h-2 bg-gray-200 rounded mt-1"><div className="h-2 bg-emerald-500 rounded" style={{ width: `${sentiment}%` }}></div></div>
          <ul className="mt-3 text-sm space-y-1">
            {workspace?.timelineEvents.map((event) => <li key={event.id}>{event.sequence}. {event.label}</li>)}
          </ul>
        </article>

        <article className="lg:col-span-2 bg-white dark:bg-dark-surface border dark:border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold mb-2">Feedback Synthesis</h3>
          <div className="space-y-2 mb-3">
            {workspace?.feedbackInsights.map((feedback) => (
              <div key={feedback.id} className="rounded-lg border dark:border-dark-border p-3">
                <p className={`text-xs font-semibold ${severityColor[feedback.severity] || 'text-gray-500'}`}>{feedback.severity.toUpperCase()} · {feedback.thread}</p>
                <p className="text-sm">{feedback.summary}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newFeedback} onChange={(e) => setNewFeedback(e.target.value)} placeholder="Add synthesized feedback" className="flex-1 rounded-lg border dark:border-dark-border px-3 py-2 bg-transparent"/>
            <button
              onClick={async () => {
                if (!newFeedback.trim() || !bookId) return;
                const updated = await api.addIceFeedback(bookId, {
                  source: 'beta-reader', chapterId: 'draft', thread: 'General', severity: 'medium', summary: newFeedback, recommendation: 'Review and revise draft section.'
                });
                setWorkspace(updated);
                setNewFeedback('');
              }}
              className="rounded-lg bg-gray-900 text-white px-3"
            >Add</button>
            <button
              onClick={async () => {
                if (!bookId) return;
                const output = await api.exportIceWorkspace(bookId, 'epub');
                setExportText(output);
              }}
              className="rounded-lg bg-accent text-white px-3"
            >Export</button>
          </div>
          {exportText && <pre className="mt-3 text-xs bg-gray-900 text-white rounded p-3 overflow-auto">{exportText}</pre>}
        </article>
      </section>
    </div>
  );
};
