import React, { useState } from 'react';
import * as api from '../../api/community';
import type { CommunityMe, Interest } from '../../types/community';
import { communityError } from '../../utils/community';
import { CommunityModal } from './CommunityShared';

export const CommunitySettings: React.FC<{ me: CommunityMe; onSaved: (me: CommunityMe) => void; onClose: () => void }> = ({ me, onSaved, onClose }) => {
  const [interests, setInterests] = useState<Interest[]>(me.interests);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const labels: Record<Interest, string> = { READING: 'Reader', WEBNOVEL_WRITING: 'Web-novel writer', EBOOK_PUBLISHING: 'E-book writer', WRITING_CRAFT: 'Writing craft', CRITIQUE: 'Critique' };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending) return; setPending(true); setError('');
    try { onSaved(await api.setInterests(interests)); onClose(); } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  return <CommunityModal title="More than one kind of storyteller." onClose={onClose} busy={pending}><form className="community-dialog-body" onSubmit={save}><p>Choose all that feel like you. These interests describe you; they don’t grant or restrict access. Your badges and staff permissions are managed separately.</p><fieldset className="community-interest-options"><legend>Your community interests</legend>{(Object.keys(labels) as Interest[]).map(interest => <label key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={event => setInterests(previous => event.target.checked ? [...previous, interest] : previous.filter(item => item !== interest))} /><span>{labels[interest]}</span></label>)}</fieldset>{error && <p className="community-error" role="alert">{error}</p>}<div className="community-dialog-actions"><button type="button" className="community-button" disabled={pending} onClick={onClose}>Cancel</button><button className="community-button primary" disabled={pending}>{pending ? 'Saving…' : 'Save interests'}</button></div></form></CommunityModal>;
};
