import React from 'react';

const Lines = () => <><div className="ww-placeholder-line" /><div className="ww-placeholder-line" /><div className="ww-placeholder-line short" /></>;

/** Static shapes reserve the space used by the real content; no shimmer. */
export const CatalogPlaceholder: React.FC<{ view: 'grid' | 'list' }> = ({ view }) => <div className="ww-content-placeholder" role="status" aria-label="Loading stories" aria-busy="true" data-route-loading="true">
    <span className="sr-only">Loading stories…</span>
    <div aria-hidden="true" className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10' : 'ww-placeholder-list'}>
        {Array.from({ length: view === 'grid' ? 5 : 3 }, (_, index) => <div className="ww-placeholder-book" key={index}><div className="ww-placeholder-cover" /><div><Lines /></div></div>)}
    </div>
</div>;

export const ReaderPlaceholder: React.FC<{ theme: string }> = ({ theme }) => <div className={`reader-experience reader-v2 reader-theme-${theme} ww-reader-placeholder ww-content-placeholder min-h-screen`} role="status" aria-label="Loading chapter" aria-busy="true">
    <span className="sr-only">Opening your chapter…</span>
    <div className="ww-placeholder-paper" aria-hidden="true"><div className="ww-placeholder-line short" /><div className="ww-placeholder-line ww-placeholder-title" /><Lines /><Lines /><Lines /></div>
</div>;

export const StoryPlaceholder = () => <div className="ww-story-page ww-story-v2 ww-content-placeholder" role="status" aria-label="Loading story details" aria-busy="true" data-route-loading="true">
    <span className="sr-only">Loading story details…</span>
    <div className="ww-story-hero-v2" aria-hidden="true"><div className="ww-placeholder-cover" /><div><div className="ww-placeholder-line ww-placeholder-title" /><Lines /><Lines /></div><div><Lines /><Lines /></div></div>
</div>;
