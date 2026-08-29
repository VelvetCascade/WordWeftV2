import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import * as api from '../../api/community';
import type { AttachmentChoice, Circle, CommunityPost, PostDraft, PostType } from '../../types/community';
import { communityError, composerDefaults, POST_LABELS, postPayload, validatePost, WARNING_LABELS } from '../../utils/community';
import { CommunityModal } from './CommunityShared';

interface Props { circles: Circle[]; initialCircleId?: string; initialType?: PostType; bookId?: string; chapterId?: string; editing?: CommunityPost; onClose: () => void; onSaved: (post: CommunityPost) => void }
export const CommunityComposer: React.FC<Props> = ({ circles, initialCircleId, initialType = 'UPDATE', bookId, chapterId, editing, onClose, onSaved }) => {
  const [draft, setDraft] = useState<PostDraft>(() => ({ ...composerDefaults(circles, editing?.circle.id || initialCircleId, editing?.type || initialType), title: editing?.title || '', body: editing?.body || '', contentWarnings: editing?.contentWarnings || [], pollOptions: ['', ''], chapterId }));
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState<AttachmentChoice[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const selectedCircle = circles.find(circle => circle.id === draft.circleId);
  const allowed = selectedCircle?.allowedPostTypes || Object.keys(POST_LABELS) as PostType[];
  const patch = (value: Partial<PostDraft>) => setDraft(previous => ({ ...previous, ...value }));
  useEffect(() => { if (!draft.circleId && circles.length) setDraft(previous => ({ ...previous, ...composerDefaults(circles, initialCircleId, previous.type) })); }, [circles, initialCircleId, draft.circleId]);
  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    setLookupLoading(true); setLookupError('');
    const timeout = window.setTimeout(() => {
      api.getAttachments({ q: query || undefined, owned: draft.type === 'RELEASE' ? true : undefined, bookId: !query && bookId ? bookId : undefined }, controller.signal).then(items => {
        const eligible = draft.type === 'RECOMMENDATION' ? items.filter(item => !item.owned) : items;
        setChoices(eligible);
        if (!query && bookId) {
          const initial = eligible.find(item => item.bookId === bookId);
          if (initial) setDraft(previous => ({ ...previous, attachment: initial, chapterId: initial.chapters.some(chapter => chapter.id === previous.chapterId) ? previous.chapterId : undefined }));
          else setLookupError('This story is not available for this format. Choose another published story.');
        }
      }).catch(err => { if (!controller.signal.aborted) setLookupError(communityError(err)); }).finally(() => { if (!controller.signal.aborted) setLookupLoading(false); });
    }, query ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [query, draft.type, bookId, editing]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending) return;
    const validation = validatePost(editing ? { ...draft, attachment: { owned: draft.type === 'RELEASE' } as AttachmentChoice, pollOptions: editing.pollOptions.map(option => option.text) } : draft);
    if (!editing && !allowed.includes(draft.type)) validation.type = 'Choose a format supported by this circle.';
    setErrors(validation); setError('');
    if (Object.keys(validation).length) return;
    setPending(true);
    try {
      const post = editing ? await api.editPost(editing.id, { title: draft.title?.trim() || undefined, body: draft.body.trim(), contentWarnings: draft.contentWarnings }) : await api.createPost(postPayload(draft));
      onSaved(post); onClose();
    } catch (err) { setError(communityError(err)); } finally { setPending(false); }
  };
  return <CommunityModal title={editing ? 'Edit your post' : 'Add to the conversation'} onClose={onClose} busy={pending}>
    <form className="community-composer" onSubmit={submit}>
      <p className="community-form-intro">A small update. A big question. A story worth sharing.</p>
      {!editing && <><label className="community-field">Circle<select value={draft.circleId} onChange={event => { const circle = circles.find(item => item.id === event.target.value); const type = circle?.allowedPostTypes.includes(draft.type) ? draft.type : circle?.allowedPostTypes[0] || 'UPDATE'; patch({ circleId: event.target.value, type, attachment: null, chapterId: undefined }); }} aria-invalid={!!errors.circleId}><option value="">Choose a circle</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select>{errors.circleId && <small className="community-field-error">{errors.circleId}</small>}</label>
      <fieldset className="community-formats"><legend>Post format</legend><div>{(Object.keys(POST_LABELS) as PostType[]).map(type => <button key={type} type="button" aria-pressed={draft.type === type} disabled={!allowed.includes(type)} onClick={() => patch({ type, attachment: null, chapterId: undefined })}>{POST_LABELS[type]}</button>)}</div>{errors.type && <small className="community-field-error">{errors.type}</small>}</fieldset></>}
      <label className="community-field">Title {['RELEASE', 'POLL', 'WORKSHOP'].includes(draft.type) ? '' : '(optional)'}<input value={draft.title} maxLength={140} onChange={event => patch({ title: event.target.value })} aria-invalid={!!errors.title} placeholder={draft.type === 'POLL' ? 'What would you like to ask?' : 'Give your conversation a heading'} />{errors.title && <small className="community-field-error">{errors.title}</small>}</label>
      <label className="community-field">Your post<textarea rows={6} maxLength={5000} value={draft.body} onChange={event => patch({ body: event.target.value })} placeholder={draft.type === 'WORKSHOP' ? 'Share an excerpt and tell us what kind of feedback would help.' : 'What’s on your reading or writing mind?'} aria-invalid={!!errors.body} /><small>{draft.body.length.toLocaleString()}/5,000 · Plain text</small>{errors.body && <small className="community-field-error">{errors.body}</small>}</label>
      {!editing && draft.type === 'POLL' && <fieldset className="community-poll-editor"><legend>Poll options</legend>{draft.pollOptions?.map((option, index) => <div key={index}><label className="community-field"><span className="sr-only">Option {index + 1}</span><input maxLength={100} value={option} placeholder={`Option ${index + 1}`} onChange={event => patch({ pollOptions: draft.pollOptions?.map((text, i) => i === index ? event.target.value : text) })} /></label>{draft.pollOptions!.length > 2 && <button type="button" className="community-icon-button" aria-label={`Remove option ${index + 1}`} onClick={() => patch({ pollOptions: draft.pollOptions?.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>}</div>)}{draft.pollOptions!.length < 6 && <button type="button" className="community-text-button" onClick={() => patch({ pollOptions: [...draft.pollOptions!, ''] })}><Plus size={15} /> Add option</button>}{errors.pollOptions && <small className="community-field-error">{errors.pollOptions}</small>}<small>One vote per person. Votes cannot be changed.</small></fieldset>}
      {!editing && <fieldset className="community-attachment-picker"><legend><BookOpen size={16} /> Attach a published story {['RELEASE', 'RECOMMENDATION'].includes(draft.type) ? '(required)' : '(optional)'}</legend>
        <label className="community-field"><span className="sr-only">Search published stories</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search stories by title…" /></label>
        {lookupLoading && <p role="status">Looking up stories…</p>}{lookupError && <p className="community-field-error" role="alert">{lookupError}</p>}
        <label className="community-field"><span className="sr-only">Choose story</span><select value={draft.attachment?.bookId || ''} onChange={event => patch({ attachment: choices.find(item => item.bookId === event.target.value) || null, chapterId: undefined })}><option value="">No story attached</option>{(draft.attachment && !choices.some(item => item.bookId === draft.attachment?.bookId) ? [draft.attachment, ...choices] : choices).map(item => <option key={item.bookId} value={item.bookId}>{item.title} — {item.authorName}</option>)}</select></label>
        {!lookupLoading && !choices.length && !lookupError && <p className="community-muted">No eligible published stories found.</p>}
        {draft.attachment && <label className="community-field">Chapter (optional)<select value={draft.chapterId || ''} onChange={event => patch({ chapterId: event.target.value || undefined })}><option value="">Whole story</option>{draft.attachment.chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>}{errors.attachment && <small className="community-field-error">{errors.attachment}</small>}
      </fieldset>}
      {editing && <p className="community-muted">The circle, format, attached story, and poll options cannot change after publishing.</p>}
      <fieldset className="community-warning-options"><legend>Content guidance</legend><p>Marked content stays hidden until a reader chooses to reveal it.</p><div>{Object.entries(WARNING_LABELS).map(([warning, label]) => <label key={warning}><input type="checkbox" checked={draft.contentWarnings?.includes(warning)} onChange={event => patch({ contentWarnings: event.target.checked ? [...draft.contentWarnings!, warning] : draft.contentWarnings?.filter(item => item !== warning) })} />{label}</label>)}</div></fieldset>
      {error && <p className="community-error" role="alert">{error}</p>}
      <div className="community-dialog-actions"><button type="button" className="community-button" disabled={pending} onClick={onClose}>Cancel</button><button type="submit" className="community-button primary" disabled={pending}>{pending ? 'Publishing…' : editing ? 'Save changes' : 'Publish post'}</button></div>
    </form>
  </CommunityModal>;
};
