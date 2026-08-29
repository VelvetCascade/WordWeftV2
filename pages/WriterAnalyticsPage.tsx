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
    const [selectedBookId, setSelectedBookId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

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
                    <h1>Writer analytics</h1>
                    <p>See where readers arrive, continue, and finish—without invasive tracking.</p>
                </div>
                <label>
                    Story
                    <select value={selectedBookId} onChange={event => setSelectedBookId(event.target.value)}>
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
                        <MetricCard label="Unique readers" value={analytics.summary.uniqueReaders.toLocaleString()} note="privacy-safe reader count" />
                        <MetricCard label="Chapter views" value={analytics.summary.views.toLocaleString()} note="all-time chapter opens" />
                        <MetricCard label="Completion" value={formatRate(analytics.summary.completionRate)} note={`${analytics.summary.completedReaders} readers reached 90%`} />
                        <MetricCard label="Returning readers" value={analytics.summary.returningReaders.toLocaleString()} note="reached two or more chapters" />
                    </section>

                    <section className="ww-analytics-panel ww-trend-panel">
                        <div className="ww-analytics-panel-head">
                            <div><span>Last 14 days</span><h2>Reader momentum</h2></div>
                            <div className="ww-trend-legend"><i /><span>Readers</span><i /><span>Views</span></div>
                        </div>
                        <div className="ww-trend-chart" aria-label="Fourteen-day reader and view trend">
                            {trend.map((point, index) => {
                                const releases = releasesByDate.get(point.date) || [];
                                return (
                                    <div className="ww-trend-day" key={point.date}>
                                        <div className="ww-trend-bars" aria-label={`${point.date}: ${point.readers} readers and ${point.views} views`}>
                                            <i style={{ height: `${Math.max(3, point.readers / maxTrendValue * 100)}%` }} />
                                            <i style={{ height: `${Math.max(3, point.views / maxTrendValue * 100)}%` }} />
                                            {releases.length > 0 && <b title={`Released: ${releases.join(', ')}`} aria-label={`Release: ${releases.join(', ')}`} />}
                                        </div>
                                        <span>{index % 2 === 0 || index === trend.length - 1 ? new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {analytics.summary.uniqueReaders === 0 && (
                            <p className="ww-analytics-honest-empty">No reader events yet. Share a published story; this chart starts filling as chapters are opened.</p>
                        )}
                    </section>

                    <div className="ww-analytics-grid">
                        <section className="ww-analytics-panel ww-funnel-panel">
                            <div className="ww-analytics-panel-head"><div><span>Chapter journey</span><h2>Where readers continue</h2></div></div>
                            {analytics.chapterFunnel.length ? (
                                <div className="ww-funnel-table-wrap">
                                    <table className="ww-funnel-table">
                                        <thead><tr><th>Chapter</th><th>Reached</th><th>Views</th><th>Finished</th><th>Continued</th><th>Signals</th></tr></thead>
                                        <tbody>
                                            {analytics.chapterFunnel.map(row => (
                                                <tr key={`${row.bookId}-${row.chapterId}`}>
                                                    <th><small>{String(row.chapterNumber).padStart(2, '0')}</small><span>{row.title}</span></th>
                                                    <td>{row.reachedReaders}</td>
                                                    <td>{row.views}</td>
                                                    <td>{formatRate(row.completionRate)}</td>
                                                    <td>{row.continuationRate > 0 ? formatRate(row.continuationRate) : '—'}</td>
                                                    <td>{row.likes} likes · {row.comments} comments</td>
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
