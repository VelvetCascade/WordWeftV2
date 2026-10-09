import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, X } from 'lucide-react';
import {
  moderateAdminStory, moderateAdminUser,
  type AdminModerationDecision, type AdminModerationResult,
} from '../../api/adminConsole';

export type AdminActionTarget = {
  kind: 'USER' | 'BOOK'; id: string; label: string;
  action: AdminModerationDecision['action']; reportId?: string;
};

export const AdminDecisionModal: React.FC<{
  target: AdminActionTarget; onClose: () => void;
  onComplete: (result: AdminModerationResult) => void;
}> = ({ target, onClose, onComplete }) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const focusRef = useRef<HTMLTextAreaElement>(null);
  const isRemoval = target.action === 'REMOVE' || target.action === 'SUSPEND';
  useEffect(() => {
    focusRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose, saving]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || reason.trim().length < 10) return;
    setSaving(true); setError('');
    const payload: AdminModerationDecision = {
      action: target.action, reason: reason.trim(), message: message.trim(),
      ...(target.reportId ? { reportId: target.reportId } : {}),
    };
    try {
      const result = await (target.kind === 'USER'
        ? moderateAdminUser(target.id, payload)
        : moderateAdminStory(target.id, payload));
      onComplete(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action could not be saved.');
    } finally { setSaving(false); }
  };
  return <div className="ac-dialog-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <section role="dialog" aria-modal="true" aria-labelledby="ac-decision-heading" className="ac-dialog">
      <header className="ac-dialog-header"><div><span className="ac-kicker">ADMINISTRATOR ACTION</span>
        <h2 id="ac-decision-heading">{target.action === 'SUSPEND' ? 'Suspend member' :
          target.action === 'REINSTATE' ? 'Reinstate member' :
          target.action === 'REMOVE' ? 'Remove story from public view' : 'Restore story visibility'}</h2>
      </div><button type="button" className="ac-dialog-close" aria-label="Close dialog" onClick={onClose} disabled={saving}><X size={19} /></button></header>
      <p className="ac-dialog-target">{target.kind === 'BOOK' ? 'Story' : 'Account'}: <strong>{target.label}</strong></p>
      <div className="ac-dialog-explainer">
        {isRemoval ? <AlertTriangle size={21} /> : <CheckCircle2 size={21} />}
        <p>{target.action === 'SUSPEND' ? 'This person will be signed out and unable to log in. Their books and content are not deleted.'
          : target.action === 'REINSTATE' ? 'This restores account sign-in access. Any separately removed stories stay removed.'
          : target.action === 'REMOVE' ? 'The story becomes unavailable to readers, but its manuscripts and history are retained for review.'
          : 'The story becomes visible again according to its existing publication settings.'}</p>
      </div>
      <form onSubmit={event => void submit(event)} className="ac-decision-form">
        <label htmlFor="ac-decision-reason">Reason for this action <strong>Required</strong></label>
        <textarea id="ac-decision-reason" ref={focusRef} minLength={10} maxLength={1000} required
          value={reason} onChange={event => setReason(event.target.value)}
          placeholder="Describe the policy issue, evidence, or reason for reversal." />
        <small>Saved to moderation history and included in the notification. At least 10 characters.</small>
        <label htmlFor="ac-decision-message">Custom message to the member <span>Optional</span></label>
        <textarea id="ac-decision-message" value={message} maxLength={2000}
          onChange={event => setMessage(event.target.value)}
          placeholder="Add a personal explanation, next steps, or an appeal invitation…" />
        <div className="ac-email-preview"><Mail size={19} /><span><strong>Email notification</strong>
          <small>A notice containing the reason and your custom message will be queued through WordWeft’s existing email service, if the member has an email address. Delivery is not guaranteed.</small></span></div>
        {error && <p className="ac-decision-error" role="alert">{error}</p>}
        <div className="ac-dialog-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className={isRemoval ? 'ac-danger' : 'ac-primary'} disabled={saving || reason.trim().length < 10}>
            {saving ? 'Applying action…' : target.action === 'SUSPEND' ? 'Suspend member'
              : target.action === 'REINSTATE' ? 'Reinstate member'
              : target.action === 'REMOVE' ? 'Remove from public view' : 'Restore story'}
          </button>
        </div>
      </form>
    </section>
  </div>;
};
