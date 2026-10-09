import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import { Footer } from '../components/Footer';
import { ResilientImage } from '../components/ResilientImage';
import { applyMetadata } from '../utils/pageMetadata';
import { parseRoute, metadataFor, bookPath, authorPath, safeImage } from '../seo/metadata.mjs';
import '../styles/support-v2.css';

export const PublicCatalogPage: React.FC<{ path: string }> = ({ path }) => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const route = parseRoute(path);
    useEffect(() => {
        const controller = new AbortController();
        setData(null); setError('');
        const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
        fetch(`${base}/public/seo/catalog?page=${route.page}${route.filter ? `&${route.filter}=${encodeURIComponent(route.value)}` : ''}`, { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error('Stories could not be loaded. Please try again.'); return response.json(); })
            .then(result => {
                if (controller.signal.aborted) return;
                setData(result);
                const meta = metadataFor(route, result);
                if (route.filter === 'tag' && route.page === 1 && result.books.length < 3) meta.index = false;
                applyMetadata(meta);
            }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
        return () => controller.abort();
    }, [path, retry]);
    return <div className="wv-support">
        <main className="wv-support-shell wv-public-catalog">
            <header className="wv-pagehead"><p className="wv-eyebrow">Read online</p><h1>{route.value ? `${route.value} stories` : 'Stories and novels'}</h1><p className="wv-lead">{metadataFor(route).description}</p><nav className="wv-catalog-links" aria-label="Other ways to discover stories"><a href="/category">Browse by genre <ArrowRight size={15} /></a><a href="/hooks">Read an opening <ArrowRight size={15} /></a></nav></header>
            {error ? <section className="wv-empty" role="alert"><BookOpen size={30} aria-hidden="true" /><h2>Stories couldn’t be loaded.</h2><p>{error}</p><button className="wv-button" type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} /> Try again</button></section> : !data ? <div role="status" aria-live="polite"><p className="wv-hint">Loading stories…</p><div className="wv-catalog-grid wv-catalog-skeleton" aria-hidden="true">{[0, 1, 2, 3].map(item => <div key={item}><div /><span /><span /></div>)}</div></div> : <>
                <div className="wv-catalog-grid">{data.books.map(book => <article key={book.id} className="ww-arrive"><a className="wv-catalog-cover" href={bookPath(book.id)}><ResilientImage src={safeImage(book.coverUrl)} alt={`Cover of ${book.title}`} fallbackLabel={book.title} variant="cover" width={200} height={300} loading="lazy" /></a><h2><a href={bookPath(book.id)}>{book.title}</a></h2><a className="wv-catalog-author" href={authorPath(book.author.id)}>{book.author.name}</a><p>{book.summary}</p></article>)}</div>
                {!data.books.length && <section className="wv-empty"><BookOpen size={30} aria-hidden="true" /><h2>No published stories here yet.</h2><p>Explore the catalogue to find another story.</p><a href="/category" className="wv-button wv-button-primary">Browse stories <ArrowRight size={18} /></a></section>}
                {(route.page > 1 || data.hasMore) && <nav className="wv-catalog-pagination" aria-label="Pagination">{route.page > 1 && <a className="wv-button" rel="prev" href={`${route.path}${route.page > 2 ? `?page=${route.page - 1}` : ''}`}><ArrowLeft size={16} /> Previous page</a>}<span>Page {route.page}</span>{data.hasMore && <a className="wv-button" rel="next" href={`${route.path}?page=${route.page + 1}`}>Next page <ArrowRight size={16} /></a>}</nav>}
            </>}
        </main><Footer />
    </div>;
};
