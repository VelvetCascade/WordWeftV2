import React, { useEffect, useState } from 'react';
import * as api from '../../api/community';
import type { ModerationReport } from '../../types/community';
import { communityError } from '../../utils/community';
import { CommunityEmpty, CommunityError, CommunityLoading, CommunityModal } from './CommunityShared';

export const CommunityModeration = () => {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<{ report: ModerationReport; resolution: 'DISMISS' | 'REMOVE' } | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); api.getReports(controller.signal).then(setReports).catch(err => { if (!controller.signal.aborted) setError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [retry]);
  const resolve = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selection || !reason.trim() || pending) return; setPending(true); setError('');
    try { await api.resolveReport(selection.report.id, selection.resolution, reason.trim()); setReports(previous => previous.filter(report => report.id !== selection.report.id)); setSelection(null); } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  return <section className="community-moderation"><h2>Moderation desk</h2><p className="community-muted">Pending community reports · Reporter identities stay private.</p>{loading ? <CommunityLoading /> : reports.map(report => <article className="community-report" key={report.id}><small>{report.ticketNumber} · {report.category.replaceAll('_', ' ')}</small><h3>{report.targetTitle}</h3><p className="community-post-body">{report.description || 'No additional context supplied.'}</p><div className="community-dialog-actions"><a className="community-button" href={`#/community/post/${encodeURIComponent(report.postId)}`}>View discussion</a><button className="community-button" onClick={() => { setReason(''); setError(''); setSelection({ report, resolution: 'DISMISS' }); }}>Dismiss</button><button className="community-button" onClick={() => { setReason(''); setError(''); setSelection({ report, resolution: 'REMOVE' }); }}>Remove content</button></div></article>)}{!loading && !reports.length && !error && <CommunityEmpty title="The queue is clear.">There are no pending community reports.</CommunityEmpty>}{error && !selection && <CommunityError message={error} onRetry={() => setRetry(value => value + 1)} />}{selection && <CommunityModal title={selection.resolution === 'DISMISS' ? 'Dismiss report' : 'Remove reported content'} onClose={() => setSelection(null)} busy={pending}><form className="community-dialog-body" onSubmit={resolve}><p>{selection.report.targetTitle}</p><label className="community-field">Resolution reason<textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>{error && <p className="community-error" role="alert">{error}</p>}<div className="community-dialog-actions"><button type="button" className="community-button" disabled={pending} onClick={() => setSelection(null)}>Cancel</button><button className="community-button primary" disabled={pending || !reason.trim()}>{pending ? 'Resolving…' : 'Confirm resolution'}</button></div></form></CommunityModal>}</section>;
};
