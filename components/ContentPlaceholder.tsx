import React from 'react';

const Block: React.FC<{ className?: string; width?: string }> = ({ className = '', width }) => <span className={`ww-skeleton-block ${className}`} style={width ? { width } : undefined} />;
const TextLines: React.FC<{ count?: number }> = ({ count = 3 }) => <div className="ww-skeleton-text">{Array.from({ length: count }, (_, index) => <Block key={index} width={index === count - 1 ? '68%' : '100%'} />)}</div>;
const Tags = () => <><Block className="ww-skeleton-tag" /><Block className="ww-skeleton-tag" width="54px" /></>;

/** Match BookCard's actual responsive grid, cover frame and information rows. */
export const CatalogPlaceholder: React.FC<{ view: 'grid' | 'list' }> = ({ view }) => <div className="ww-content-placeholder" role="status" aria-label="Loading stories" aria-busy="true" data-route-loading="true">
    <span className="sr-only">Loading stories…</span>
    {view === 'grid' ? <div aria-hidden="true" className="ww-catalog-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
        {Array.from({ length: 10 }, (_, index) => <div className="ww-book-card ww-skeleton-card" key={index}>
            <div className="ww-book-cover-wrap"><Block className="ww-skeleton-cover" /></div>
            <div className="ww-book-info"><h3><Block className="ww-skeleton-card-title" width="88%" /><Block className="ww-skeleton-card-title" width="65%" /></h3><p><Block width="60%" /></p><div className="ww-book-meta"><Block width="40px" /><Block width="40px" /><Block width="52px" /></div></div>
        </div>)}
    </div> : <div aria-hidden="true" className="flex flex-col gap-6">
        {[0, 1, 2].map(index => <div className="v2-story-list-item ww-skeleton-list-item flex flex-col sm:flex-row gap-6 p-4 bg-white dark:bg-dark-surface rounded-2xl" key={index}>
            <Block className="ww-skeleton-list-cover" />
            <div className="flex-1 min-w-0"><div className="flex flex-wrap gap-2 mb-2"><Tags /></div><h3><Block className="ww-skeleton-card-title" width="75%" /></h3><p className="mb-2"><Block width="40%" /></p><div className="ww-skeleton-list-rating"><Block width="96px" /></div><TextLines count={2} /><Block className="ww-skeleton-list-action" width="88px" /></div>
        </div>)}
    </div>}
</div>;

interface ReaderPlaceholderProps { theme: string; width?: 'narrow' | 'standard' | 'wide'; fontSize?: number; lineHeight?: number; focusMode?: boolean; title?: string; }
/** Reader chrome and manuscript inherit the real reader's breakpoints and preferences. */
export const ReaderPlaceholder: React.FC<ReaderPlaceholderProps> = ({ theme, width = 'standard', fontSize = 19, lineHeight = 1.85, focusMode, title }) => <div className={`reader-experience reader-v2 reader-theme-${theme} ww-reader-placeholder ww-content-placeholder min-h-screen flex flex-col ${focusMode ? 'reader-focus-mode' : ''}`} role="status" aria-label="Loading chapter" aria-busy="true">
    <span className="sr-only">Opening your chapter…</span>
    <header className="reader-header reader-header-visible fixed top-0 left-0 right-0 z-20" aria-hidden="true"><div className="reader-header-inner">
        <div className="reader-context-left"><span className="reader-brand-v2"><Block className="ww-skeleton-reader-brand" /></span><span className="reader-back-button"><Block width="140px" /></span></div>
        <div className="reader-header-chapter"><Block width="90px" /><Block width="130px" /></div>
        <div className="reader-header-actions">{[0, 1, 2, 3, 4, 5].map(index => <button key={index} type="button" disabled tabIndex={-1} className={index === 4 ? 'reader-report-button' : undefined}><Block className="ww-skeleton-reader-control" /></button>)}</div>
    </div></header>
    <main className={`reader-manuscript reader-width-${width} mx-auto flex-1 relative z-10`} aria-hidden="true">
        <div className="reader-chapter-intro"><span><Block width="210px" /></span><h1>{title || <Block className="ww-skeleton-reader-title" width="85%" />}</h1><div className="reader-chapter-meta"><Block width="65px" /><i /><Block width="65px" /><i /><Block width="85px" /></div></div>
        <div className="ww-skeleton-copy" style={{ fontSize, lineHeight }}>{[0, 1, 2, 3].map(paragraph => <div className="reader-comment-block mb-6" key={paragraph}>
            {paragraph === 0 && <Block className="ww-skeleton-dropcap" />}
            {[0, 1, 2, 3].map(line => <div className="ww-skeleton-copy-line" key={line}><Block width={line === 3 ? '72%' : '100%'} /></div>)}
        </div>)}</div>
    </main>
    <div className="reader-dock reader-dock-visible" aria-hidden="true"><Block className="ww-skeleton-reader-control" /><Block className="ww-skeleton-reader-control" /><Block width="100px" /><Block className="ww-skeleton-reader-control" /><Block className="ww-skeleton-reader-control" /></div>
</div>;

/** Mirror the story header, art/copy/contents columns and stacked phone layout. */
export const StoryPlaceholder = () => <div className="ww-story-page ww-story-v2 ww-content-placeholder" role="status" aria-label="Loading story details" aria-busy="true" data-route-loading="true">
    <span className="sr-only">Loading story details…</span>
    <div className="ww-story-header" aria-hidden="true"><div className="ww-story-header-inner container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between"><Block width="58px" /><div className="ww-story-header-actions flex items-center gap-4"><Block className="ww-skeleton-story-control" /><Block className="ww-skeleton-story-control" /></div></div></div>
    <div className="container mx-auto px-4 sm:px-6 py-12" aria-hidden="true">
        <div className="ww-story-breadcrumb"><Block width="160px" /></div>
        <section className="ww-story-hero-v2">
            <div className="ww-story-art-column"><Block className="ww-story-art ww-skeleton-story-cover" /><div className="ww-story-art-caption"><Block width="130px" /></div><div className="ww-story-genre-tags"><Tags /></div></div>
            <div className="ww-story-copy-column">
                <span className="ww-page-eyebrow"><Block width="130px" /></span>
                <h1><Block className="ww-skeleton-story-title" width="90%" /><Block className="ww-skeleton-story-title" width="62%" /></h1>
                <div className="ww-story-author-v2"><Block className="ww-skeleton-avatar" /><span><Block width="110px" /><Block width="45px" /></span></div>
                <div className="ww-story-actions-v2"><span className="ww-story-read-action ww-skeleton-action"><Block width="140px" /></span><span className="ww-skeleton-action"><Block width="105px" /></span><span className="ww-skeleton-action"><Block width="55px" /></span></div>
                <div className="ww-story-summary"><TextLines count={3} /></div>
                <div className="ww-story-stats-v2 ww-skeleton-stats">{[0, 1, 2, 3].map(index => <div key={index}><Block className="ww-skeleton-stat-value" width="38px" /><Block width="55px" /></div>)}</div>
                <div className="ww-story-publication-meta"><Block width="150px" /></div>
            </div>
            <aside className="ww-story-contents-rail"><Block width="100px" /><h2><Block className="ww-skeleton-contents-title" width="130px" /></h2><p><Block width="130px" /></p><div className="ww-story-contents-scroll">{[0, 1, 2].map(index => <div className="ww-chapter-timeline-row" key={index}><span className="ww-chapter-timeline-marker" /><Block width="55px" /><Block className="ww-skeleton-chapter-title" width="85%" /><Block width="70px" /></div>)}</div><Block className="ww-skeleton-contents-action" width="140px" /></aside>
        </section>
        <div className="ww-story-tabs flex border-b mb-8"><Block className="ww-skeleton-tab" /><Block className="ww-skeleton-tab" /><Block className="ww-skeleton-tab" /></div>
    </div>
</div>;
