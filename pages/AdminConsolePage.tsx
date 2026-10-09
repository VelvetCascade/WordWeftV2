import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, BookOpen, CheckCircle2, ClipboardList,
  FileText, LayoutDashboard, LockKeyhole, RefreshCw, Search, Settings2,
  ShieldAlert, ShieldCheck, Users, XCircle } from 'lucide-react';
import {
  getAdminOverview, getAdminReports, getAdminStories, getAdminUsers, resolveAdminReport,
  type AdminOverview, type AdminPage, type AdminReport, type AdminStory, type AdminUser,
} from '../api/adminConsole';
import '../styles/admin-console.css';

type Section = 'overview' | 'members' | 'stories' | 'reports' | 'settings';

const sections: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'stories', label: 'Stories', icon: BookOpen },
  { key: 'reports', label: 'Reports', icon: ShieldAlert },
  { key: 'settings', label: 'Operations', icon: Settings2 },
];

const number = (value: number | null | undefined) => new Intl.NumberFormat('en-US').format(value ?? 0);
const date = (value?: string | null) => value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Not recorded';

const Loading = () => <div className="ac-state" role="status"><RefreshCw className="ac-spin" size={22} /><p>Loading live data…</p></div>;
const ErrorState = ({ message, retry }: { message: string; retry: () => void }) =>
  <div className="ac-state" role="alert"><ShieldAlert size={25} /><h3>Couldn't load this section</h3><p>{message}</p><button onClick={retry} type="button">Try again</button></div>;
const Badge = ({ text, tone }: { text: string; tone?: string }) => <span className={`ac-badge ${tone || text.toLowerCase()}`}>{text}</span>;
const Pager = ({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (value: number) => void }) => (
  <nav className="ac-pager" aria-label="Table pages">
    <span>{total === 0 ? 'No results' : `${page * size + 1}–${Math.min((page + 1) * size, total)} of ${number(total)}`}</span>
    <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button>
    <button type="button" disabled={(page + 1) * size >= total} onClick={() => onChange(page + 1)}>Next</button>
  </nav>
);

const Metric = ({ label, value, detail }: { label: string; value: number; detail: string }) => (
  <div className="ac-metric">
    <span>{label}</span>
    <strong>{number(value)}</strong>
    <small>{detail}</small>
  </div>
);

function Overview({ data, navigate }: { data: AdminOverview; navigate: (section: Section) => void }) {
  const maximum = Math.max(1, ...data.activity.map(item => Math.max(item.signups, item.stories)));
  return <>
    <div className="ac-metrics">
      <Metric label="Total members" value={data.users} detail={`+${number(data.newUsers7d)} in the last 7 days`} />
      <Metric label="Active authors" value={data.authors} detail="With at least one published story" />
      <Metric label="Published stories" value={data.publishedStories} detail={`${number(data.draftStories)} drafts across the platform`} />
      <Metric label="Published chapters" value={data.publishedChapters} detail="Currently visible chapters" />
      <Metric label="Total story reads" value={data.totalReads} detail="Recorded book read count" />
      <Metric label="New stories" value={data.newStories7d} detail="Created in the last 7 days" />
    </div>
    <div className="ac-panels">
      <section className="ac-panel ac-activity">
        <div className="ac-panel-heading"><div><span className="ac-kicker">Last seven days</span><h2>Platform activity</h2></div><Activity size={19} /></div>
        <div className="ac-chart-legend"><span><i className="ac-dot signups" /> Signups</span><span><i className="ac-dot stories" /> New stories</span></div>
        <div className="ac-chart" role="img" aria-label={data.activity.map(item => `${item.day}: ${item.signups} signups, ${item.stories} stories`).join('; ')}>
          {data.activity.map(item => <div className="ac-chart-day" key={item.day}>
            <div className="ac-chart-bars">
              <div className="ac-bar signups" style={{ height: `${Math.max(3, item.signups / maximum * 100)}%` }} title={`${item.signups} signups`} />
              <div className="ac-bar stories" style={{ height: `${Math.max(3, item.stories / maximum * 100)}%` }} title={`${item.stories} stories`} />
            </div>
            <span>{new Date(item.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
          </div>)}
        </div>
      </section>
      <section className="ac-panel">
        <div className="ac-panel-heading"><div><span className="ac-kicker">Action required</span><h2>Review queue</h2></div><ClipboardList size={19} /></div>
        <button className="ac-queue-row" type="button" onClick={() => navigate('reports')}>
          <span className="ac-queue-icon"><ShieldAlert size={20} /></span><span><strong>Content reports</strong><small>Review member-submitted reports</small></span>
          <b>{number(data.pendingReports)}</b><ArrowRight size={17} />
        </button>
        <a className="ac-queue-row" href="/admin/founding-writers">
          <span className="ac-queue-icon"><FileText size={20} /></span><span><strong>Founding Writer applications</strong><small>Screen applicants and manuscripts</small></span>
          <b>{number(data.pendingApplications)}</b><ArrowRight size={17} />
        </a>
        <div className="ac-quiet-summary"><CheckCircle2 size={18} /><span>{number(data.verifiedUsers)} verified accounts · {number(data.applications)} writer applications received</span></div>
      </section>
    </div>
    <section className="ac-panel ac-summary">
      <div><span className="ac-kicker">Catalog snapshot</span><h2>What's on WordWeft</h2><p>Live counts from the production database, not sample traffic or analytics estimates.</p></div>
      <div className="ac-breakdown"><div><strong>{number(data.stories)}</strong><span>All stories</span></div><div><strong>{number(data.publishedStories)}</strong><span>Published</span></div><div><strong>{number(data.draftStories)}</strong><span>Drafts</span></div></div>
      <button type="button" className="ac-text-button" onClick={() => navigate('stories')}>Browse story directory <ArrowRight size={17} /></button>
    </section>
  </>;
}

function Directory<T>({ heading, description, placeholder, filterOptions, filter, onFilter, query, onQuery,
  pageData, page, onPage, loading, error, onRetry, children }: {
    heading: string; description: string; placeholder: string;
    filterOptions: { value: string; label: string }[]; filter: string; onFilter: (value: string) => void;
    query: string; onQuery: (value: string) => void; pageData: AdminPage<T> | null;
    page: number; onPage: (page: number) => void; loading: boolean; error: string; onRetry: () => void;
    children: React.ReactNode;
  }) {
  return <section className="ac-panel ac-directory">
    <div className="ac-panel-heading"><div><span className="ac-kicker">Directory</span><h2>{heading}</h2><p>{description}</p></div><span className="ac-count">{number(pageData?.total)}</span></div>
    <div className="ac-filters">
      <label className="ac-search"><Search size={18} /><input value={query} onChange={event => onQuery(event.target.value)} placeholder={placeholder} maxLength={80} aria-label={placeholder} /></label>
      <label className="ac-select"><span>Filter</span><select value={filter} onChange={event => onFilter(event.target.value)}>{filterOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={onRetry} /> : <>
      <div className="ac-table-scroll">{children}</div>
      {pageData && <Pager page={page} size={pageData.size} total={pageData.total} onChange={onPage} />}
    </>}
  </section>;
}

export const AdminConsolePage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [section, setSection] = useState<Section>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminPage<AdminUser> | null>(null);
  const [stories, setStories] = useState<AdminPage<AdminStory> | null>(null);
  const [reports, setReports] = useState<AdminPage<AdminReport> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const navigate = useCallback((target: Section) => {
    setSection(target); setPage(0); setFilter(target === 'reports' ? 'PENDING' : 'ALL');
    setQuery(''); setDebouncedQuery(''); setError(''); setActionMessage('');
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query); setPage(0); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!isAdmin || section === 'settings') return;
    let active = true;
    setLoading(true); setError('');
    const request: Promise<AdminOverview | AdminPage<AdminUser> | AdminPage<AdminStory> | AdminPage<AdminReport>> = section === 'overview' ? getAdminOverview()
      : section === 'members' ? getAdminUsers(page, debouncedQuery, filter)
      : section === 'stories' ? getAdminStories(page, debouncedQuery, filter)
      : getAdminReports(page, filter);
    void request.then(result => {
      if (!active) return;
      if (section === 'overview') setOverview(result as AdminOverview);
      if (section === 'members') setUsers(result as AdminPage<AdminUser>);
      if (section === 'stories') setStories(result as AdminPage<AdminStory>);
      if (section === 'reports') setReports(result as AdminPage<AdminReport>);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load the data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAdmin, section, page, filter, debouncedQuery, reload]);

  const review = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    if (reason.trim().length < 10 || saving) return;
    if (!window.confirm(`Mark this report as ${status.toLowerCase()}? This action will be recorded.`)) return;
    setSaving(true); setActionMessage('');
    try {
      await resolveAdminReport(id, status, reason.trim());
      setReason(''); setReviewId(null); setActionMessage('The report has been reviewed and recorded.');
      setReload(value => value + 1);
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : 'Could not update report.');
    } finally { setSaving(false); }
  };

  if (!isAdmin) return <div className="ac-denied"><LockKeyhole size={32} /><h1>Administrator access required</h1><p>This private area is only available to WordWeft administrators.</p><a href="/">Return to WordWeft</a></div>;

  return <div className="ac-shell">
    <aside className="ac-sidebar" aria-label="Admin console navigation">
      <a className="ac-brand" href="/"><span className="ac-brand-mark">W</span><span>WordWeft<small>Administration</small></span></a>
      <div className="ac-sidebar-label">WORKSPACE</div>
      <nav className="ac-sidebar-links" aria-label="Admin sections">
        {sections.map(item => <button key={item.key} type="button" className={section === item.key ? 'active' : ''} onClick={() => navigate(item.key)} aria-current={section === item.key ? 'page' : undefined}>
          <item.icon size={18} /> {item.label} {item.key === 'reports' && overview && overview.pendingReports > 0 && <span className="ac-nav-count">{overview.pendingReports}</span>}
        </button>)}
        <a href="/admin/founding-writers"><FileText size={18} /> Writer applications <ArrowDownRight size={15} /></a>
      </nav>
      <div className="ac-sidebar-footer"><ShieldCheck size={18} /><span>Private workspace<small>Restricted to ROLE_ADMIN</small></span></div>
      <a className="ac-back" href="/">← Back to WordWeft</a>
    </aside>

    <main className="ac-main">
      <header className="ac-topbar"><span><span className="ac-live-dot" /> Production workspace</span><button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} className={loading ? 'ac-spin' : ''} /> Refresh</button></header>
      <div className="ac-content">
        <div className="ac-intro"><div><p className="ac-kicker">WORDWEFT / ADMINISTRATION</p><h1>{sections.find(item => item.key === section)?.label}</h1><p>{section === 'overview' ? 'A clear view of the people, stories and activity behind the platform.'
          : section === 'members' ? 'Find accounts, check verification and see publishing activity.'
          : section === 'stories' ? 'Inspect published work and drafts without opening private manuscripts.'
          : section === 'reports' ? 'Review safety reports with a recorded decision and reason.'
          : 'Security, access and the tools running the platform.'}</p></div>
          <span className="ac-as-of">{overview ? `Updated ${date(overview.generatedAt)}` : 'Live production data'}</span>
        </div>

        {section === 'overview' && (loading && !overview ? <Loading /> : error ? <ErrorState message={error} retry={() => setReload(v => v + 1)} /> : overview ? <Overview data={overview} navigate={navigate} /> : <Loading />)}

        {section === 'members' && <Directory heading="Member directory" description="Results show only operational account fields. Passwords and private profile data are never returned."
          placeholder="Search name or email" query={query} onQuery={setQuery} filter={filter} onFilter={value => { setFilter(value); setPage(0); }}
          filterOptions={[{ value: 'ALL', label: 'All members' }, { value: 'ROLE_ADMIN', label: 'Admins' }, { value: 'ROLE_MODERATOR', label: 'Moderators' }, { value: 'ROLE_USER', label: 'Regular members' }]}
          page={page} onPage={setPage} pageData={users} loading={loading} error={error} onRetry={() => setReload(v => v + 1)}>
          <table className="ac-table"><thead><tr><th>Member</th><th>Access</th><th>Joined</th><th>Verification</th><th>Published</th><th>Profile</th></tr></thead><tbody>
            {users?.items.map(user => <tr key={user.id}><td><div className="ac-person"><span className="ac-initial">{user.username?.slice(0, 1).toUpperCase() || '?'}</span><div><strong>{user.username}</strong><small>{user.email}</small></div></div></td>
              <td><Badge text={user.roles?.includes('ROLE_ADMIN') ? 'Admin' : user.roles?.includes('ROLE_MODERATOR') ? 'Moderator' : 'Member'} /></td>
              <td>{date(user.joinedAt)}</td><td><Badge text={user.emailVerified ? 'Verified' : 'Unverified'} /></td>
              <td>{number(user.publishedStories)}</td><td><a className="ac-table-link" href={`/author/${encodeURIComponent(user.id)}`} target="_blank" rel="noopener noreferrer">View <ArrowRight size={15} /></a></td></tr>)}
            {!users?.items.length && <tr><td colSpan={6} className="ac-empty">No members match your search.</td></tr>}
          </tbody></table>
        </Directory>}

        {section === 'stories' && <Directory heading="Story directory" description="Find titles, publishing state, chapters and readership. Private chapter text is not loaded."
          placeholder="Search story title" query={query} onQuery={setQuery} filter={filter} onFilter={value => { setFilter(value); setPage(0); }}
          filterOptions={[{ value: 'ALL', label: 'All stories' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }]}
          page={page} onPage={setPage} pageData={stories} loading={loading} error={error} onRetry={() => setReload(v => v + 1)}>
          <table className="ac-table"><thead><tr><th>Story</th><th>Status</th><th>Chapters</th><th>Reads</th><th>Views</th><th>Created</th><th>Details</th></tr></thead><tbody>
            {stories?.items.map(story => <tr key={story.id}>
              <td><div className="ac-story"><span className="ac-story-cover">{story.coverUrl ? <img src={story.coverUrl} alt="" loading="lazy" /> : <BookOpen size={20} />}</span><div><strong>{story.title || 'Untitled story'}</strong><small>by {story.authorName} · {story.category || 'Uncategorized'}</small></div></div></td>
              <td><Badge text={story.status || 'draft'} /></td>
              <td>{story.publishedChapters}/{story.chapters}</td><td>{number(story.reads)}</td><td>{number(story.views)}</td><td>{date(story.createdAt)}</td>
              <td>{story.status === 'published' ? <a className="ac-table-link" href={`/book/${encodeURIComponent(story.id)}`} target="_blank" rel="noopener noreferrer">Open <ArrowRight size={15} /></a> : <span className="ac-muted">Private draft</span>}</td>
            </tr>)}
            {!stories?.items.length && <tr><td colSpan={7} className="ac-empty">No stories match your search.</td></tr>}
          </tbody></table>
        </Directory>}

        {section === 'reports' && <section className="ac-panel ac-directory">
          <div className="ac-panel-heading"><div><span className="ac-kicker">Trust and safety</span><h2>Content reports</h2><p>Review reports individually. Decisions are recorded with your administrator ID.</p></div><span className="ac-count">{number(reports?.total)}</span></div>
          <div className="ac-filters"><label className="ac-select"><span>Status</span><select value={filter} onChange={event => { setFilter(event.target.value); setPage(0); setReviewId(null); }}>
            {[['PENDING','Pending'],['ALL','All'],['RESOLVED','Resolved'],['DISMISSED','Dismissed']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </select></label></div>
          {actionMessage && <p className="ac-action-message" role="status">{actionMessage}</p>}
          {loading ? <Loading /> : error ? <ErrorState message={error} retry={() => setReload(v => v + 1)} /> : <>
            <div className="ac-reports">{reports?.items.map(report => <article key={report.id} className="ac-report">
              <div className="ac-report-head"><span className="ac-kicker">{report.ticketNumber} · {date(report.createdAt)}</span><Badge text={report.status} /></div>
              <h3>{report.targetTitle || report.targetType}</h3>
              <p>{report.category} · Reported member: {report.reportedUsername || 'Unknown'} · Submitted by {report.reporterUsername || 'Unknown'}</p>
              <blockquote>{report.description || 'No additional details provided.'}</blockquote>
              {report.status === 'PENDING' ? <>
                {reviewId === report.id ? <div className="ac-review-form"><label htmlFor="ac-reason">Decision reason (required, minimum 10 characters)</label>
                  <textarea id="ac-reason" maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Write a specific reason for this decision." />
                  <div><button type="button" className="ac-primary" disabled={saving || reason.trim().length < 10} onClick={() => void review(report.id, 'RESOLVED')}><CheckCircle2 size={16} /> Resolve</button>
                  <button type="button" disabled={saving || reason.trim().length < 10} onClick={() => void review(report.id, 'DISMISSED')}><XCircle size={16} /> Dismiss</button>
                  <button type="button" onClick={() => { setReviewId(null); setReason(''); }}>Cancel</button></div></div>
                : <button className="ac-outline" type="button" onClick={() => { setReviewId(report.id); setReason(''); }}>Review report <ArrowRight size={16} /></button>}
              </> : <div className="ac-resolution"><CheckCircle2 size={16} /> {report.resolutionReason || 'Decision recorded.'}</div>}
            </article>)}
              {!reports?.items.length && <div className="ac-empty">No reports in this queue.</div>}
            </div>
            {reports && <Pager page={page} total={reports.total} size={reports.size} onChange={setPage} />}
          </>}
        </section>}

        {section === 'settings' && <div className="ac-settings-grid">
          <section className="ac-panel"><span className="ac-kicker">Account security</span><h2>Administrator access</h2><p>Only accounts with the server-assigned <code>ROLE_ADMIN</code> role can access the console APIs. No self-service role changes are available.</p><div className="ac-settings-foot"><LockKeyhole size={18} /> Access controlled by Spring Security</div></section>
          <section className="ac-panel"><span className="ac-kicker">Editorial workflow</span><h2>Founding Writers</h2><p>Review writer applications, download submitted manuscripts and manage application decisions in the existing review desk.</p><a className="ac-text-button" href="/admin/founding-writers">Open writer applications <ArrowRight size={17} /></a></section>
          <section className="ac-panel"><span className="ac-kicker">Platform moderation</span><h2>Report handling</h2><p>Each report can be resolved or dismissed once, with a reason and an admin audit ID. Content removal is a separate editorial action.</p><button className="ac-text-button" type="button" onClick={() => navigate('reports')}>Review report queue <ArrowRight size={17} /></button></section>
          <section className="ac-panel"><span className="ac-kicker">Deployment</span><h2>Operational configuration</h2><p>Infrastructure credentials, payment settings and secrets are intentionally not exposed or editable from the browser.</p><a className="ac-text-button" href="https://github.com/VelvetCascade/WordWeftV2/blob/production/docs/DEPLOYMENT.md" target="_blank" rel="noopener noreferrer">Deployment instructions <ArrowRight size={17} /></a></section>
        </div>}

        <footer className="ac-footer"><ShieldCheck size={15} /> Restricted administrative data · Do not share screenshots containing member emails.</footer>
      </div>
    </main>
  </div>;
};
