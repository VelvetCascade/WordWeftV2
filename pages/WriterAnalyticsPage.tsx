import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../api/client';
import type { WriterAnalytics, WriterStoryAnalytics } from '../types';
import { formatRate, normalizeDailyTrend } from '../utils/writerAnalytics';

const EMPTY_ANALYTICS: WriterAnalytics = {
    summary: {
        uniqueReaders: 0,
        views: 0,
        completedReaders: 0,
        completionRate: 0,
        returningReaders: 0,
        averageCompletion: 0,
        likes: 0,
        comments: 0,
    },
    stories: [],
    chapterFunnel: [],
    dailyTrend: [],
    referrers: [],
    releaseMarkers: [],
};

export const WriterAnalyticsPage: React.FC = () => {
    const [analytics, setAnalytics] = useState<WriterAnalytics>(EMPTY_ANALYTICS);
    const [storyOptions, setStoryOptions] = useState<WriterStoryAnalytics[]>([]);
    const [selectedBookId, setSelectedBookId] = useState(() => new URLSearchParams(window.location.search).get('book') || '');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!selectedBookId || storyOptions.length) return;
        let active = true;
        api.getWriterAnalytics().then(result => { if (active) setStoryOptions(result.stories); }).catch(() => {});
        return () => { active = false; };
    }, [selectedBookId]);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setError('');
        api.getWriterAnalytics(selectedBookId || undefined)
            .then(result => {
                if (!active) return;
                setAnalytics(result);
                if (!selectedBookId) setStoryOptions(result.stories);
            })
            .catch(failure => {
                if (active) setError(failure instanceof Error ? failure.message : 'Could not load analytics.');
            })
            .finally(() => active && setIsLoading(false));
        return () => { active = false; };
    }, [selectedBookId, refreshKey]);

    const trend = useMemo(() => normalizeDailyTrend(analytics.dailyTrend, 14), [analytics.dailyTrend]);
    const maxTrendValue = Math.max(1, ...trend.map(point => Math.max(point.readers, point.views)));
    const axisMax = Math.max(4, Math.ceil(maxTrendValue / 4) * 4);
    const releasesByDate = useMemo(() => {
        const releases = new Map<string, string[]>();
        analytics.releaseMarkers.forEach(marker => {
            const date = marker.publishedAt.slice(0, 10);
            releases.set(date, [...(releases.get(date) || []), marker.chapterTitle]);
        });
        return releases;
    }, [analytics.releaseMarkers]);

    if (isLoading) {
        return <div className="ww-analytics-state" role="status">Gathering your reader signals…</div>;
    }

    if (error) {
        return (
            <div className="ww-analytics-state is-error">
                <strong>Analytics could not load.</strong>
                <p>{error}</p>
                <button onClick={() => setRefreshKey(value => value + 1)}>Try again</button>
            </div>
        );
    }

    return (
        <div className="ww-writer-analytics">
            <header className="ww-analytics-header">
                <div>
                    <span>Reader growth</span>
                    <h1>Story statistics</h1>
                    <p>Where readers spend time with your work.</p>
                </div>
                <label>
                    Story
                    <select aria-label="Story" value={selectedBookId} onChange={event => setSelectedBookId(event.target.value)}>
                        <option value="">All stories</option>
                        {storyOptions.map(story => <option key={story.bookId} value={story.bookId}>{story.title}</option>)}
                    </select>
                </label>
            </header>

            {storyOptions.length === 0 ? (
                <section className="ww-analytics-empty">
                    <span>01</span>
                    <h2>Publish your first story to begin.</h2>
                    <p>Analytics will appear here as readers open chapters and save their progress.</p>
                    <button onClick={() => { window.location.hash = '/write/book/create'; }}>Create a story</button>
                </section>
            ) : (
                <>
                    <section className="ww-analytics-summary" aria-label="Analytics summary">
                        <MetricCard label="Unique readers" value={analytics.summary.uniqueReaders.toLocaleString()} note="distinct readers in the last 400 days, plus saved progress" />
                        <MetricCard label="Chapter views" value={analytics.summary.views.toLocaleString()} note="all-time chapter opens" />
                        <MetricCard label="Completion" value={formatRate(analytics.summary.completionRate)} note={`${analytics.summary.completedReaders} distinct readers reached 90% of a story`} />
                        <MetricCard label="Returning readers" value={analytics.summary.returningReaders.toLocaleString()} note="reached two or more chapters" />
                    </section>

                    <p className="text-sm mb-6">Chapter views are all-time chapter opens, including repeat visits. Reader counts combine recorded activity in the last 400 days with saved reading progress; they do not identify people. Completion means saved progress reached at least 90% of a story; Finished uses the same threshold for a chapter. The trend below covers only the last 14 days.</p>

                    <section className="ww-analytics-panel ww-trend-panel">
                        <div className="ww-analytics-panel-head">
                            <div><span>Last 14 days</span><h2>Reader momentum</h2></div>
                            <div className="ww-trend-legend"><i /><span>Readers</span><i /><span>Views</span></div>
                        </div>
                        <div className="ww-trend-chart-frame">
                        <div className="ww-trend-axis" aria-hidden="true">{[axisMax, axisMax * .75, axisMax * .5, axisMax * .25, 0].map(value => <span key={value}>{value.toLocaleString()}</span>)}</div>
                        <div className="ww-trend-chart" role="img" aria-label={`Last fourteen days: ${trend.reduce((sum, point) => sum + point.views, 0).toLocaleString()} chapter views. Daily values are in the table below.`}>
                            {trend.map((point, index) => {
                                const releases = releasesByDate.get(point.date) || [];
                                return (
                                    <div className="ww-trend-day" key={point.date}>
                                        <div className="ww-trend-bars" aria-label={`${point.date}: ${point.readers} readers and ${point.views} views`}>
                                            <i title={`${point.readers} readers`} style={{ height: `${point.readers / axisMax * 100}%` }} />
                                            <i title={`${point.views} views`} style={{ height: `${point.views / axisMax * 100}%` }} />
                                            <span className="ww-trend-value" aria-hidden="true">{point.views}</span>
                                            {releases.length > 0 && <b title={`Released: ${releases.join(', ')}`} aria-hidden="true" />}
                                        </div>
                                        <span>{index % 2 === 0 || index === trend.length - 1 ? new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                        </div>
                        <details className="ww-trend-data"><summary>View daily data · {trend.reduce((sum, point) => sum + point.views, 0).toLocaleString()} views in this period</summary><table><caption className="sr-only">Reader activity in the last fourteen days</caption><thead><tr><th scope="col">Date</th><th scope="col">Readers</th><th scope="col">Chapter views</th><th scope="col">Chapter releases</th></tr></thead><tbody>{trend.map(point => <tr key={point.date}><th scope="row">{new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</th><td>{point.readers.toLocaleString()}</td><td>{point.views.toLocaleString()}</td><td>{(releasesByDate.get(point.date) || []).join(', ') || '—'}</td></tr>)}</tbody></table></details>
                        {analytics.summary.uniqueReaders === 0 && (
                            <p className="ww-analytics-honest-empty">No reader events yet. Share a published story; this chart starts filling as chapters are opened.</p>
                        )}
                    </section>

                    <div className="ww-analytics-grid">
                        <section className="ww-analytics-panel ww-funnel-panel">
                            <div className="ww-analytics-panel-head"><div><span>Chapter journey</span><h2>Where readers continue</h2></div></div>
                            {analytics.chapterFunnel.length ? (
                                <div className="ww-funnel-table-wrap" role="region" aria-label="Chapter reader statistics" tabIndex={0}>
                                    <table className="ww-funnel-table">
                                        <thead><tr><th scope="col">Chapter</th><th scope="col">Reached</th><th scope="col">Views</th><th scope="col">Finished</th><th scope="col">Continued</th><th scope="col">Signals</th></tr></thead>
                                        <tbody>
                                            {analytics.chapterFunnel.map(row => (
                                                <tr key={`${row.bookId}-${row.chapterId}`}>
                                                    <th scope="row"><small>{String(row.chapterNumber).padStart(2, '0')}</small><span className="ww-funnel-chapter"><strong title={row.title}>{row.title}</strong>{!selectedBookId && <small className="ww-funnel-story" title={storyOptions.find(story => story.bookId === row.bookId)?.title}>{storyOptions.find(story => story.bookId === row.bookId)?.title || 'Story unavailable'}</small>}</span></th>
                                                    <td>{row.reachedReaders}</td>
                                                    <td>{row.views}</td>
                                                    <td>{formatRate(row.completionRate)}</td>
                                                    <td>{row.continuationRate > 0 ? formatRate(row.continuationRate) : '—'}</td>
                                                    <td>{row.likes} {row.likes === 1 ? 'like' : 'likes'} · {row.comments} {row.comments === 1 ? 'comment' : 'comments'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="ww-analytics-honest-empty">Publish a chapter to see its reader journey.</p>}
                        </section>

                        <aside className="ww-analytics-side">
                            <section className="ww-analytics-panel">
                                <div className="ww-analytics-panel-head"><div><span>Discovery</span><h2>Reader sources</h2></div></div>
                                <div className="ww-referrer-list">
                                    {analytics.referrers.length ? analytics.referrers.map(source => (
                                        <div key={source.source}><span>{sourceLabel(source.source)}</span><strong>{source.readers} readers</strong><small>{source.views} views</small></div>
                                    )) : <p className="ww-analytics-honest-empty">Sources appear after readers arrive.</p>}
                                </div>
                            </section>
                            <section className="ww-analytics-panel ww-engagement-panel">
                                <div className="ww-analytics-panel-head"><div><span>Engagement</span><h2>Story response</h2></div></div>
                                <div><strong>{analytics.summary.averageCompletion.toFixed(0)}%</strong><span>average completion</span></div>
                                <div><strong>{analytics.summary.likes.toLocaleString()}</strong><span>chapter likes</span></div>
                                <div><strong>{analytics.summary.comments.toLocaleString()}</strong><span>chapter comments</span></div>
                            </section>
                        </aside>
                    </div>
                </>
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
    <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
);

function sourceLabel(source: string): string {
    if (source === 'direct') return 'Direct or private link';
    if (source === 'wordweft') return 'Inside WordWeft';
    return source;
}
