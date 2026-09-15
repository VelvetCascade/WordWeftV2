import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, ShieldAlert } from 'lucide-react';
import { getFoundingWriterApplications, updateFoundingWriterApplication } from '../api/client';
import type { FoundingWriterApplication, FoundingWriterApplicationStatus } from '../types';
import '../styles/founding-writers.css';

const statusLabels: Record<FoundingWriterApplicationStatus, string> = {
  PENDING: 'Pending', ACCEPTED: 'Accepted', REJECTED: 'Rejected',
};

const completionLabels: Record<FoundingWriterApplication['expectedCompletionPeriod'], string> = {
  LESS_THAN_2_MONTHS: 'Less than 2 months',
  TWO_TO_FOUR_MONTHS: '2–4 months',
  FOUR_TO_SIX_MONTHS: '4–6 months',
  MORE_THAN_6_MONTHS: 'More than 6 months',
};

const safeDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const ExternalLink: React.FC<{ href?: string; children: React.ReactNode }> = ({ href, children }) => href
  ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  : <>Not provided</>;

const ReviewCard: React.FC<{
  application: FoundingWriterApplication;
  onUpdated: (application: FoundingWriterApplication) => void;
}> = ({ application, onUpdated }) => {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.adminNotes || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateFoundingWriterApplication(application.id, status, notes);
      onUpdated(updated);
      setMessage('Review saved.');
    } catch {
      setMessage('The review could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="fw-admin-card">
      <summary>
        <div>
          <span className="fw-eyebrow">{application.genre} · submitted {safeDate(application.createdAt)}</span>
          <h2>{application.storyTitle}</h2>
          <p>{application.fullName}{application.penName ? ` · writing as ${application.penName}` : ''} · {application.email}</p>
        </div>
        <span className={`fw-admin-status ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span>
      </summary>
      <div className="fw-admin-body">
        <dl className="fw-admin-details">
          <div className="fw-admin-detail"><dt>Applicant</dt><dd>{application.fullName}</dd></div>
          <div className="fw-admin-detail"><dt>Pen name</dt><dd>{application.penName || 'Not provided'}</dd></div>
          <div className="fw-admin-detail"><dt>Country</dt><dd>{application.country}</dd></div>
          <div className="fw-admin-detail"><dt>Email</dt><dd><a href={`mailto:${application.email}`}>{application.email}</a></dd></div>
          <div className="fw-admin-detail"><dt>Public profile</dt><dd><ExternalLink href={application.instagramProfileUrl}>{application.instagramProfileUrl || 'Not provided'}</ExternalLink></dd></div>
          <div className="fw-admin-detail"><dt>Currently publishes</dt><dd>{application.existingPublishingPlatform || 'Not provided'}</dd></div>
          <div className="fw-admin-detail"><dt>Genre</dt><dd>{application.genre}</dd></div>
          <div className="fw-admin-detail"><dt>Drafted chapters</dt><dd>{application.draftedChapterCount}</dd></div>
          <div className="fw-admin-detail"><dt>Planned chapters</dt><dd>{application.plannedChapterCount}</dd></div>
          <div className="fw-admin-detail"><dt>Expected completion</dt><dd>{completionLabels[application.expectedCompletionPeriod]}</dd></div>
          <div className="fw-admin-detail"><dt>Writing sample link</dt><dd><ExternalLink href={application.writingSampleUrl}>{application.writingSampleUrl || 'Not provided'}</ExternalLink></dd></div>
          <div className="fw-admin-detail"><dt>Confirmations</dt><dd>Age, rights, completion, weekly publishing, earnings disclaimer, Terms and Privacy confirmed.</dd></div>
          <div className="fw-admin-detail fw-admin-detail-wide"><dt>Story description</dt><dd>{application.storyDescription}</dd></div>
          <div className="fw-admin-detail fw-admin-detail-wide"><dt>Pasted writing sample</dt><dd>{application.pastedWritingSample || 'Not provided'}</dd></div>
        </dl>
        <div className="fw-admin-review">
          <label className="fw-field">Application status<select value={status} onChange={event => setStatus(event.target.value as FoundingWriterApplicationStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="fw-field">Admin notes <small>Private</small><textarea maxLength={3000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
          <button className="fw-primary-button" type="button" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save review'} {!saving && <Check size={17} />}</button>
        </div>
        {message && <p className={message === 'Review saved.' ? 'fw-admin-save-success' : 'fw-form-error'} role="status">{message}</p>}
      </div>
    </details>
  );
};

export const FoundingWriterAdminPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [filter, setFilter] = useState<'ALL' | FoundingWriterApplicationStatus>('ALL');
  const [applications, setApplications] = useState<FoundingWriterApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setLoading(true);
    setError('');
    getFoundingWriterApplications(filter === 'ALL' ? undefined : filter)
      .then(result => { if (active) setApplications(result); })
      .catch(() => { if (active) setError('The application list could not be loaded. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, isAdmin, reload]);

  if (!isAdmin) {
    return <section className="fw-admin-page"><div className="fw-shell fw-admin-message"><ShieldAlert size={34} /><h2>Administrator access required</h2><p>This review desk is only available to WordWeft administrators.</p></div></section>;
  }

  return (
    <section className="fw-admin-page">
      <div className="fw-shell">
        <header className="fw-admin-header">
          <div><p className="fw-eyebrow">WordWeft administration</p><h1>Founding Writer applications</h1><p>Review each story proposal, keep private notes and move the application to Pending, Accepted or Rejected.</p></div>
          <button className="fw-secondary-button" type="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Refresh</button>
        </header>
        <nav className="fw-admin-filters" aria-label="Filter applications by status">
          {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map(value => <button type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === 'ALL' ? 'All applications' : statusLabels[value]}</button>)}
        </nav>
        {loading && <div className="fw-admin-message" role="status">Loading applications…</div>}
        {error && <div className="fw-admin-message" role="alert"><p>{error}</p><button className="fw-secondary-button" type="button" onClick={() => setReload(value => value + 1)}>Try again</button></div>}
        {!loading && !error && applications.length === 0 && <div className="fw-admin-message"><h2>No applications here yet</h2><p>{filter === 'ALL' ? 'Submitted applications will appear here.' : `There are no ${statusLabels[filter].toLowerCase()} applications.`}</p></div>}
        {!loading && !error && <div className="fw-admin-list">{applications.map(application => <ReviewCard key={application.id} application={application} onUpdated={updated => setApplications(current => current.map(item => item.id === updated.id ? updated : item).filter(item => filter === 'ALL' || item.status === filter))} />)}</div>}
      </div>
    </section>
  );
};
