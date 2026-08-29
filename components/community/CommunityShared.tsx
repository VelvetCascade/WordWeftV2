import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, BadgeCheck } from 'lucide-react';
import type { User } from '../../types';
import type { AuthorSummary } from '../../types/community';
import '../../styles/community.css';

export const CommunityModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; busy?: boolean }> = ({ title, onClose, children, busy = false }) => {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(element => !element.hidden && element.offsetParent !== null);
    (getFocusable()[0] || panel.current)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = getFocusable();
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); panel.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return createPortal(<div className="community-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={panel} tabIndex={-1} className="community-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="community-modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="community-icon-button" disabled={busy} onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>
      {children}
    </section>
  </div>, document.body);
};
const SessionContext = createContext<{ user: User | null; requireAuth: () => boolean }>({ user: null, requireAuth: () => false });
export const useCommunitySession = () => useContext(SessionContext);
export const CommunitySession: React.FC<{ user: User | null; onSignIn: () => void; children: React.ReactNode }> = ({ user, onSignIn, children }) => {
  const [signInOpen, setSignInOpen] = useState(false);
  return <SessionContext.Provider value={{ user, requireAuth: () => { if (user) return true; setSignInOpen(true); return false; } }}>
    {children}
    {signInOpen && <CommunityModal title="A good story starts a conversation." onClose={() => setSignInOpen(false)}><div className="community-dialog-body"><p>Sign in to join circles, share your writing, and talk with the people behind your next favorite story.</p><div className="community-dialog-actions"><button className="community-button" onClick={() => setSignInOpen(false)}>Keep exploring</button><button className="community-button primary" onClick={() => { setSignInOpen(false); onSignIn(); }}>Sign in to WordWeft</button></div></div></CommunityModal>}
  </SessionContext.Provider>;
};
export const CommunityAuthor: React.FC<{ author: AuthorSummary; date?: string }> = ({ author, date }) => <div className="community-author">
  <a href={`#/author/${encodeURIComponent(author.id)}`} className="community-avatar" aria-label={`${author.name}'s profile`}>{author.avatarUrl ? <img src={author.avatarUrl} alt="" loading="lazy" /> : author.name.charAt(0).toUpperCase()}</a>
  <div><a href={`#/author/${encodeURIComponent(author.id)}`} className="community-author-name">{author.name}</a><span className="community-badges">{author.badges.map(badge => <span key={badge} title={badge.replaceAll('_', ' ').toLowerCase()}><BadgeCheck size={13} aria-hidden="true" /><span>{badge === 'VERIFIED_CREATOR' ? 'Creator' : badge === 'EDITORIAL_STAFF' ? 'Editorial' : 'Moderator'}</span></span>)}</span>{date && <time dateTime={date}>{new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>}</div>
</div>;
export const CommunityEmpty: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <div className="community-empty"><MessageCircle size={30} strokeWidth={1.3} aria-hidden="true" /><h3>{title}</h3><p>{children}</p></div>;
export const CommunityLoading = () => <div className="community-loading" role="status" aria-label="Loading community"><span /><span /><span /><p>Gathering the conversation…</p></div>;
export const CommunityError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => <div className="community-error" role="alert"><p>{message}</p>{onRetry && <button className="community-button" onClick={onRetry}>Try again</button>}</div>;
